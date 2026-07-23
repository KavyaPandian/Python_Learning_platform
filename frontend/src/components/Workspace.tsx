import React, { useState, useEffect, useRef } from 'react';
import { loader } from '@monaco-editor/react';

// Use Cloudflare cdnjs instead of jsdelivr (which is often blocked or slow in some regions)
loader.config({
  paths: {
    vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs'
  }
});

import type { Problem } from '../types';
import { 
  ArrowLeft, 
  Play, 
  Send, 
  Terminal as TermIcon, 
  AlertCircle, 
  CheckCircle, 
  Cpu, 
  FileText,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Code
} from 'lucide-react';

interface WorkspaceProps {
  problem: Problem;
  onBack: () => void;
  onSolved: () => void;
  isSolved: boolean;
  onNextProblem?: () => void;
  onPrevProblem?: () => void;
}

interface ServerStatus {
  connected: boolean;
  message: string;
}

interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

interface TestCaseEvaluation {
  index: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  isHidden: boolean;
}

interface SubmitResult {
  allPassed: boolean;
  results: TestCaseEvaluation[];
}

const Workspace: React.FC<WorkspaceProps> = ({
  problem,
  onBack,
  onSolved,
  isSolved,
  onNextProblem,
  onPrevProblem
}) => {
  const [code, setCode] = useState<string>(problem.starterCode);
  const [customInput, setCustomInput] = useState<string>('');
  const [useCustomInput, setUseCustomInput] = useState<boolean>(false);
  
  // Tab states for console output
  const [activeConsoleTab, setActiveConsoleTab] = useState<'console' | 'tests'>('console');
  
  // Console logs & execution results
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [consoleHeight, setConsoleHeight] = useState<'collapsed' | 'normal' | 'maximized'>('normal');
  const [mobileTab, setMobileTab] = useState<'problem' | 'editor' | 'output'>('problem');

  // WebSocket Server Status
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    connected: false,
    message: 'Connecting to WebSocket sandbox...'
  });

  const socketRef = useRef<WebSocket | null>(null);
  const isCleaningUpRef = useRef<boolean>(false);
  
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newValue = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newValue);
      localStorage.setItem(`solution_${problem.id}`, newValue);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Load problem starter code on load or problem change
  useEffect(() => {
    const savedSolution = localStorage.getItem(`solution_${problem.id}`);
    if (savedSolution !== null) {
      setCode(savedSolution);
    } else {
      setCode(problem.starterCode);
    }
    setRunResult(null);
    setSubmitResult(null);
    setConsoleLogs([`Loaded workspace for: ${problem.name}`]);
    setCustomInput(problem.testCases[0]?.input || '');
  }, [problem]);

  // WebSocket connection management
  useEffect(() => {
    isCleaningUpRef.current = false;
    connectWS();
    return () => {
      isCleaningUpRef.current = true;
      if (socketRef.current) {
        (socketRef.current as any).isCleanClose = true;
        socketRef.current.close();
      }
    };
  }, []);

  const connectWS = () => {
    if (isCleaningUpRef.current) return;

    if (socketRef.current) {
      (socketRef.current as any).isCleanClose = true;
      socketRef.current.close();
      socketRef.current = null;
    }

    setServerStatus({ connected: false, message: 'Connecting to execution engine...' });
    
    // Connect to Node.js backend WebSocket server
    const cloudUrl = 'wss://python-learning-platform-se5q.onrender.com';
    const localUrl = 'ws://localhost:5001';
    const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? localUrl : cloudUrl);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setServerStatus({ connected: true, message: 'Sandbox Connected & Ready' });
      setConsoleLogs(prev => [...prev, `✓ WebSocket connected to compiler sandbox (${wsUrl.includes('localhost') ? 'Local Engine' : 'Cloud Engine'}).`]);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'status':
            setConsoleLogs(prev => [...prev, `[Server] ${data.message}`]);
            break;
            
          case 'error':
            setConsoleLogs(prev => [...prev, `✖ [Error] ${data.error}`]);
            setExecuting(false);
            break;
            
          case 'run_result':
            setRunResult(data);
            setExecuting(false);
            setActiveConsoleTab('console');
            if (data.timedOut) {
              setConsoleLogs(prev => [...prev, '✖ [Timeout] Code execution exceeded 5.0 second limit. Process terminated.']);
            } else if (data.success) {
              setConsoleLogs(prev => [...prev, '✓ Code execution completed successfully.']);
            } else {
              setConsoleLogs(prev => [...prev, '✖ Code execution failed with errors.']);
            }
            break;
            
          case 'submit_result':
            setSubmitResult(data);
            setExecuting(false);
            setActiveConsoleTab('tests');
            
            if (data.allPassed) {
              setConsoleLogs(prev => [...prev, '🎉 SUCCESS! All test cases passed. Mark solved.']);
              onSolved();
            } else {
              const failedCount = data.results.filter((r: any) => !r.passed).length;
              setConsoleLogs(prev => [...prev, `✖ Submissions complete: ${failedCount} test case(s) failed.`]);
            }
            break;
            
          default:
            console.log('Unhandled WebSocket event:', data);
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    socket.onclose = () => {
      if ((socket as any).isCleanClose || isCleaningUpRef.current) {
        return;
      }

      setServerStatus({ connected: false, message: 'Disconnected. Reconnecting...' });
      setConsoleLogs(prev => [...prev, '⚠ WebSocket disconnected. Retrying in 3 seconds...']);
      
      setTimeout(() => {
        if (!isCleaningUpRef.current) {
          connectWS();
        }
      }, 3000);
    };

    socket.onerror = () => {
      setServerStatus({ connected: false, message: 'Connection Error' });
    };
  };

  const handleRunCode = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setConsoleLogs(prev => [...prev, '✖ Cannot run: WebSocket sandbox is not connected.']);
      return;
    }

    if (consoleHeight === 'collapsed') {
      setConsoleHeight('normal');
    }

    if (window.innerWidth < 768) {
      setMobileTab('output');
    }
    setExecuting(true);
    setRunResult(null);
    setSubmitResult(null);
    setConsoleLogs(prev => [...prev, `--- Running Code [Problem: ${problem.id}] ---`]);

    socketRef.current.send(JSON.stringify({
      type: 'run',
      code: code,
      problemId: problem.id,
      customInput: useCustomInput ? customInput : undefined,
      testCases: problem.testCases
    }));
  };

  const handleSubmitCode = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setConsoleLogs(prev => [...prev, '✖ Cannot submit: WebSocket sandbox is not connected.']);
      return;
    }

    if (consoleHeight === 'collapsed') {
      setConsoleHeight('normal');
    }

    if (window.innerWidth < 768) {
      setMobileTab('output');
    }
    setExecuting(true);
    setRunResult(null);
    setSubmitResult(null);
    setConsoleLogs(prev => [...prev, `--- Submitting & Evaluating [Problem: ${problem.id}] ---`]);

    socketRef.current.send(JSON.stringify({
      type: 'submit',
      code: code,
      problemId: problem.id,
      testCases: problem.testCases
    }));
  };

  const getConsolePanelHeight = () => {
    if (window.innerWidth < 768 && mobileTab === 'output') return '100%';
    if (window.innerWidth < 768 && mobileTab === 'editor') return '42px';
    return consoleHeight === 'collapsed' ? '42px' : consoleHeight === 'maximized' ? '65%' : '35%';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Segmented Mobile Tab Bar */}
      <div className="mobile-tab-bar">
        <button 
          className={`mobile-tab-btn ${mobileTab === 'problem' ? 'active' : ''}`}
          onClick={() => setMobileTab('problem')}
        >
          <FileText size={16} /> Problem
        </button>
        <button 
          className={`mobile-tab-btn ${mobileTab === 'editor' ? 'active' : ''}`}
          onClick={() => setMobileTab('editor')}
        >
          <Code size={16} /> Code
        </button>
        <button 
          className={`mobile-tab-btn ${mobileTab === 'output' ? 'active' : ''}`}
          onClick={() => setMobileTab('output')}
        >
          <TermIcon size={16} /> Output
        </button>
      </div>

      <div className="workspace-split-container">
        
        {/* Left Pane - Problem Description */}
        <div className={`left-pane ${mobileTab !== 'problem' ? 'mobile-hide' : ''}`}>
        {/* Navigation & Title Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            onClick={onBack} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.85rem',
              marginBottom: '12px',
              fontWeight: 500
            }}
          >
            <ArrowLeft size={14} /> Back to Curriculum
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{problem.name}</h2>
            <span className={`badge badge-${problem.difficulty.toLowerCase()}`}>
              {problem.difficulty}
            </span>
            {isSolved && (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>
                Solved
              </span>
            )}
          </div>
        </div>

        {/* Problem content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Description */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <FileText size={16} color="var(--primary)" /> Description
            </h3>
            <div style={{ fontSize: '0.95rem', color: '#d1d5db', lineHeight: '1.6', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              {problem.description}
            </div>
          </div>

          {/* Constraints */}
          {problem.constraints && (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Cpu size={16} color="var(--primary)" /> Constraints
              </h3>
              <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap' }}>
                {problem.constraints}
              </pre>
            </div>
          )}

          {/* Examples / Default Test Cases */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Layers size={16} color="var(--primary)" /> Test Cases
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {problem.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Example Case {idx + 1}
                  </div>
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    {tc.input && (
                      <div>
                        <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Input:</span>
                        <pre style={{ fontFamily: 'var(--font-mono)', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{tc.input}</pre>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Expected Output:</span>
                      <pre style={{ fontFamily: 'var(--font-mono)', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{tc.output}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#fff', cursor: 'pointer', fontWeight: 600, marginBottom: '10px' }}>
              <input 
                type="checkbox" 
                checked={useCustomInput} 
                onChange={(e) => setUseCustomInput(e.target.checked)}
                style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
              />
              Use Custom Test Input
            </label>
            {useCustomInput && (
              <textarea 
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter standard input values (one per line)..."
                style={{
                  width: '100%',
                  height: '100px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  padding: '12px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid var(--border-color)', 
          background: 'rgba(15, 23, 42, 0.4)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <button 
            className="btn btn-secondary" 
            onClick={onPrevProblem}
            disabled={!onPrevProblem}
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.85rem',
              opacity: onPrevProblem ? 1 : 0.5,
              cursor: onPrevProblem ? 'pointer' : 'not-allowed'
            }}
          >
            ← Previous Question
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={onNextProblem}
            disabled={!onNextProblem}
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.85rem',
              opacity: onNextProblem ? 1 : 0.5,
              cursor: onNextProblem ? 'pointer' : 'not-allowed'
            }}
          >
            Next Question →
          </button>
        </div>
      </div>

      {/* Right Pane - Coding IDE Workspace */}
      <div className={`right-pane ${mobileTab === 'problem' ? 'mobile-hide' : ''}`}>
        
        {/* Workspace Toolbar */}
        <div style={{ padding: '12px 24px', background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600, border: '1px solid rgba(59,130,246,0.15)' }}>
              Python 3
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: serverStatus.connected ? 'var(--success)' : 'var(--danger)', boxShadow: serverStatus.connected ? '0 0 6px var(--success)' : 'none' }}></div>
              <span style={{ color: 'var(--text-muted)' }}>{serverStatus.message}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleRunCode} 
              disabled={executing}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Play size={14} /> Run Code
            </button>
            <button 
              className="btn btn-success" 
              onClick={handleSubmitCode} 
              disabled={executing}
              style={{ padding: '8px 20px', fontSize: '0.85rem' }}
            >
              <Send size={14} /> Submit Code
            </button>
          </div>
        </div>

        {/* Code Editor (Textarea Fallback) */}
        <div className={mobileTab === 'output' ? 'mobile-hide' : ''} style={{ flex: 1, display: 'flex', background: '#090d16', position: 'relative', borderBottom: '1px solid var(--border-color)', overflow: 'hidden' }}>
          {/* Line Numbers Column */}
          <div 
            ref={lineNumbersRef}
            style={{ 
              width: '45px', 
              padding: '16px 0', 
              background: '#06090f', 
              color: 'var(--text-dark)', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.85rem', 
              lineHeight: '1.5',
              textAlign: 'right', 
              paddingRight: '12px',
              userSelect: 'none',
              overflowY: 'hidden',
              borderRight: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            {Array.from({ length: Math.max(code.split('\n').length, 1) }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Text Area Code Editor */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => {
              const newCode = e.target.value;
              setCode(newCode);
              localStorage.setItem(`solution_${problem.id}`, newCode);
            }}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#f3f4f6',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              lineHeight: '1.5',
              padding: '16px',
              resize: 'none',
              outline: 'none',
              overflowY: 'auto',
              whiteSpace: 'pre',
              tabSize: 4
            }}
            placeholder="# Write your Python code here..."
          />
        </div>

        {/* Lower Console / Execution Panel */}
        <div style={{ 
          height: getConsolePanelHeight(), 
          background: '#090d16', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}>
          {/* Console tabs */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)', 
            background: 'rgba(15, 23, 42, 0.4)', 
            padding: '0 16px' 
          }}>
            <div style={{ display: 'flex' }}>
              <button 
                onClick={() => setActiveConsoleTab('console')}
                style={{
                  padding: '12px 18px',
                  background: 'none',
                  border: 'none',
                  color: activeConsoleTab === 'console' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  borderBottom: activeConsoleTab === 'console' ? '2px solid var(--primary)' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <TermIcon size={14} /> Execution Console
              </button>
              <button 
                onClick={() => setActiveConsoleTab('tests')}
                style={{
                  padding: '12px 18px',
                  background: 'none',
                  border: 'none',
                  color: activeConsoleTab === 'tests' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  borderBottom: activeConsoleTab === 'tests' ? '2px solid var(--primary)' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={14} /> Submission Tests 
                {submitResult && (
                  <span 
                    style={{
                      fontSize: '0.75rem',
                      background: submitResult.allPassed ? 'var(--success)' : 'var(--danger)',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginLeft: '4px'
                    }}
                  >
                    {submitResult.allPassed ? 'Passed' : 'Failed'}
                  </span>
                )}
              </button>
            </div>

            {/* Console Height Controls */}
            <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {consoleHeight !== 'collapsed' && (
                <button
                  onClick={() => setConsoleHeight('collapsed')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  title="Collapse console"
                >
                  <ChevronDown size={18} />
                </button>
              )}
              {consoleHeight === 'collapsed' && (
                <button
                  onClick={() => setConsoleHeight('normal')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  title="Expand console"
                >
                  <ChevronUp size={18} />
                </button>
              )}
              {consoleHeight !== 'maximized' && (
                <button
                  onClick={() => setConsoleHeight('maximized')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  title="Maximize console"
                >
                  <Maximize2 size={14} />
                </button>
              )}
              {consoleHeight === 'maximized' && (
                <button
                  onClick={() => setConsoleHeight('normal')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  title="Restore console"
                >
                  <Minimize2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Console content */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeConsoleTab === 'console' ? (
              <>
                {/* WebSocket Server Logs */}
                {consoleLogs.map((log, index) => (
                  <div key={index} style={{ color: log.startsWith('✓') ? 'var(--success)' : log.startsWith('✖') || log.startsWith('⚠') ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {log}
                  </div>
                ))}
                
                {/* Custom Output */}
                {runResult && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    {runResult.success ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 600, marginBottom: '6px' }}>
                        <CheckCircle size={14} /> Run Completed Successfully
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 600, marginBottom: '6px' }}>
                        <AlertCircle size={14} /> Execution Error (Exit code: {runResult.exitCode})
                      </div>
                    )}

                    {runResult.stdout && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ color: 'var(--text-dark)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '2px' }}>Standard Output:</div>
                        <pre style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', color: '#fff', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)' }}>{runResult.stdout}</pre>
                      </div>
                    )}

                    {runResult.stderr && (
                      <div>
                        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '2px' }}>Error Details:</div>
                        <pre style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '6px', color: 'var(--danger)', whiteSpace: 'pre-wrap', border: '1px solid rgba(239, 68, 68, 0.1)' }}>{runResult.stderr}</pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Submission Case Results */}
                {!submitResult ? (
                  <div style={{ color: 'var(--text-dark)', textAlign: 'center', marginTop: '20px' }}>
                    Click "Submit Code" to run compilation and evaluate all hidden/visible test cases.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ 
                      fontSize: '1rem', 
                      fontWeight: 700, 
                      color: submitResult.allPassed ? 'var(--success)' : 'var(--danger)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      paddingBottom: '10px', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {submitResult.allPassed ? (
                          <>
                            <CheckCircle size={20} /> Congratulations! All Test Cases Passed.
                          </>
                        ) : (
                          <>
                            <AlertCircle size={20} /> Some test cases failed. Keep debugging!
                          </>
                        )}
                      </div>
                      {submitResult.allPassed && onNextProblem && (
                        <button 
                          className="btn btn-primary"
                          onClick={onNextProblem}
                          style={{ 
                            padding: '6px 14px', 
                            fontSize: '0.8rem', 
                            boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)'
                          }}
                        >
                          Next Question
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                      {submitResult.results.map((res, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            background: res.passed ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)', 
                            border: `1px solid ${res.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                            borderRadius: '8px',
                            padding: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.8rem' }}>
                              Test Case {index + 1} {res.isHidden && <span style={{ color: 'var(--accent-purple)', fontSize: '0.7rem' }}>[Hidden]</span>}
                            </span>
                            <span 
                              style={{ 
                                color: res.passed ? 'var(--success)' : 'var(--danger)', 
                                fontWeight: 700, 
                                fontSize: '0.75rem',
                                textTransform: 'uppercase'
                              }}
                            >
                              {res.passed ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-dark)' }}>Input: </span>
                              <code style={{ color: '#fff' }}>{res.input}</code>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-dark)' }}>Expected: </span>
                              <code style={{ color: 'var(--success)' }}>{res.expected}</code>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-dark)' }}>Got: </span>
                              <code style={{ color: res.passed ? 'var(--success)' : 'var(--danger)' }}>{res.actual}</code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Workspace;
