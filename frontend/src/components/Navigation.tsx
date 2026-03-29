import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_VERSION } from '../version';

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
          <Link to="/">
            <img src="/images/logo-white.png" alt="Zoom Manager" className="nav-brand-logo" />
          </Link>
          <span className="version-badge">v{APP_VERSION}</span>
        </div>
        <div className="nav-links">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            Inicio
          </Link>
          <Link 
            to="/admin" 
            className={location.pathname === '/admin' ? 'active' : ''}
          >
            Panel de Administración
          </Link>
          <Link 
            to="/teacher" 
            className={location.pathname === '/teacher' ? 'active' : ''}
          >
            Portal de asignaciones
          </Link>
          
          {isAuthenticated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ 
                color: 'white', 
                fontSize: '0.9em',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                background: 'rgba(255,255,255,0.15)',
              }}>
                {admin?.username}
              </span>
              <button 
                onClick={handleLogout}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
