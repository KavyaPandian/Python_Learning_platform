import React, { useState } from 'react';
import type { ProblemsData, Problem } from '../types';
import { 
  Star, 
  BookOpen, 
  Clock, 
  Code, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Play 
} from 'lucide-react';

interface DashboardProps {
  problemsData: ProblemsData;
  solvedProblems: string[];
  progressPercent: number;
  totalProblemsCount: number;
  onSelectProblem: (id: string) => void;
  username?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  problemsData,
  solvedProblems,
  progressPercent,
  totalProblemsCount,
  onSelectProblem,
  username
}) => {
  const solvedCount = problemsData ? problemsData.chapters
    .flatMap(c => c.problems)
    .filter(p => solvedProblems.includes(p.id)).length : 0;

  const isAllCompleted = totalProblemsCount > 0 && solvedCount >= totalProblemsCount;

  // Track expanded chapters (by chapter ID). Default first chapter is open.
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({ 1: true });

  const toggleChapter = (chapterId: number) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Find first unsolved problem to Resume
  const handleResume = () => {
    let firstUnsolved: Problem | null = null;
    for (const chapter of problemsData.chapters) {
      for (const problem of chapter.problems) {
        if (!solvedProblems.includes(problem.id)) {
          firstUnsolved = problem;
          break;
        }
      }
      if (firstUnsolved) break;
    }
    if (firstUnsolved) {
      onSelectProblem(firstUnsolved.id);
    } else if (problemsData.chapters[0]?.problems[0]) {
      onSelectProblem(problemsData.chapters[0].problems[0].id);
    }
  };

  return (
    <main className="dashboard-container fade-in" style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px', width: '100%' }}>
      {/* Hero Header Section */}
      <section className="glass-panel" style={{ padding: '32px', marginBottom: '32px', background: 'radial-gradient(ellipse at top right, rgba(59, 130, 246, 0.15), rgba(15, 23, 42, 0.6))', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: '#eab308', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Code size={24} color="#000" />
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {username ? `Welcome, ${username}! 👋` : 'Practice Python'}
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '650px', lineHeight: '1.6' }}>
              Solve Python coding problems online with interactive, curriculum-based execution. Write code for over {totalProblemsCount} Python coding exercises and boost your confidence in programming.
            </p>
          </div>
          
          {/* Top Badges */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '9999px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa' }}>
              <BookOpen size={14} /> Learn & Utilise
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(250, 204, 21, 0.12)', border: '1px solid rgba(250, 204, 21, 0.25)', borderRadius: '9999px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, color: '#facc15' }}>
              <Star size={14} fill="#facc15" /> 4.6 (68.8k+)
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '16px 0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}><strong>{problemsData.chapters.length}</strong> Lessons</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}><strong>10</strong> Hours</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}><strong>{totalProblemsCount}</strong> Problems</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}><strong>334.1k</strong> Learners</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Beginner Level</span>
          </div>
        </div>

        {/* Progress Bar and Action button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Your Progress: <span style={{ color: 'var(--success)' }}>{progressPercent}% Completed</span></span>
              <span style={{ color: 'var(--text-muted)' }}>{solvedCount}/{totalProblemsCount} Solved</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(to right, var(--primary), var(--success))', borderRadius: '999px', transition: 'width 0.5s ease' }}></div>
            </div>
          </div>
          <button 
            className={`btn ${isAllCompleted ? 'btn-success' : 'btn-primary'}`} 
            style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px' }} 
            onClick={handleResume}
          >
            {isAllCompleted ? (
              <>
                <CheckCircle size={16} color="#fff" />
                Completed
              </>
            ) : (
              <>
                <Play size={16} fill="#fff" />
                Resume Practice
              </>
            )}
          </button>
        </div>
      </section>

      {/* Chapters syllabus section */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>Course Curriculum</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {problemsData.chapters.map((chapter) => {
          const isExpanded = !!expandedChapters[chapter.id];
          
          // Calculate chapter progress
          const chapterProblems = chapter.problems;
          const chapterSolved = chapterProblems.filter(p => solvedProblems.includes(p.id)).length;
          const chapterProgress = chapterProblems.length > 0 
            ? Math.round((chapterSolved / chapterProblems.length) * 100) 
            : 0;

          return (
            <div key={chapter.id} className="glass-panel" style={{ overflow: 'hidden', transition: 'border-color 0.2s' }}>
              {/* Chapter Accordion Header */}
              <div 
                onClick={() => toggleChapter(chapter.id)}
                style={{ 
                  padding: '20px 24px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.01)',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    background: 'rgba(255,255,255,0.04)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {chapter.id}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                      {chapter.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {chapter.description}
                    </p>
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', color: chapterProgress === 100 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {chapterProgress}% Solved
                    </div>
                  </div>
                </div>
                
                <div>
                  {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                </div>
              </div>

              {/* Chapter Problems List (Table) */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.2)' }}>
                  {chapterProblems.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dark)' }}>
                      No problems in this module yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                            <th style={{ padding: '14px 24px' }}>Problem Name</th>
                            <th style={{ padding: '14px 24px' }}>Status</th>
                            <th style={{ padding: '14px 24px' }}>Difficulty</th>
                            <th style={{ padding: '14px 24px', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chapterProblems.map((prob) => {
                            const isSolved = solvedProblems.includes(prob.id);
                            return (
                              <tr 
                                key={prob.id} 
                                style={{ 
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                  transition: 'background 0.2s'
                                }}
                                className="problem-row"
                              >
                                <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                                  <a 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); onSelectProblem(prob.id); }}
                                    style={{ color: '#60a5fa', textDecoration: 'none', transition: 'color 0.2s' }}
                                    onMouseOver={(e) => (e.currentTarget.style.color = '#3b82f6')}
                                    onMouseOut={(e) => (e.currentTarget.style.color = '#60a5fa')}
                                  >
                                    {prob.name}
                                  </a>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                  {isSolved ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                                      <CheckCircle size={16} fill="rgba(16, 185, 129, 0.1)" /> Solved
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dark)', fontSize: '0.85rem' }}>
                                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }}></div> Unsolved
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                  <span className={`badge badge-${prob.difficulty.toLowerCase()}`}>
                                    {prob.difficulty}
                                  </span>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                  <button 
                                    className={`btn ${isSolved ? 'btn-secondary' : 'btn-primary'}`}
                                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                                    onClick={() => onSelectProblem(prob.id)}
                                  >
                                    {isSolved ? 'Review' : 'Solve'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
};

export default Dashboard;
