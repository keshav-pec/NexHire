import { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client';

const InterviewContext = createContext(null);

export function InterviewProvider({ children }) {
  const [interviewConfig, setInterviewConfig] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const setConfig = useCallback(async (config) => {
    try {
      const res = await client.post('/interviews', {
        company: config.company,
        role: config.role,
        skills: config.skills,
      });
      setActiveSessionId(res.data.interview._id);
      
      setInterviewConfig({
        company: config.company,
        role: config.role,
        skills: config.skills,
        startedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[InterviewContext] Failed to create session record:', err.message);
      throw new Error('Failed to initialize interview session. Please try again.');
    }
  }, []);

  /** Called from InterviewRoom when the interview ends */
  const completeSession = useCallback(async (durationSeconds) => {
    if (!activeSessionId) return;
    try {
      await client.patch(`/interviews/${activeSessionId}`, {
        status: 'completed',
        endedAt: new Date().toISOString(),
        durationSeconds,
      });
    } catch (err) {
      console.warn('[InterviewContext] Failed to update session record:', err.message);
    }
  }, [activeSessionId]);

  const clearConfig = useCallback(() => {
    setInterviewConfig(null);
    setActiveSessionId(null);
  }, []);

  return (
    <InterviewContext.Provider value={{ interviewConfig, activeSessionId, setConfig, completeSession, clearConfig }}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) throw new Error('useInterview must be used within an InterviewProvider');
  return context;
}
