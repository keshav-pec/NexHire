import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show navbar in the interview room or onboarding
  if (location.pathname === '/interview' || location.pathname === '/onboarding') {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="8.5" cy="10" r="1.5" />
              <circle cx="15.5" cy="10" r="1.5" />
              <path d="M8 15h8" />
            </svg>
          </div>
          <span className="nav-logo-text">NexHire</span>
        </Link>

        {/* Center Links */}
        <div className="nav-links"></div>

        {/* Right Actions */}
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <div className="nav-user">
                <div className="nav-avatar">
                  {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <span className="nav-username">{user?.name || user?.username}</span>
              </div>
              <button onClick={() => { logout(); navigate('/'); }} className="btn-text">
                Log Out
              </button>
            </>
          ) : location.pathname !== '/login' ? (
            <>
              <button onClick={() => navigate('/login')} className="btn-text btn-sm">Sign In</button>
              <button onClick={() => navigate('/login?mode=signup')} className="btn-primary btn-sm">Get Started</button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
