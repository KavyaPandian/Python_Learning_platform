import React, { useState } from 'react';
import { User, Terminal, ArrowRight, Sparkles, Code, CheckCircle2, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [inputName, setInputName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) {
      setError('Please enter a username to proceed');
      return;
    }
    if (trimmed.length < 2) {
      setError('Username should be at least 2 characters');
      return;
    }
    onLogin(trimmed);
  };

  const quickUsers = ['PythonMaster', 'DevCoder', 'CodeChef', 'PythonStarter'];

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: 'calc(100vh - 70px)', 
      padding: '20px',
      position: 'relative',
      zIndex: 1
    }}>
      <div className="fade-in" style={{ 
        width: '100%', 
        maxWidth: '460px',
        position: 'relative'
      }}>
        {/* Decorative Background Glow Orbs */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(6, 182, 212, 0.15) 50%, transparent 70%)',
          filter: 'blur(45px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}></div>

        {/* Main Glassmorphic Card */}
        <div className="glass-panel" style={{ 
          padding: '40px 36px', 
          borderRadius: '24px', 
          background: 'rgba(15, 23, 42, 0.75)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Top Subtle Neon Edge Line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #3b82f6, #06b6d4, transparent)'
          }}></div>

          {/* Logo Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              marginBottom: '16px',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.25)'
            }}>
              <Terminal size={32} color="#60a5fa" />
            </div>

            <h1 style={{ 
              fontSize: '1.85rem', 
              fontWeight: 800, 
              letterSpacing: '-0.02em', 
              marginBottom: '8px',
              background: 'linear-gradient(to right, #ffffff, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Welcome to <span style={{ color: '#60a5fa', WebkitTextFillColor: 'initial' }}>Python<strong>Glow</strong></span>
            </h1>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Interactive Python learning & execution workspace. Enter your name to start coding!
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                color: 'var(--text-main)', 
                marginBottom: '8px' 
              }}>
                Username
              </label>

              <div style={{ position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <User size={18} />
                </div>

                <input 
                  type="text" 
                  value={inputName} 
                  onChange={(e) => {
                    setInputName(e.target.value);
                    if (error) setError('');
                  }} 
                  placeholder="Enter your username (e.g. Alex)"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 46px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: error ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.25s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4)'
                  }}
                  onFocus={(e) => {
                    if (!error) e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.25)';
                  }}
                  onBlur={(e) => {
                    if (!error) e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.4)';
                  }}
                />
              </div>

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '6px', fontWeight: 500 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Quick Pick Username Suggestions */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginBottom: '8px', fontWeight: 600 }}>
                Quick options:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {quickUsers.map((uname) => (
                  <button
                    key={uname}
                    type="button"
                    onClick={() => {
                      setInputName(uname);
                      setError('');
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    +{uname}
                  </button>
                ))}
              </div>
            </div>

            {/* Login Action Button */}
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                fontSize: '1rem', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                marginTop: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
              }}
            >
              Start Coding <ArrowRight size={18} />
            </button>
          </form>

          {/* Footer Features Badge */}
          <div style={{ 
            marginTop: '28px', 
            paddingTop: '20px', 
            borderTop: '1px solid var(--border-color)', 
            display: 'flex', 
            justifyContent: 'space-around', 
            fontSize: '0.78rem', 
            color: 'var(--text-muted)' 
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={14} color="var(--success)" /> Instant Sandbox
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Code size={14} color="#60a5fa" /> 9+ Python Exercises
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Sparkles size={14} color="#facc15" /> Auto Evaluator
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
