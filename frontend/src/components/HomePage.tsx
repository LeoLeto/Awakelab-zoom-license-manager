import { Link } from 'react-router-dom';
import { APP_VERSION } from '../version';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="hero">
        <h1>🎯 Gestor de Licencias Zoom <span className="version-badge">v{APP_VERSION}</span></h1>
        <p className="hero-subtitle">
          Panel de control integral para gestionar licencias de Zoom y sus cuentas Moodle correspondientes
        </p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🔧</div>
          <h3>Panel de Administración</h3>
          <p>
            Visualiza las licencias, gestiona asignaciones, cambia contraseñas
            y monitorea la disponibilidad de licencias en tiempo real.
          </p>
          <Link to="/admin" className="btn-primary">
            Ir al Panel de Administración →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">👨‍🏫</div>
          <h3>Portal de asignaciones</h3>
          <p>
            Solicita licencias de Zoom para rangos de fechas específicos,
            visualiza tus asignaciones actuales y gestiona tu acceso.
          </p>
          <Link to="/teacher" className="btn-primary">
            Ir al Portal de asignaciones →
          </Link>
        </div>
      </div>

      <div className="info-section">
        <h2>✨ Características Principales</h2>
        <div className="features-list">
          <div className="feature-item">
            <span className="feature-bullet">🔐</span>
            <div>
              <strong>Gestión de Contraseñas</strong>
              <p>Cambia automáticamente las contraseñas de Zoom con generación segura</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">📅</span>
            <div>
              <strong>Seguimiento de Asignaciones</strong>
              <p>Monitorea qué usuarios están usando qué licencias y cuándo</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">⏰</span>
            <div>
              <strong>Expiración Automática</strong>
              <p>Las asignaciones expiran automáticamente con tareas programadas diarias</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">🔍</span>
            <div>
              <strong>Verificación de Disponibilidad</strong>
              <p>Encuentra licencias disponibles para rangos de fechas específicos al instante</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">🚫</span>
            <div>
              <strong>Prevención de Conflictos</strong>
              <p>Previene reservas duplicadas con detección automática de conflictos</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-bullet">📊</span>
            <div>
              <strong>Estadísticas en Tiempo Real</strong>
              <p>Visualiza la distribución del estado de licencias y análisis de uso</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
