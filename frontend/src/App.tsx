import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import { BookOpen, Terminal, Sparkles } from 'lucide-react';
import type { ProblemsData } from './types';
import defaultProblemsData from './data/problems.json';

const App: React.FC = () => {
  const [problemsData, setProblemsData] = useState<ProblemsData>(defaultProblemsData as ProblemsData);
  const [currentProblemId, setCurrentProblemId] = useState<string | null>(null);
  const [solvedProblems, setSolvedProblems] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch problems list from backend if available
  useEffect(() => {
    fetch('http://localhost:5001/api/problems')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        setProblemsData(data);
      })
      .catch(err => {
        console.warn('Backend server not connected. Using local problems database.', err);
      });

    // Load solved problems from localStorage
    const saved = localStorage.getItem('solved_problems');
    if (saved) {
      try {
        setSolvedProblems(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing solved problems:', e);
      }
    }
  }, []);

  const markProblemAsSolved = (id: string) => {
    if (!solvedProblems.includes(id)) {
      const updated = [...solvedProblems, id];
      setSolvedProblems(updated);
      localStorage.setItem('solved_problems', JSON.stringify(updated));
    }
  };

  // Calculate stats
  const totalProblemsCount = problemsData
    ? problemsData.chapters.reduce((acc, ch) => acc + ch.problems.length, 0)
    : 0;
  
  const solvedCount = solvedProblems.filter(id => {
    if (!problemsData) return false;
    return problemsData.chapters.some(ch => ch.problems.some(p => p.id === id));
  }).length;

  const progressPercent = totalProblemsCount > 0 
    ? Math.round((solvedCount / totalProblemsCount) * 100) 
    : 0;

  const handleSelectProblem = (id: string) => {
    setCurrentProblemId(id);
  };

  const handleBackToDashboard = () => {
    setCurrentProblemId(null);
  };

  const currentProblem = currentProblemId && problemsData
    ? problemsData.chapters
        .flatMap(ch => ch.problems)
        .find(p => p.id === currentProblemId)
    : null;

  const allProblems = problemsData
    ? problemsData.chapters.flatMap(ch => ch.problems)
    : [];
  const currentProblemIndex = allProblems.findIndex(p => p.id === currentProblemId);
  const nextProblem = currentProblemIndex !== -1 && currentProblemIndex < allProblems.length - 1
    ? allProblems[currentProblemIndex + 1]
    : null;

  const handleNextProblem = nextProblem
    ? () => setCurrentProblemId(nextProblem.id)
    : undefined;

  const prevProblem = currentProblemIndex > 0
    ? allProblems[currentProblemIndex - 1]
    : null;

  const handlePrevProblem = prevProblem
    ? () => setCurrentProblemId(prevProblem.id)
    : undefined;

  return (
    <div className="app-container">
      <div className="bg-grid"></div>
      
      <header className="navbar">
        <a href="#" className="navbar-brand" onClick={(e) => { e.preventDefault(); handleBackToDashboard(); }}>
          <Terminal size={24} color="#3b82f6" />
          <span>Python<strong>Glow</strong></span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            WebSocket execution enabled
          </span>
          {currentProblemId && (
            <button className="btn btn-secondary" onClick={handleBackToDashboard}>
              <BookOpen size={16} />
              Syllabus Dashboard
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '16px' }}>
          <div className="pulse-glow" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading Syllabus and Sandbox Workspace...</p>
        </div>
      ) : (
        <>
          {!currentProblemId || !currentProblem ? (
            <Dashboard 
              problemsData={problemsData!} 
              solvedProblems={solvedProblems} 
              progressPercent={progressPercent}
              totalProblemsCount={totalProblemsCount}
              onSelectProblem={handleSelectProblem}
            />
          ) : (
            <Workspace 
              problem={currentProblem} 
              onBack={handleBackToDashboard}
              onSolved={() => markProblemAsSolved(currentProblem.id)}
              isSolved={solvedProblems.includes(currentProblem.id)}
              onNextProblem={handleNextProblem}
              onPrevProblem={handlePrevProblem}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
