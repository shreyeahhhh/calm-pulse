import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import './App.css';
import { 
  FiClock, FiCoffee, FiActivity, FiAlertCircle, FiCheckCircle, 
  FiPause, FiPlay, FiSettings, FiVolume2, FiVolumeX, FiX,
  FiTarget, FiDroplet, FiEye, FiRefreshCw
} from 'react-icons/fi';
import Home from './pages/Home';

// Break activities data
const breakActivities = [
  { type: 'eye', icon: <FiEye />, activity: '20-20-20 Rule: Look 20ft away for 20s', duration: 20 },
  { type: 'stretch', icon: <FiRefreshCw />, activity: 'Shoulder rolls and neck stretches', duration: 60 },
  { type: 'walk', icon: <FiActivity />, activity: 'Take a short walk', duration: 300 },
  { type: 'water', icon: <FiDroplet />, activity: 'Drink water and stand up', duration: 30 }
];

function App() {
  const [screenTime, setScreenTime] = useState(0);
  const [breaks, setBreaks] = useState(0);
  const [lastBreak, setLastBreak] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [breakTimer, setBreakTimer] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [currentActivity, setCurrentActivity] = useState(null);
  const workerRef = useRef(null);

  // Add refs for state values used in worker handler
  const isTrackingRef = useRef(isTracking);
  const isPausedRef = useRef(isPaused);
  const isOnBreakRef = useRef(isOnBreak);

  useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isOnBreakRef.current = isOnBreak; }, [isOnBreak]);

  // Statistics tracking
  const [stats, setStats] = useState({
    dailyScreenTime: 0,
    weeklyScreenTime: 0,
    totalBreaks: 0,
    averageSessionLength: 0,
    longestSession: 0,
    lastUpdate: new Date().toISOString().split('T')[0]
  });

  // Pomodoro settings
  const [pomodoro, setPomodoro] = useState({
    enabled: false,
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    currentSession: 0
  });
  
  const [settings, setSettings] = useState({
    maxScreenTime: 120,
    breakInterval: 30,
    breakDuration: 5,
    notificationsEnabled: true,
    soundEnabled: true,
    pomodoroEnabled: false,
    waterReminders: true,
    exerciseReminders: true,
    dailyGoal: 480 // 8 hours
  });

  // Ensure worker and onmessage are set up only once
  useEffect(() => {
    workerRef.current = new Worker('timeWorker.js'); // Use public folder worker
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'tick') {
        if (isTrackingRef.current && !isPausedRef.current && !isOnBreakRef.current) {
          setScreenTime(prev => prev + 1);
          setLastBreak(prev => prev + 1);
          setStats(prev => ({
            ...prev,
            dailyScreenTime: prev.dailyScreenTime + 1,
            weeklyScreenTime: prev.weeklyScreenTime + 1,
            averageSessionLength: Math.round((prev.dailyScreenTime + 1) / (prev.totalBreaks + 1)),
            longestSession: Math.max(prev.longestSession, screenTime + 1)
          }));
        } else if (isOnBreakRef.current) {
          setBreakTimer(prev => {
            const newTimer = prev - 1;
            if (newTimer <= 0) {
              endBreak();
              return 0;
            }
            return newTimer;
          });
        }
      }
    };
    return () => {
      workerRef.current.terminate();
    };
  }, []);

  // Update toggleTracking to only send start/stop commands
  const toggleTracking = () => {
    if (!isTracking) {
      setScreenTime(0); // Reset timer to 0 on start
      setIsTracking(true);
      setIsPaused(false);
      workerRef.current.postMessage({ command: 'start' });
      console.log('Tracking started');
      showNotification(
        "Tracking Started", 
        "Screen time tracking has begun.",
        false
      );
    } else {
      setIsTracking(false);
      setIsPaused(false);
      workerRef.current.postMessage({ command: 'stop' });
      console.log('Tracking stopped');
      showNotification(
        "Tracking Stopped", 
        "Screen time tracking has stopped.",
        false
      );
    }
  };

  // Load saved stats from localStorage
  useEffect(() => {
    const savedStats = localStorage.getItem('techBreaksStats');
    const savedSettings = localStorage.getItem('techBreaksSettings');
    
    if (savedStats) {
      const parsedStats = JSON.parse(savedStats);
      // Reset daily stats if it's a new day
      const today = new Date().toISOString().split('T')[0];
      if (parsedStats.lastUpdate !== today) {
        setStats(prev => ({
          ...prev,
          dailyScreenTime: 0,
          totalBreaks: 0,
          lastUpdate: today
        }));
      } else {
        setStats(parsedStats);
      }
    }

    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save stats to localStorage when updated
  useEffect(() => {
    localStorage.setItem('techBreaksStats', JSON.stringify(stats));
  }, [stats]);

  // Save settings to localStorage when updated
  useEffect(() => {
    localStorage.setItem('techBreaksSettings', JSON.stringify(settings));
  }, [settings]);

  // Remove document visibility change handler since we're using Web Worker
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only handle notifications when tab becomes visible
      if (!document.hidden && isTracking) {
        const screenTimeMinutes = screenTime / 60;
        if (screenTimeMinutes >= settings.maxScreenTime) {
          showNotification(
            "Maximum Screen Time Reached!", 
            "You've reached your maximum screen time limit. Consider taking a longer break.",
            true
          );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isTracking, screenTime, settings]);

  // Request notification permission on mount
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ("Notification" in window) {
        try {
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);
        } catch (error) {
          console.error('Error requesting notification permission:', error);
          setNotificationPermission('denied');
        }
      }
    };
    requestNotificationPermission();
  }, []);

  const showNotification = (title, body, playSound = false) => {
    if (settings.notificationsEnabled && notificationPermission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico'
        });
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  const startBreak = () => {
    setIsOnBreak(true);
    setIsPaused(true);
    setBreakTimer(settings.breakDuration * 60);
    setBreaks(prev => prev + 1);
    setLastBreak(0);
    
    // Select a random break activity
    const randomActivity = breakActivities[Math.floor(Math.random() * breakActivities.length)];
    setCurrentActivity(randomActivity);
    
    // Update statistics
    setStats(prev => ({
      ...prev,
      totalBreaks: prev.totalBreaks + 1,
      averageSessionLength: Math.round(prev.dailyScreenTime / (prev.totalBreaks + 1))
    }));

    showNotification(
      "Break Started", 
      `Taking a ${settings.breakDuration} minute break. ${randomActivity.activity}`,
      true
    );
  };

  const skipBreak = () => {
    endBreak();
    showNotification(
      "Break Skipped", 
      "Break skipped. Try to take your next break on time!",
      false
    );
  };

  const endBreak = () => {
    setIsOnBreak(false);
    setIsPaused(false);
    setBreakTimer(0);
    showNotification(
      "Break Time Over!", 
      "Time to get back to work. Remember to maintain good posture!",
      true
    );
  };

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  };

  const getRiskLevel = () => {
    const screenTimeMinutes = screenTime / 60; // Convert seconds to minutes
    if (screenTimeMinutes >= settings.maxScreenTime) return 'high';
    if (screenTimeMinutes >= settings.maxScreenTime * 0.7) return 'medium';
    return 'low';
  };

  const getRecommendations = () => {
    if (isOnBreak && currentActivity) {
      return [
        `${formatTime(breakTimer)} of break time remaining`,
        currentActivity.activity,
        "Stretch and move around",
        stats.waterReminders ? "Remember to stay hydrated" : "Take deep breaths"
      ];
    }

    const risk = getRiskLevel();
    const screenTimeMinutes = screenTime / 60;
    const timeLeft = settings.maxScreenTime - screenTimeMinutes;
    
    // Daily progress
    const dailyProgress = Math.round((stats.dailyScreenTime / (settings.dailyGoal * 60)) * 100);
    
    if (risk === 'high') {
      return [
        `Daily Goal: ${dailyProgress}% (${formatTime(stats.dailyScreenTime)})`,
        `You've exceeded your ${settings.maxScreenTime} minute limit`,
        "Please take a long break now",
        `Longest session today: ${formatTime(stats.longestSession)}`
      ];
    }
    if (risk === 'medium') {
      return [
        `Daily Goal: ${dailyProgress}% (${formatTime(stats.dailyScreenTime)})`,
        `${Math.ceil(timeLeft)} minutes until max screen time`,
        `Taken ${stats.totalBreaks} breaks today`,
        `Average session: ${formatTime(stats.averageSessionLength)}`
      ];
    }
    return [
      `Daily Goal: ${dailyProgress}% (${formatTime(stats.dailyScreenTime)})`,
      `${Math.ceil(timeLeft)} minutes until max screen time`,
      `Breaks today: ${stats.totalBreaks}`
    ];
  };

  return (
    <div className="app">
      <Helmet>
        <title>Calm Pulse</title>
        <meta name="description" content="Calm Pulse - Take care of your mental health while working" />
      </Helmet>
      <header className="app-header center-header">
        <div className="app-title rubik-doodle-font">
          <FiClock />
          Calm Pulse
        </div>
        <div className="header-actions">
          <button className="settings-button" onClick={() => setShowSettings(true)} title="Settings">
            <FiSettings />
          </button>
        </div>
      </header>
      {showSettings && (
        <div className="settings-modal">
          <div className="settings-content">
            <div className="settings-header">
              <h2>Settings</h2>
              <button onClick={() => setShowSettings(false)}><FiX /></button>
            </div>
            <div className="settings-body">
              <div className="setting-group">
                <h3>Time Limits</h3>
                <div className="setting-item">
                  <label>Maximum Screen Time (minutes)</label>
                  <input
                    type="number"
                    value={settings.maxScreenTime}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maxScreenTime: parseInt(e.target.value) || prev.maxScreenTime
                    }))}
                    min="30"
                  />
                </div>
                <div className="setting-item">
                  <label>Break Interval (minutes)</label>
                  <input
                    type="number"
                    value={settings.breakInterval}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      breakInterval: parseInt(e.target.value) || prev.breakInterval
                    }))}
                    min="15"
                  />
                </div>
                <div className="setting-item">
                  <label>Break Duration (minutes)</label>
                  <input
                    type="number"
                    value={settings.breakDuration}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      breakDuration: parseInt(e.target.value) || prev.breakDuration
                    }))}
                    min="1"
                  />
                </div>
                <div className="setting-item">
                  <label>Daily Screen Time Goal (minutes)</label>
                  <input
                    type="number"
                    value={settings.dailyGoal}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      dailyGoal: parseInt(e.target.value) || prev.dailyGoal
                    }))}
                    min="60"
                  />
                </div>
              </div>

              <div className="setting-group">
                <h3>Pomodoro Timer</h3>
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.pomodoroEnabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pomodoroEnabled: e.target.checked
                      }))}
                    />
                    Enable Pomodoro Timer
                  </label>
                </div>
                {settings.pomodoroEnabled && (
                  <>
                    <div className="setting-item">
                      <label>Work Duration (minutes)</label>
                      <input
                        type="number"
                        value={pomodoro.workDuration}
                        onChange={(e) => setPomodoro(prev => ({
                          ...prev,
                          workDuration: parseInt(e.target.value) || prev.workDuration
                        }))}
                        min="1"
                      />
                    </div>
                    <div className="setting-item">
                      <label>Break Duration (minutes)</label>
                      <input
                        type="number"
                        value={pomodoro.breakDuration}
                        onChange={(e) => setPomodoro(prev => ({
                          ...prev,
                          breakDuration: parseInt(e.target.value) || prev.breakDuration
                        }))}
                        min="1"
                      />
                    </div>
                    <div className="setting-item">
                      <label>Long Break Duration (minutes)</label>
                      <input
                        type="number"
                        value={pomodoro.longBreakDuration}
                        onChange={(e) => setPomodoro(prev => ({
                          ...prev,
                          longBreakDuration: parseInt(e.target.value) || prev.longBreakDuration
                        }))}
                        min="5"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="setting-group">
                <h3>Notifications</h3>
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notificationsEnabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationsEnabled: e.target.checked
                      }))}
                      disabled={notificationPermission !== 'granted'}
                    />
                    Enable Notifications
                    {notificationPermission !== 'granted' && (
                      <span className="permission-note">
                        {notificationPermission === 'denied' 
                          ? ' (Please enable notifications in your browser settings)'
                          : ' (Please allow notifications when prompted)'}
                      </span>
                    )}
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.waterReminders}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        waterReminders: e.target.checked
                      }))}
                    />
                    Water Break Reminders
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.exerciseReminders}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        exerciseReminders: e.target.checked
                      }))}
                    />
                    Exercise Reminders
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ width: '75%', padding: '20px', boxSizing: 'border-box' }}>
          <main className="app-main">
            <section className="tracking-section">
              <div className="tracking-stats">
                <div className="stat-card">
                  <FiClock className="stat-icon" />
                  <div className="stat-info">
                    <label>Screen Time</label>
                    <span className="stat-value">{formatTime(screenTime)}</span>
                    <span className="stat-subtext">Daily: {formatTime(stats.dailyScreenTime)}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <FiCoffee className="stat-icon" />
                  <div className="stat-info">
                    <label>Breaks Taken</label>
                    <span className="stat-value">{breaks}</span>
                    <span className="stat-subtext">Today: {stats.totalBreaks}</span>
                  </div>
                </div>

                <div className="stat-card">
                  <FiActivity className="stat-icon" />
                  <div className="stat-info">
                    <label>Last Break</label>
                    <span className="stat-value">{formatTime(lastBreak)} ago</span>
                    <span className="stat-subtext">Avg: {formatTime(stats.averageSessionLength)}</span>
                  </div>
                </div>
              </div>

              {settings.pomodoroEnabled && (
                <div className="pomodoro-status">
                  <FiTarget className="pomodoro-icon" />
                  <div className="pomodoro-info">
                    <span className="pomodoro-label">
                      {isOnBreak ? 'Break' : 'Work'} Session {pomodoro.currentSession + 1}/
                      {pomodoro.sessionsBeforeLongBreak}
                    </span>
                    <div className="pomodoro-progress">
                      <div 
                        className="progress-bar" 
                        style={{
                          width: `${(screenTime / (pomodoro.workDuration * 60)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="action-buttons">
                <button 
                  className={`tracking-button ${isTracking ? 'active' : ''}`}
                  onClick={toggleTracking}
                  disabled={isOnBreak}
                >
                  {isTracking ? <FiPause /> : <FiPlay />}
                  {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                </button>

                {isTracking && !isOnBreak && (
                  <button 
                    className="break-button"
                    onClick={startBreak}
                  >
                    <FiCoffee />
                    Take a Break
                  </button>
                )}

                {isOnBreak && (
                  <button 
                    className="skip-button"
                    onClick={skipBreak}
                  >
                    Skip Break
                  </button>
                )}
              </div>
            </section>

            <section className="status-section">
              <div className={`status-card ${getRiskLevel()}`}>
                <h2>Current Status</h2>
                <div className="status-info">
                  <p className="status-level">
                    {getRiskLevel() === 'low' && <FiCheckCircle />}
                    {getRiskLevel() === 'medium' && <FiAlertCircle />}
                    {getRiskLevel() === 'high' && <FiAlertCircle className="pulse" />}
                    {isOnBreak ? 'On Break' : `${getRiskLevel().charAt(0).toUpperCase() + getRiskLevel().slice(1)} Risk`}
                  </p>
                  {currentActivity && isOnBreak && (
                    <div className="current-activity">
                      {currentActivity.icon}
                      <p>{currentActivity.activity}</p>
                    </div>
                  )}
                  <div className="recommendations">
                    <h3>Recommendations</h3>
                    <ul>
                      {getRecommendations().map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
        <div style={{ width: '25%', padding: '20px', boxSizing: 'border-box' }}>
          <Home />
        </div>
      </div>
      <footer className="app-footer">
        <p>Take care of your digital wellbeing ❤️</p>
        <div className="footer-stats">
          <span>Weekly: {formatTime(stats.weeklyScreenTime)}</span>
        </div>
        <button 
          className="sound-toggle"
          onClick={() => setSettings(prev => ({
            ...prev,
            soundEnabled: !prev.soundEnabled
          }))}
        >
          {settings.soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
        </button>
      </footer>
    </div>
  );
}

export default App;
