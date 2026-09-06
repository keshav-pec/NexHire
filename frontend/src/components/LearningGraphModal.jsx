import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './LearningGraphModal.css';

export default function LearningGraphModal({ isOpen, onClose, data }) {
  if (!isOpen) return null;

  // Format data for chart (sort chronologically)
  const chartData = [...data]
    .filter(d => d.score != null)
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
    .map(d => {
      const date = new Date(d.startedAt);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: d.score,
        role: d.role
      };
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Learning Curve</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p className="modal-desc">Track your interview scores over time and see your improvement.</p>
          
          {chartData.length < 2 ? (
            <div className="empty-chart">
              <p>Complete at least 2 interviews to see your learning graph!</p>
            </div>
          ) : (
            <div className="chart-container" style={{ width: '100%', height: 300, marginTop: '2rem' }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888' }} />
                  <YAxis domain={[0, 100]} stroke="#888" tick={{ fill: '#888' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                    itemStyle={{ color: 'var(--primary)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="var(--primary)" 
                    strokeWidth={3} 
                    activeDot={{ r: 8 }} 
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
