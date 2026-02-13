import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="hero">
        <h1>🎯 Zoom License Manager</h1>
        <p className="hero-subtitle">
          Comprehensive dashboard for managing 170 Zoom licenses and their corresponding Moodle accounts
        </p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🔧</div>
          <h3>Admin Dashboard</h3>
          <p>
            View all 170 licenses, manage assignments, change passwords,
            and monitor license availability in real-time.
          </p>
          <Link to="/admin" className="btn-primary">
            Go to Admin Dashboard →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">👨‍🏫</div>
          <h3>Teacher Portal</h3>
          <p>
            Request Zoom licenses for specific date ranges,
            view your current assignments, and manage your access.
          </p>
          <Link to="/teacher" className="btn-primary">
            Go to Teacher Portal →
          </Link>
        </div>
      </div>

      <div className="info-section">
        <h2>✨ Key Features</h2>
        <div className="features-list">
          <div className="feature-item">
            <span className="feature-bullet">🔐</span>
            <div>
              <strong>Password Management</strong>
              <p>Automatically change Zoom passwords with secure generation</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">📅</span>
            <div>
              <strong>Assignment Tracking</strong>
              <p>Monitor which teachers are using which licenses and when</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">⏰</span>
            <div>
              <strong>Automatic Expiration</strong>
              <p>Assignments expire automatically with daily cron jobs</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">🔍</span>
            <div>
              <strong>Availability Check</strong>
              <p>Find available licenses for specific date ranges instantly</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">🚫</span>
            <div>
              <strong>Conflict Prevention</strong>
              <p>Prevent double-booking with automatic conflict detection</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">📊</span>
            <div>
              <strong>Real-time Statistics</strong>
              <p>View license status distribution and usage analytics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="tech-stack">
        <h3>🛠️ Tech Stack</h3>
        <div className="tech-badges">
          <span className="tech-badge">React + TypeScript</span>
          <span className="tech-badge">Node.js + Express</span>
          <span className="tech-badge">MongoDB</span>
          <span className="tech-badge">Zoom API</span>
          <span className="tech-badge">Vite</span>
        </div>
      </div>
    </div>
  );
}
