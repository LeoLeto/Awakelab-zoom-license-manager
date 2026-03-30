import { useState } from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '/icons/password.png',
    title: 'Gestión de Contraseñas',
    description: 'Cambia automáticamente las contraseñas de Zoom con generación segura',
  },
  {
    icon: '/icons/calendar.png',
    title: 'Seguimiento de Asignaciones',
    description: 'Monitorea qué usuarios están usando qué licencias y cuándo',
  },
  {
    icon: '/icons/clock.png',
    title: 'Expiración Automática',
    description: 'Las asignaciones expiran automáticamente con tareas programadas diarias',
  },
  {
    icon: '/icons/search.png',
    title: 'Verificación de Disponibilidad',
    description: 'Encuentra licencias disponibles para rangos de fechas específicos al instante',
  },
  {
    icon: '/icons/shield.png',
    title: 'Prevención de Conflictos',
    description: 'Previene reservas duplicadas con detección automática de conflictos',
  },
  {
    icon: '/icons/chart.png',
    title: 'Estadísticas en Tiempo Real',
    description: 'Visualiza la distribución del estado de licencias y análisis de uso',
  },
];

export default function HomePage() {
  const [slide, setSlide] = useState(0);

  const prev = () => setSlide((s) => (s - 1 + FEATURES.length) % FEATURES.length);
  const next = () => setSlide((s) => (s + 1) % FEATURES.length);
  const current = FEATURES[slide];

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
      </div>

      <div className="home-card info-carousel-card">
        <h2 className="info-carousel-title">Sobre el sistema</h2>
        <div className="info-carousel">
          <button className="carousel-arrow" onClick={prev} aria-label="Anterior">&lsaquo;</button>
          <div className="carousel-slide">
            <img src={current.icon} alt="" className="carousel-icon" />
            <strong className="carousel-feature-title">{current.title}</strong>
            <p className="carousel-feature-desc">{current.description}</p>
          </div>
          <button className="carousel-arrow" onClick={next} aria-label="Siguiente">&rsaquo;</button>
        </div>
      </div>

      <div className="powered-by">
        <img src="/images/powered-by.png" alt="Powered by Awakelab.world" />
      </div>
    </div>
  );
}
