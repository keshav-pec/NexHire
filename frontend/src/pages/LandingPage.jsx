import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="dashboard-page">
      <div className="dashboard-content">
        
        {/* Hero Section */}
        <div className="hero-section">
          <h1 className="hero-title">
            Master Your Next <br />
            <span className="text-primary">Interview</span> 
          </h1>
          
          <p className="hero-subtitle">
            An interactive mock interview platform designed for students and job seekers. Practice in real-time, build confidence, and get evaluated objectively.
          </p>
          
          <div className="hero-actions">
            <button className="btn-primary hero-btn" onClick={() => navigate('/onboarding')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Practice Interview
            </button>
            
            <button 
              className="btn-outline hero-btn"
              onClick={() => navigate('/dashboard')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              {isAuthenticated ? 'Dashboard' : 'Demo Dashboard'}
            </button>
          </div>
        </div>

        {/* Floating UI Elements */}
        <div className="hero-illustration">
          {/* Center Mascot */}
          <div className="mascot-container">
            <div className="mascot-body">
              <div className="mascot-face">
                <div className="mascot-eye left"></div>
                <div className="mascot-eye right"></div>
                <div className="mascot-beak"></div>
              </div>
              <div className="mascot-headset"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide / How it Works Section */}
      <section className="guide-section">
        <div className="guide-content">
          <h2 className="guide-title">How It Works</h2>
          <div className="guide-grid">
            <div className="guide-card card">
              <div className="guide-icon">1</div>
              <h3>Set Your Target</h3>
              <p>Tell the AI what company and role you are interviewing for, along with your background skills.</p>
            </div>
            <div className="guide-card card">
              <div className="guide-icon">2</div>
              <h3>Live Mock Interview</h3>
              <p>Face our highly advanced 3D robotic interviewer. It listens, analyzes, and responds in real-time just like a real recruiter.</p>
            </div>
            <div className="guide-card card">
              <div className="guide-icon">3</div>
              <h3>Complete Evaluation</h3>
              <p>Experience a structured evaluation-mode mock interview to test your readiness and technical depth under pressure.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
