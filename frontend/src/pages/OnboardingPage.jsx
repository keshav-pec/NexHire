import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import './OnboardingPage.css';

const STEP_COUNT = 2;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setConfig } = useInterview();
  const navigate = useNavigate();

  const handleNext = async () => {
    if (step === 0) {
      if (!company.trim() || !role.trim()) {
        setError('Both Target Company and Role are required.');
        return;
      }
    } else if (step === 1) {
      if (!skills.trim()) {
        setError('Skills & Background is required.');
        return;
      }
    }

    setError('');

    if (step < STEP_COUNT - 1) {
      setStep(step + 1);
    } else {
      // Final step — start the interview
      setLoading(true);
      try {
        await setConfig({ company, role, skills });
        navigate('/interview');
      } catch (err) {
        setError(err.message || 'Failed to connect. Please try again.');
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError('');
    } else {
      navigate('/');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && step === 0) {
      e.preventDefault();
      handleNext();
    }
  };

  const isLastStep = step === STEP_COUNT - 1;

  return (
    <div className="onboarding-page page-center">
      {/* Background decoration */}
      <div className="onboarding-bg-pattern" />

      <div className="onboarding-container">
        {/* Progress bar */}
        <div className="onboarding-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
            />
          </div>
          <span className="progress-label">
            Step {step + 1} of {STEP_COUNT}
          </span>
        </div>

        {/* Step content */}
        <div className="onboarding-step">
          {step === 0 && (
            <>
              <div className="step-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>

              <h2 className="onboarding-title">Target Role Details</h2>

              <div className="input-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="company-input">Target Company</label>
                <input
                  id="company-input"
                  type="text"
                  className={`input-field ${error && !company.trim() ? 'error' : ''}`}
                  placeholder="e.g. Google, Amazon, Stripe..."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label htmlFor="role-input">Target Role</label>
                <input
                  id="role-input"
                  type="text"
                  className={`input-field ${error && !role.trim() && company.trim() ? 'error' : ''}`}
                  placeholder="e.g. Senior Software Engineer, Product Manager..."
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="step-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>

              <h2 className="onboarding-title">Skills & Background</h2>

              <div className="input-group">
                <label htmlFor="skills-input">Share your resume highlights</label>
                <textarea
                  id="skills-input"
                  className={`input-field ${error ? 'error' : ''}`}
                  placeholder="e.g. 5 years React experience, built real-time systems at scale, familiar with distributed computing..."
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  rows={5}
                  autoFocus
                />
              </div>
            </>
          )}

          {error && (
            <div className="onboarding-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="onboarding-actions">
          <button onClick={handleBack} className="btn btn-ghost">
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          
          <button onClick={handleNext} className="btn btn-primary" disabled={loading}>
            {loading ? (
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            ) : isLastStep ? 'Start Interview' : (
              <>
                Next Step
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
