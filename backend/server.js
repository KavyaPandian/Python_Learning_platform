const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Load problems data
const problemsFilePath = path.join(__dirname, 'problems.json');
let problemsData = { chapters: [] };

try {
  const fileContent = fs.readFileSync(problemsFilePath, 'utf8');
  problemsData = JSON.parse(fileContent);
} catch (error) {
  console.error('Error loading problems.json:', error);
}

// Flat array of all problems for quick lookup
const getAllProblems = () => {
  const list = [];
  problemsData.chapters.forEach(chapter => {
    chapter.problems.forEach(problem => {
      list.push({
        ...problem,
        chapterId: chapter.id,
        chapterTitle: chapter.title
      });
    });
  });
  return list;
};

// API: Get curriculum and problems
app.get('/api/problems', (req, res) => {
  res.json(problemsData);
});

// API: Get a single problem
app.get('/api/problems/:id', (req, res) => {
  const problems = getAllProblems();
  const problem = problems.find(p => p.id === req.params.id);
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  res.json(problem);
});

// Ensure temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Create HTTP server and integrate WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');

  ws.on('message', async (message) => {
    let payload;
    try {
      payload = JSON.parse(message);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON message' }));
      return;
    }

    const { type, code, problemId, customInput } = payload;

    if (type !== 'run' && type !== 'submit') {
      ws.send(JSON.stringify({ type: 'error', error: 'Unknown request type. Use "run" or "submit"' }));
      return;
    }

    const problems = getAllProblems();
    const problem = problems.find(p => p.id === problemId);

    if (!problem) {
      ws.send(JSON.stringify({ type: 'error', error: 'Problem not found' }));
      return;
    }

    // Generate temp Python file
    const fileId = uuidv4();
    const tempFileName = `temp_${fileId}.py`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // Save code to temp file
    try {
      fs.writeFileSync(tempFilePath, code || '');
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', error: 'Failed to write code to execution sandbox' }));
      return;
    }

    const cleanup = () => {
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };

    if (type === 'run') {
      ws.send(JSON.stringify({ type: 'status', message: 'Running code...' }));

      const testInput = customInput !== undefined ? customInput : (problem.testCases[0]?.input || '');
      
      executePythonCode(tempFilePath, testInput, (result) => {
        ws.send(JSON.stringify({
          type: 'run_result',
          success: result.code === 0 && !result.stderr,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.code,
          timedOut: result.timedOut
        }));
        cleanup();
      });
    } else if (type === 'submit') {
      ws.send(JSON.stringify({ type: 'status', message: 'Submitting code, evaluating test cases...' }));

      const testCases = problem.testCases;
      const results = [];
      let allPassed = true;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        ws.send(JSON.stringify({ type: 'status', message: `Evaluating Test Case ${i + 1}/${testCases.length}...` }));

        const result = await new Promise((resolve) => {
          executePythonCode(tempFilePath, tc.input, resolve);
        });

        // Normalize output comparison: trim ending whitespaces/newlines, normalize line endings
        const cleanStdout = (result.stdout || '').trim().replace(/\r\n/g, '\n');
        const cleanExpected = (tc.output || '').trim().replace(/\r\n/g, '\n');
        const passed = result.code === 0 && !result.stderr && cleanStdout === cleanExpected;

        if (!passed) {
          allPassed = false;
        }

        results.push({
          index: i,
          input: tc.isHidden ? '[Hidden]' : tc.input,
          expected: tc.isHidden ? '[Hidden]' : tc.output,
          actual: tc.isHidden && !passed ? 'Incorrect output (hidden)' : (result.stderr ? result.stderr : cleanStdout),
          passed: passed,
          isHidden: tc.isHidden
        });
      }

      ws.send(JSON.stringify({
        type: 'submit_result',
        allPassed: allPassed,
        results: results
      }));

      cleanup();
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Helper function to execute Python code safely with timeout
function executePythonCode(filePath, stdinValue, callback) {
  let stdout = '';
  let stderr = '';
  let timedOut = false;

  // Spawning the python runner
  // We check 'python' (which points to python 3.14.0 in this environment)
  const pyProcess = spawn('python', [filePath]);

  // Handle inputs
  if (stdinValue) {
    pyProcess.stdin.write(stdinValue);
    pyProcess.stdin.end();
  } else {
    pyProcess.stdin.end();
  }

  // Handle timeout limit of 5 seconds
  const timeoutId = setTimeout(() => {
    timedOut = true;
    try {
      pyProcess.kill();
    } catch (e) {
      console.error('Failed to kill timeout process', e);
    }
  }, 5000);

  pyProcess.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  pyProcess.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  pyProcess.on('close', (code) => {
    clearTimeout(timeoutId);
    callback({
      code: timedOut ? null : code,
      stdout: stdout,
      stderr: stderr,
      timedOut: timedOut
    });
  });

  pyProcess.on('error', (err) => {
    clearTimeout(timeoutId);
    callback({
      code: -1,
      stdout: stdout,
      stderr: stderr || err.message,
      timedOut: timedOut
    });
  });
}

server.listen(PORT, () => {
  console.log(`HTTP and WebSocket server listening on port ${PORT}`);
});
