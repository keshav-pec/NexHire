import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import { useAuth } from '../context/AuthContext';
import { getGeminiService, resetGeminiService } from '../services/geminiLive';
import client from '../api/client';
import AvatarScene from '../components/AvatarScene';
import './InterviewRoom.css';

const INTERVIEW_STATES = {
  SETUP: 'setup',
  CONNECTING: 'connecting',
  ACTIVE: 'active',
  ENDED: 'ended',
};

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function InterviewRoom() {
  const { interviewConfig, activeSessionId, completeSession, clearConfig } = useInterview();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interviewState, setInterviewState] = useState(INTERVIEW_STATES.SETUP);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isViewSwapped, setIsViewSwapped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState('');
  const [fetchingKey, setFetchingKey] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const transcriptRef = useRef([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiCaption, setAiCaption] = useState(null);
  const [userCaption, setUserCaption] = useState(null);

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const isInterviewActiveRef = useRef(false);

  // Redirect if no interview config
  useEffect(() => {
    if (!interviewConfig && !isGeneratingReport) {
      navigate('/onboarding');
    }
  }, [interviewConfig, isGeneratingReport, navigate]);

  // ─── Setup camera & mic ──────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      cameraStreamRef.current = stream;
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  };

  const toggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
      setIsCameraOn(false);
    } else {
      startCamera();
      setIsCameraOn(true);
    }
  };

  // Start camera on mount
  useEffect(() => {
    startCamera();
    
    // Setup SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true; // live captions
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const text = event.results[i][0].transcript.trim();
            if (text) {
              setTranscript(prev => {
                const newT = [...prev, { role: 'user', text }];
                transcriptRef.current = newT;
                return newT;
              });
            }
            setUserCaption(null); // clear user caption on final
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (interimTranscript) {
          setUserCaption(interimTranscript);
        }
      };
      
      recognition.onend = () => {
        if (isInterviewActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn('SpeechRecognition restart error:', e);
          }
        }
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      stopCamera();
      resetGeminiService();
      if (timerRef.current) clearInterval(timerRef.current);
      isInterviewActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const startInterview = useCallback(async () => {
    if (!interviewConfig) return;
    setError('');
    setInterviewState(INTERVIEW_STATES.CONNECTING);
    setFetchingKey(true);

    // Fetch Gemini key from backend (key never lives in frontend bundle)
    let apiKey = '';
    try {
      const res = await fetch('/api/gemini/key', {
        headers: { Authorization: `Bearer ${localStorage.getItem('nexhire_token')}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      apiKey = data.apiKey;
    } catch (err) {
      setError('Could not fetch API key: ' + err.message);
      setInterviewState(INTERVIEW_STATES.SETUP);
      setFetchingKey(false);
      return;
    }
    setFetchingKey(false);

    const service = getGeminiService();

    service.onStateChange = (state) => {
      if (state === 'connected' || state === 'listening') {
        setInterviewState(INTERVIEW_STATES.ACTIVE);
      }
      if (state === 'speaking') setIsSpeaking(true);
      if (state === 'listening') setIsSpeaking(false);
    };
    service.onVolumeChange = (volume) => {
      setIsSpeaking(volume > 0.05);
    };
    service.onTranscript = (role, text) => {
      setTranscript(prev => {
        const newT = [...prev, { role, text }];
        transcriptRef.current = newT;
        return newT;
      });
    };
    service.onLiveCaption = (role, text) => {
      if (text) {
        setAiCaption(text);
      } else {
        setAiCaption(null);
      }
    };
    service.onError = (msg) => {
      setError(msg);
    };

    const ok = await service.connect(apiKey, {
      company: interviewConfig.company,
      role: interviewConfig.role,
      skills: interviewConfig.skills,
      userName: user?.name || 'Candidate',
    });

    if (!ok) {
      setInterviewState(INTERVIEW_STATES.SETUP);
      return;
    }

    isInterviewActiveRef.current = true;
    await service.startMicrophone();
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) { console.warn(e); }
    }

    timerRef.current = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);
  }, [interviewConfig, user]);

  const endInterview = useCallback(async () => {
    setIsGeneratingReport(true);
    isInterviewActiveRef.current = false;
    const service = getGeminiService();
    await service.disconnect();
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { console.warn(e); }
    }
    setIsSpeaking(false);
    await completeSession(elapsedTime);
    
    let success = false;
    try {
      if (activeSessionId) {
        // Backend now returns immediately with 202 Accepted
        await client.post(`/reports/generate/${activeSessionId}`, {
          transcript: transcriptRef.current
        });
        success = true;
      }
    } catch(err) {
      console.error('Error starting report generation:', err);
    }
    
    // Cleanup and redirect to report
    stopCamera();
    resetGeminiService();
    setIsGeneratingReport(false);
    
    if (success && activeSessionId) {
      navigate(`/results/${activeSessionId}`);
    } else {
      navigate('/dashboard');
    }
    
    setTimeout(() => {
      clearConfig();
    }, 100);
  }, [elapsedTime, completeSession, navigate, activeSessionId, clearConfig]);

  const handleCancel = () => {
    isInterviewActiveRef.current = false;
    stopCamera();
    resetGeminiService();
    navigate('/dashboard');
    setTimeout(() => clearConfig(), 100);
  };

  const toggleMute = () => {
    getGeminiService().setMuted(!isMuted);
    setIsMuted((m) => !m);
  };

  const toggleAiMute = () => {
    getGeminiService().setAiMuted(!isAiMuted);
    setIsAiMuted((m) => !m);
  };

  const toggleViewSwap = () => setIsViewSwapped((v) => !v);

  if (!interviewConfig) return null;

  // ─── View panels ─────────────────────────────────────────
  const avatarView = (
    <div className={`room-main ${isViewSwapped ? 'room-mini' : ''}`}>
      <AvatarScene isSpeaking={isSpeaking} />
      <div className="room-view-label">AI Interviewer</div>
      {isSpeaking && (
        <div className="speaking-indicator">
          <div className="speaking-dot" />
          <div className="speaking-dot" />
          <div className="speaking-dot" />
        </div>
      )}
    </div>
  );

  const cameraView = (
    <div className={`${isViewSwapped ? 'room-main' : 'room-mini'}`}>
      {isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="room-main-video"
          style={{ transform: 'scaleX(-1)' }}
        />
      ) : (
        <div className="camera-off">
          <div className="camera-off-avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <span>Camera off</span>
        </div>
      )}
      <div className="room-view-label">{user?.name || 'You'}</div>
    </div>
  );

  return (
    <div className="interview-room">
      {/* Top bar */}
      <div className="room-topbar">
        <div className="room-topbar-left">
          <div className="room-topbar-info">
            <span className="badge room-company-badge">{interviewConfig.company}</span>
            
            <span className="room-role-text">{interviewConfig.role}</span>
          </div>
        </div>

        <div className="room-topbar-right">
          {interviewState === INTERVIEW_STATES.ACTIVE && (
            <div className="room-timer">
              <div className={`room-timer-dot ${interviewState === INTERVIEW_STATES.ACTIVE ? 'active' : ''}`} />
              <span className="room-timer-text">{formatTime(elapsedTime)}</span>
            </div>
          )}

          {interviewState === INTERVIEW_STATES.CONNECTING && (
            <div className="room-connecting">
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              <span>Connecting...</span>
            </div>
          )}

          {interviewState === INTERVIEW_STATES.ACTIVE && (
            <button className="btn btn-danger btn-sm" onClick={endInterview} disabled={isGeneratingReport} id="end-interview-btn">
              {isGeneratingReport ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />
                  Finishing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                    <line x1="23" y1="1" x2="1" y2="23" />
                  </svg>
                  End
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main video area */}
      <div className="room-stage">
        {avatarView}
        {cameraView}

        {/* Swap view button */}
        {interviewState === INTERVIEW_STATES.ACTIVE && (
          <button className="room-swap-btn btn btn-icon glass" onClick={toggleViewSwap} title="Swap views" id="swap-view-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        )}
      </div>

      {/* Global Captions Overlay */}
      {interviewState === INTERVIEW_STATES.ACTIVE && (
        <div className="global-captions-container">
          {aiCaption && (
            <div className="live-caption-overlay ai-caption-overlay">
              <div className="live-caption-text ai-caption">{aiCaption}</div>
            </div>
          )}
          {userCaption && (
            <div className="live-caption-overlay user-caption-overlay">
              <div className="live-caption-text user-caption">{userCaption}</div>
            </div>
          )}
        </div>
      )}

      {/* Setup overlay */}
      {interviewState === INTERVIEW_STATES.SETUP && (
        <div className="room-overlay">
          <div className="room-setup-card card card-elevated">
            <h2 className="room-setup-title">Ready to begin?</h2>
            <p className="room-setup-desc">
              You'll have a natural voice conversation with the AI interviewer.
              Make sure your microphone is working.
            </p>

            <div className="room-setup-details">
              <div className="setup-detail">
                <span className="setup-detail-label">Company</span>
                <span className="setup-detail-value">{interviewConfig.company}</span>
              </div>
              <div className="setup-detail">
                <span className="setup-detail-label">Role</span>
                <span className="setup-detail-value">{interviewConfig.role}</span>
              </div>
            </div>

            {error && (
              <div className="auth-error" style={{ marginBottom: 16 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <button className="btn btn-success btn-lg room-start-btn" onClick={startInterview} disabled={fetchingKey} id="begin-interview-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {fetchingKey ? 'Connecting...' : 'Begin Interview'}
            </button>

            <button className="btn btn-ghost" onClick={handleCancel} style={{ marginTop: 8 }}>
              ← Go back
            </button>
          </div>
        </div>
      )}

      {/* Generating Report overlay */}
      {isGeneratingReport && (
        <div className="room-overlay" style={{ zIndex: 100, backdropFilter: 'blur(10px)' }}>
          <div className="room-setup-card card card-elevated" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4, margin: '0 auto 24px auto', borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
            <h2 className="room-setup-title">Analyzing your interview...</h2>
            <p className="room-setup-desc" style={{ marginBottom: 0 }}>
              Our AI is currently reviewing your responses and compiling a detailed feedback report. Please hold on, you will be redirected shortly.
            </p>
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      {interviewState === INTERVIEW_STATES.ACTIVE && (
        <div className="room-controls glass">
          <button
            className={`btn btn-icon room-control-btn ${isMuted ? 'control-active-danger' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            id="mute-btn"
          >
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .5-.05 1-.15 1.46" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          <button
            className={`btn btn-icon room-control-btn ${isAiMuted ? 'control-active-danger' : ''}`}
            onClick={toggleAiMute}
            title={isAiMuted ? 'Unmute AI' : 'Mute AI'}
            id="mute-ai-btn"
          >
            {isAiMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          <button
            className={`btn btn-icon room-control-btn ${!isCameraOn ? 'control-active-danger' : ''}`}
            onClick={toggleCamera}
            title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            id="camera-btn"
          >
            {isCameraOn ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>

          <button
            className="btn btn-icon room-control-btn control-end"
            onClick={endInterview}
            disabled={isGeneratingReport}
            title="End interview"
            id="end-call-btn"
          >
            {isGeneratingReport ? (
              <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
