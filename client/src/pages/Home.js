import React, { useState } from 'react';

const burnoutTips = [
  "Take regular short breaks from screens.",
  "Get at least 7-8 hours of sleep each night.",
  "Practice mindfulness or meditation.",
  "Stay hydrated and eat balanced meals.",
  "Talk to someone you trust about how you’re feeling.",
  "Limit multitasking and focus on one thing at a time.",
  "Schedule time for hobbies and relaxation.",
  "Exercise regularly, even a short walk helps."
];

function getRiskColor(risk) {
  if (!risk) return '#0ea5e9';
  if (risk.toLowerCase() === 'high') return '#e11d48';
  if (risk.toLowerCase() === 'medium') return '#f59e42';
  if (risk.toLowerCase() === 'low') return '#0ea5e9';
  return '#0ea5e9';
}

export default function Home() {
  const [mood, setMood] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [breaks, setBreaks] = useState(1);
  const [lastBreak, setLastBreak] = useState(90);
  const [burnoutRisk, setBurnoutRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Assume screen time is in localStorage (in seconds)
  const screenTime = parseInt(localStorage.getItem('screenTime') || '0', 10) / 60; // minutes

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBurnoutRisk(null);
    try {
      const response = await fetch('http://localhost:5001/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screen_time: screenTime, breaks, last_break: lastBreak, mood, sleep }),
      });
      if (!response.ok) throw new Error('Prediction failed');
      const data = await response.json();
      // Defensive: Accept both string and numeric risk_level
      let risk = data.risk_level;
      if (typeof risk === 'number') {
        risk = ['low', 'medium', 'high'][risk] || 'unknown';
      }
      setBurnoutRisk(
        risk
          ? risk.charAt(0).toUpperCase() + risk.slice(1)
          : 'Unknown'
      );
    } catch (err) {
      setError('Could not get burnout prediction. Is the ML backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', boxSizing: 'border-box'}}>
      <div className="burnout-check-card" style={{padding: '1.5rem', background: '#f0fdfa', borderRadius: '1rem', width: '100%', maxWidth: 420, boxShadow: '0 2px 16px #bae6fd33', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <h2 style={{marginBottom: 18, color: '#0ea5e9'}}>Burnout Risk Check</h2>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', width: '100%'}}>
          <label style={{width: '100%', textAlign: 'center'}}>
            Mood (1 = Low, 5 = Great):
            <input
              type="number"
              min="1"
              max="5"
              value={mood}
              onChange={e => setMood(Number(e.target.value))}
              required
              style={{marginLeft: 10, marginBottom: 10, width: 60, textAlign: 'center'}}
            />
          </label>
          <label style={{width: '100%', textAlign: 'center'}}>
            Sleep hours (last night):
            <input
              type="number"
              min="0"
              max="24"
              value={sleep}
              onChange={e => setSleep(Number(e.target.value))}
              required
              style={{marginLeft: 10, marginBottom: 10, width: 60, textAlign: 'center'}}
            />
          </label>
          <label style={{width: '100%', textAlign: 'center'}}>
            Breaks taken today:
            <input
              type="number"
              min="0"
              max="20"
              value={breaks}
              onChange={e => setBreaks(Number(e.target.value))}
              required
              style={{marginLeft: 10, marginBottom: 10, width: 60, textAlign: 'center'}}
            />
          </label>
          <label style={{width: '100%', textAlign: 'center'}}>
            Minutes since last break:
            <input
              type="number"
              min="0"
              max="480"
              value={lastBreak}
              onChange={e => setLastBreak(Number(e.target.value))}
              required
              style={{marginLeft: 10, marginBottom: 10, width: 80, textAlign: 'center'}}
            />
          </label>
          <button type="submit" disabled={loading} style={{marginTop: 10, width: 180, alignSelf: 'center'}}>
            {loading ? 'Checking...' : 'Check Burnout Risk'}
          </button>
        </form>
        {burnoutRisk && (
          <div style={{marginTop: 18, fontWeight: 'bold', color: getRiskColor(burnoutRisk), textAlign: 'center'}}>
            Burnout Risk: {burnoutRisk}
            {burnoutRisk.toLowerCase() === 'high' && (
              <div style={{marginTop: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontWeight: 500, textAlign: 'left'}}>
                <div style={{marginBottom: 6}}>Tips to Reduce Burnout:</div>
                <ul style={{margin: 0, paddingLeft: 18}}>
                  {burnoutTips.slice(0, 4).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {error && <div style={{color: 'red', marginTop: 10, textAlign: 'center'}}>{error}</div>}
      </div>
    </div>
  );
}
