import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();

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
        </div>
      </div>
    </nav>
  );
}
