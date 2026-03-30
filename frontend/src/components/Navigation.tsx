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
        </div>

        {isAuthenticated && (
          <div className="nav-auth">
            <span className="nav-username">
              {admin?.username}
            </span>
            <button 
              onClick={handleLogout}
              className="nav-logout-btn"
              onMouseEnter={(e) => e.currentTarget.style.background = '#2a9198'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#35B3BA'}
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
