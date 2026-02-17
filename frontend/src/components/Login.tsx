import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '450px', margin: '2rem auto' }}>
      <div className="card">
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '0.5rem',
          color: 'var(--gray-900)',
          fontSize: '1.75rem'
        }}>
          🔐 Inicio de Sesión
        </h2>
        <p style={{ 
          textAlign: 'center', 
          color: 'var(--gray-600)', 
          marginBottom: '2rem',
          fontSize: '0.95rem'
        }}>
          Acceso al Panel de Administración
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">
              Usuario
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              autoFocus
              placeholder="Ingresa tu usuario"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Ingresa tu contraseña"
            />
          </div>

          {error && (
            <div style={{ 
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--border-radius)',
              color: '#991b1b',
              fontSize: '0.9rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '1rem', padding: '0.75rem' }}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Iniciando sesión...' : '🚀 Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
