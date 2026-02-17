import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, admin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>🎯 Gestor de Licencias Zoom</h1>
        </div>
        <div className="nav-links">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            🏠 Inicio
          </Link>
          <Link 
            to="/admin" 
            className={location.pathname === '/admin' ? 'active' : ''}
          >
            🔧 Panel de Administración
          </Link>
          <Link 
            to="/teacher" 
            className={location.pathname === '/teacher' ? 'active' : ''}
          >
            👨‍🏫 Portal del Profesor
          </Link>
          
          {isAuthenticated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ 
                color: '#2563eb', 
                fontSize: '0.9em',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                background: '#f1f5f9',
              }}>
                👤 {admin?.username}
              </span>
              <button 
                onClick={handleLogout}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
