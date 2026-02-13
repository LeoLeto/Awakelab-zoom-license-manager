import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>🎯 Zoom License Manager</h1>
        </div>
        <div className="nav-links">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            🏠 Home
          </Link>
          <Link 
            to="/admin" 
            className={location.pathname === '/admin' ? 'active' : ''}
          >
            🔧 Admin Dashboard
          </Link>
          <Link 
            to="/teacher" 
            className={location.pathname === '/teacher' ? 'active' : ''}
          >
            👨‍🏫 Teacher Portal
          </Link>
        </div>
      </div>
    </nav>
  );
}
