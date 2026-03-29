import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-card">
        <img src="/images/logo-blue.png" alt="Zoom Manager" className="home-logo" />
        <div className="hero">
          <h1>Gestor de licencias</h1>
          <p className="hero-subtitle">
            Panel de control integral para gestionar licencias de Zoom y sus cuentas Moodle correspondientes
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <img src="/icons/monitor.png" alt="" />
            </div>
            <h3>Panel de Administración</h3>
            <p>
              Visualiza las licencias, gestiona asignaciones, cambia contraseñas
              y monitorea la disponibilidad de licencias en tiempo real.
            </p>
            <Link to="/admin" className="btn-primary">
              Administrador
            </Link>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <img src="/icons/calendar.png" alt="" />
            </div>
            <h3>Portal de asignaciones</h3>
            <p>
              Solicita licencias de Zoom para rangos de fechas específicos,
              visualiza tus asignaciones actuales y gestiona tu acceso.
            </p>
            <Link to="/teacher" className="btn-primary">
              Asignaciones
            </Link>
          </div>
        </div>

        <div className="info-section">
          <h2>sobre el sistema</h2>
          <div className="features-list">
            <div className="feature-item">
              <span className="feature-bullet">
                <img src="/icons/password.png" alt="" />
              </span>
              <div>
                <strong>Gestión de Contraseñas</strong>
                <p>Cambia automáticamente las contraseñas de Zoom con generación segura</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-bullet">
                <img src="/icons/calendar.png" alt="" />
              </span>
              <div>
                <strong>Seguimiento de Asignaciones</strong>
                <p>Monitorea qué usuarios están usando qué licencias y cuándo</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-bullet">
                <img src="/icons/clock.png" alt="" />
              </span>
              <div>
                <strong>Expiración Automática</strong>
                <p>Las asignaciones expiran automáticamente con tareas programadas diarias</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-bullet">
                <img src="/icons/search.png" alt="" />
              </span>
              <div>
                <strong>Verificación de Disponibilidad</strong>
                <p>Encuentra licencias disponibles para rangos de fechas específicos al instante</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-bullet">
                <img src="/icons/shield.png" alt="" />
              </span>
              <div>
                <strong>Prevención de Conflictos</strong>
                <p>Previene reservas duplicadas con detección automática de conflictos</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-bullet">
                <img src="/icons/chart.png" alt="" />
              </span>
              <div>
                <strong>Estadísticas en Tiempo Real</strong>
                <p>Visualiza la distribución del estado de licencias y análisis de uso</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="powered-by">
        <img src="/images/powered-by.png" alt="Powered by Awakelab.world" />
      </div>
    </div>
  );
}
