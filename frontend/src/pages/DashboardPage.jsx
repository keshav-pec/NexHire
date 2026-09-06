import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import LearningGraphModal from '../components/LearningGraphModal';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setInterviews([
        { _id: 'demo1', role: 'Senior Product Designer', company: 'TechCorp', startedAt: new Date().toISOString(), status: 'completed', feedback: 'Practice Session Complete', score: 92 },
        { _id: 'demo2', role: 'Frontend Engineer', company: 'Innovate AI', startedAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'completed', feedback: 'Practice Session Complete', score: 85 }
      ]);
      setLoading(false);
      return;
    }

    const fetchInterviews = async () => {
      try {
        const res = await client.get('/interviews');
        setInterviews(res.data.interviews || []);
      } catch (err) {
        console.error('Failed to fetch interviews', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, [isAuthenticated]);

  const totalInterviews = interviews.length;
  const scoredInterviews = interviews.filter(i => i.score != null);
  const averageScore = scoredInterviews.length > 0 
    ? (scoredInterviews.reduce((acc, curr) => acc + curr.score, 0) / scoredInterviews.length).toFixed(1)
    : 0;

  let improvementText = "NA";
  let isPositive = true;
  let improvementSubtext = "this month";

  if (scoredInterviews.length >= 2) {
    const sortedScored = [...scoredInterviews].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
    const monthGroups = {};
    sortedScored.forEach(inv => {
      const d = new Date(inv.startedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthGroups[key]) monthGroups[key] = [];
      monthGroups[key].push(inv.score);
    });

    const months = Object.keys(monthGroups);
    if (months.length >= 2) {
      const latestMonth = months[months.length - 1];
      const prevMonth = months[months.length - 2];
      const latestAvg = monthGroups[latestMonth].reduce((a,b)=>a+b,0) / monthGroups[latestMonth].length;
      const prevAvg = monthGroups[prevMonth].reduce((a,b)=>a+b,0) / monthGroups[prevMonth].length;
      const diff = ((latestAvg - prevAvg) / prevAvg) * 100;
      improvementText = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
      isPositive = diff >= 0;
      improvementSubtext = "vs last month";
    } else {
      const recent = sortedScored[sortedScored.length - 1].score;
      const previous = sortedScored[sortedScored.length - 2].score;
      const diff = ((recent - previous) / previous) * 100;
      improvementText = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
      isPositive = diff >= 0;
      improvementSubtext = "vs last session";
    }
  }

  const [showGraph, setShowGraph] = useState(false);

  if (loading) {
    return (
      <div className="candidate-dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }}></div>
      </div>
    );
  }

  return (
    <div className="candidate-dashboard">
      {/* Main Content Area */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1 className="welcome-text">Welcome back, {user?.name || 'John'}! 👋</h1>
            <p className="welcome-subtext">Review your past performance and jump into your next practice session.</p>
          </div>
        </header>

        {/* Stats Grid - Linearized & Clean */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div className="stat-info">
              <h3>Total Interviews</h3>
              <p className="stat-value">{totalInterviews}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
            <div className="stat-info">
              <h3>Average Score</h3>
              <p className="stat-value">{averageScore}%</p>
            </div>
          </div>

          <div className="stat-card clickable-card" onClick={() => setShowGraph(true)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div className="stat-icon stat-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
            <div className="stat-info">
              <h3>Improvement</h3>
              <p className={`stat-value ${isPositive ? 'text-success' : 'text-danger'}`}>
                {improvementText} <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{improvementSubtext}</span>
              </p>
            </div>
          </div>
        </section>

        <div className="dashboard-bento">
          {/* Interview History */}
          <div className="bento-card history-card">
            <div className="bento-header">
              <h2>Interview History & Reports</h2>
              <button className="btn-ghost btn-sm">View All</button>
            </div>
            <div className="interview-list">
              {interviews.map((interview) => (
                <div key={interview._id} className="interview-item">
                  <div className="interview-details">
                    <div className="interview-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <div className="interview-text-info">
                      <h4 className="interview-role">{interview.role} <span className="text-sm">• {interview.company}</span></h4>
                      <p className="interview-feedback">
                        <span className={`status-pill ${interview.status === 'completed' ? 'passed' : ''}`}>
                          {interview.status === 'completed' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>} 
                          {interview.feedback || (interview.status === 'completed' ? 'Practice Session Complete' : 'In Progress')}
                        </span>
                        <span className="text-sm" style={{ marginLeft: 8 }}>{new Date(interview.startedAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <div className="interview-actions">
                    {interview.score != null ? (
                      <div className="score-badge">Score: {interview.score}</div>
                    ) : (
                      <div className="score-badge" style={{ opacity: 0.5 }}>No Score</div>
                    )}
                    {interview.score != null && (
                      <button className="btn-outline btn-sm action-btn" onClick={() => navigate(`/results/${interview._id}`)}>Report</button>
                    )}
                  </div>
                </div>
              ))}
              {interviews.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>No interviews yet. Start one!</div>
              )}
            </div>
          </div>


        </div>
      </main>

      <LearningGraphModal 
        isOpen={showGraph} 
        onClose={() => setShowGraph(false)} 
        data={scoredInterviews} 
      />
    </div>
  );
}
