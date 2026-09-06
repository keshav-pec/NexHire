import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode');

  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shakeField, setShakeField] = useState('');

  const { login, register } = useAuth();

  useEffect(() => {
    if (initialMode === 'signup') setIsLogin(false);
    else setIsLogin(true);
  }, [initialMode]);

  const triggerShake = (field) => {
    setShakeField(field);
    setTimeout(() => setShakeField(''), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    if (isLogin) {
      if (!username.trim()) { triggerShake('username'); setError('Username is required'); setIsLoading(false); return; }
      if (!password.trim()) { triggerShake('password'); setError('Password is required'); setIsLoading(false); return; }

      const result = await login(username, password);
      if (!result.success) {
        setError(result.error);
        triggerShake('password');
      }
      // On success, AuthContext sets user → ProtectedRoute/PublicRoute navigates
    } else {
      if (!name.trim()) { triggerShake('name'); setError('Name is required'); setIsLoading(false); return; }
      if (!username.trim()) { triggerShake('username'); setError('Username is required'); setIsLoading(false); return; }
      if (!password.trim()) { triggerShake('password'); setError('Password is required'); setIsLoading(false); return; }

      const result = await register(name, username, password);
      if (!result.success) {
        setError(result.error);
      }
    }

    setIsLoading(false);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMsg('');
    setShakeField('');
  };

  return (
    <div className="auth-page page-center" style={{ background: '#E6F8F0' }}>
      <div className="auth-content-wrapper">
        {/* Animated Mascot Peeking & Holding the Box */}
        <div className="auth-mascot-wrapper">
          <div className="auth-owl">
            <div className="auth-owl-body">
              <div className="auth-owl-face">
                <div className="auth-owl-eye left"></div>
                <div className="auth-owl-eye right"></div>
                <div className="auth-owl-beak"></div>
              </div>
            </div>
            <div className="auth-owl-headset"></div>
          </div>
        </div>
        
        <div className="auth-container" key={isLogin ? 'login' : 'register'}>
          {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="auth-subtitle">
            {isLogin
              ? 'Sign in to continue your interview prep'
              : 'Start your AI-powered interview journey'}
          </p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} id="auth-form">
          {!isLogin && (
            <div className="input-group auth-field-enter">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                className={`input-field ${shakeField === 'name' ? 'error' : ''}`}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className={`input-field ${shakeField === 'username' ? 'error' : ''}`}
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={`input-field ${shakeField === 'password' ? 'error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          {successMsg && (
            <div className="auth-success" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={isLoading}
            id="auth-submit-btn"
          >
            {isLoading ? (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="auth-toggle">
          <span className="auth-toggle-text">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button className="auth-toggle-btn" onClick={switchMode} id="auth-toggle-btn">
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
      
      {/* Mascot Hands gripping the card */}
      <div className="auth-owl-hands">
        <div className="auth-owl-hand left-hand"></div>
        <div className="auth-owl-hand right-hand"></div>
      </div>
    </div>
  </div>
  );
}
