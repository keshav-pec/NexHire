import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import './ResultsPage.css';

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [openQuestionId, setOpenQuestionId] = useState(1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id === 'demo1' || id === 'demo2') {
      const isDemo1 = id === 'demo1';
      setReport({
        createdAt: isDemo1 ? new Date().toISOString() : new Date(Date.now() - 86400000 * 5).toISOString(),
        overallScore: isDemo1 ? 92 : 85,
        status: 'Practice Session Complete',
        metrics: { communication: isDemo1 ? 90 : 80, technical: isDemo1 ? 95 : 90, cultural: 85 },
        interviewId: {
          role: isDemo1 ? 'Senior Product Designer' : 'Frontend Engineer',
          company: isDemo1 ? 'TechCorp' : 'Innovate AI'
        },
        questions: [
          {
            id: 1,
            score: 8.5,
            rating: 'Excellent',
            questionText: 'Tell me about yourself and your professional background.',
            summary: 'Clear self-introduction with 5 years of experience context. Confident tone.',
            feedback: 'Great storytelling arc. Could add 1-2 key technical wins to strengthen impact.',
            percentage: 85,
          },
          {
            id: 2,
            score: 9.0,
            rating: 'Outstanding',
            questionText: 'Describe a challenging project you led and how you overcame obstacles.',
            summary: 'Detailed explanation of the project constraints and leadership role. Very structured.',
            feedback: 'Strong problem-solving demonstration. Ensure you highlight specific metrics of success.',
            percentage: 90,
          }
        ]
      });
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        const res = await client.get(`/reports/interview/${id}`);
        setReport(res.data.report);
      } catch (err) {
        console.error('Failed to fetch report', err);
        setError('Could not load your interview report.');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchReport();
    }
  }, [id]);

  const toggleQuestion = (qid) => {
    setOpenQuestionId(openQuestionId === qid ? null : qid);
  };

  if (loading) {
    return (
      <div className="results-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }}></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="results-page" style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
        <h2>{error || 'Report not found'}</h2>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: 16 }}>Back to Dashboard</button>
      </div>
    );
  }

  const interviewData = {
    name: user?.name || 'John',
    role: report.interviewId?.role || 'Role',
    company: report.interviewId?.company || 'Company',
    date: new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    overallScore: report.overallScore,
    status: report.status || 'Practice Session Complete',
    metrics: report.metrics || { communication: 0, technical: 0, cultural: 0 },
    questions: report.questions || [],
  };

  return (
    <div className="results-page">
      {/* Dark Hero Section */}
      <section className="results-hero">
        <p className="hero-eyebrow">PRACTICE SESSION COMPLETE</p>
        <h1 className="hero-title">Great work, {interviewData.name}! 🎉</h1>
        <p className="hero-subtitle">
          {interviewData.role} · {interviewData.company} Mock Interview · {interviewData.date}
        </p>
      </section>

      {/* Main Container */}
      <main className="results-container">
        
        {/* Overall Score Card Overlay */}
        <div className="score-card-overlay">
          <div className="mascot-side">
            <div className="overall-score-circle">
              <svg viewBox="0 0 36 36" className="circular-chart stat-green xl-chart">
                <path className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path className="circle"
                  strokeDasharray={`${interviewData.overallScore}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="score-text-inner">
                <span className="big-score">{interviewData.overallScore}</span>
                <span className="small-text">out of 100</span>
              </div>
            </div>
            <p className="score-label stat-green-text">Excellent Performance</p>
          </div>
          
          <div className="metrics-grid">
            <div className="metric-box bg-green">
              <div className="metric-chart-sm">
                <svg viewBox="0 0 36 36" className="circular-chart stat-green sm-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${interviewData.metrics.communication}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <div className="metric-info">
                <span className="metric-name">Communication</span>
                <span className="metric-value text-green">{interviewData.metrics.communication}</span>
              </div>
            </div>
            
            <div className="metric-box bg-purple">
              <div className="metric-chart-sm">
                <svg viewBox="0 0 36 36" className="circular-chart stat-purple sm-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${interviewData.metrics.technical}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <div className="metric-info">
                <span className="metric-name">Technical</span>
                <span className="metric-value text-purple">{interviewData.metrics.technical}</span>
              </div>
            </div>
            
            <div className="metric-box bg-orange">
              <div className="metric-chart-sm">
                <svg viewBox="0 0 36 36" className="circular-chart stat-orange sm-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${interviewData.metrics.cultural}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <div className="metric-info">
                <span className="metric-name">Cultural Fit</span>
                <span className="metric-value text-orange">{interviewData.metrics.cultural}</span>
              </div>
            </div>
            
            <div className="metric-box bg-blue">
              <div className="metric-chart-sm">
                <svg viewBox="0 0 36 36" className="circular-chart stat-blue sm-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${interviewData.overallScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
              <div className="metric-info">
                <span className="metric-name">Overall</span>
                <span className="metric-value text-blue">{interviewData.overallScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question by Question Review */}
        <section className="qb-review-section">
          <div className="section-header">
            <h2>Question-by-Question Review</h2>
            <p>Detailed AI feedback for each of your responses</p>
          </div>

          <div className="questions-list">
            {interviewData.questions.map((q) => {
              const isOpen = openQuestionId === q.id;
              return (
                <div className={`question-card ${isOpen ? 'open' : ''}`} key={q.id}>
                  <div className="question-header" onClick={() => toggleQuestion(q.id)}>
                    <div className="q-score-box">
                      {q.score}
                    </div>
                    <div className="q-info">
                      <div className="q-meta">
                        <span className="q-num">Q{q.id}</span>
                        <span className={`q-rating rating-${q.rating.toLowerCase()}`}>{q.rating}</span>
                      </div>
                      <h3 className="q-text">{q.questionText}</h3>
                    </div>
                    <div className="q-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${q.percentage}%` }}></div>
                      </div>
                      <span className="progress-text">{q.percentage}%</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`chevron ${isOpen ? 'up' : 'down'}`}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="question-body">
                      <div className="feedback-box summary-box">
                        <h4>YOUR RESPONSE SUMMARY</h4>
                        <p>{q.summary}</p>
                      </div>
                      <div className="feedback-box ai-box">
                        <h4>AI FEEDBACK</h4>
                        <p>{q.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
