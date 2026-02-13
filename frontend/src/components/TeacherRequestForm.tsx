import { useState } from 'react';
import { assignmentApi, licenseApi } from '../services/api.service';
import { License } from '../types/license.types';

interface TeacherRequestFormProps {
  onSuccess?: () => void;
}

export default function TeacherRequestForm({ onSuccess }: TeacherRequestFormProps) {
  const [formData, setFormData] = useState({
    nombreApellidos: '',
    correocorporativo: '',
    area: '',
    comunidadAutonoma: '',
    tipoUso: '',
    fechaInicioUso: '',
    fechaFinUso: '',
  });
  const [availableLicenses, setAvailableLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const checkAvailability = async () => {
    if (!formData.fechaInicioUso || !formData.fechaFinUso) return;

    try {
      setCheckingAvailability(true);
      setError(null);
      const response = await licenseApi.getAvailableLicenses(
        formData.fechaInicioUso,
        formData.fechaFinUso
      );
      setAvailableLicenses(response.availableLicenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check availability');
      setAvailableLicenses([]);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      
      // Submit without licenseId - admin will assign it later
      await assignmentApi.createAssignment(formData);
      
      setSuccess(true);
      setFormData({
        nombreApellidos: '',
        correocorporativo: '',
        area: '',
        comunidadAutonoma: '',
        tipoUso: '',
        fechaInicioUso: '',
        fechaFinUso: '',
      });
      setAvailableLicenses([]);
      
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create license request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card success-message">
        <h3>✅ ¡Solicitud de Licencia Enviada Exitosamente!</h3>
        <p>Tu solicitud ha sido enviada al administrador y está pendiente de aprobación. Te notificaremos cuando se te asigne una licencia.</p>
        <button onClick={() => setSuccess(false)} className="btn-primary">
          Enviar Otra Solicitud
        </button>
      </div>
    );
  }

  return (
    <div className="teacher-request-form">
      <div className="card">
        <h2>📝 Solicitar una Licencia de Zoom</h2>
        <p className="form-description">
          Completa este formulario para solicitar una licencia de Zoom para tus necesidades docentes.
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="form-section">
            <h3>Información Personal</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombreApellidos">Nombre Completo *</label>
                <input
                  id="nombreApellidos"
                  type="text"
                  required
                  value={formData.nombreApellidos}
                  onChange={(e) => setFormData({ ...formData, nombreApellidos: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="form-group">
                <label htmlFor="correocorporativo">Email Corporativo *</label>
                <input
                  id="correocorporativo"
                  type="email"
                  required
                  value={formData.correocorporativo}
                  onChange={(e) => setFormData({ ...formData, correocorporativo: e.target.value })}
                  placeholder="juan.perez@ejemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="form-section">
            <h3>Información Laboral</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="area">Área/Departamento *</label>
                <input
                  id="area"
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="ej., Matemáticas, Ciencias, Idiomas"
                />
              </div>
              <div className="form-group">
                <label htmlFor="comunidadAutonoma">Comunidad Autónoma *</label>
                <select
                  id="comunidadAutonoma"
                  required
                  value={formData.comunidadAutonoma}
                  onChange={(e) => setFormData({ ...formData, comunidadAutonoma: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Andalucía">Andalucía</option>
                  <option value="Aragón">Aragón</option>
                  <option value="Asturias">Asturias</option>
                  <option value="Baleares">Baleares</option>
                  <option value="Canarias">Canarias</option>
                  <option value="Cantabria">Cantabria</option>
                  <option value="Castilla-La Mancha">Castilla-La Mancha</option>
                  <option value="Castilla y León">Castilla y León</option>
                  <option value="Cataluña">Cataluña</option>
                  <option value="Extremadura">Extremadura</option>
                  <option value="Galicia">Galicia</option>
                  <option value="La Rioja">La Rioja</option>
                  <option value="Madrid">Madrid</option>
                  <option value="Murcia">Murcia</option>
                  <option value="Navarra">Navarra</option>
                  <option value="País Vasco">País Vasco</option>
                  <option value="Valencia">Valencia</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="tipoUso">Tipo de Plataforma *</label>
              <select
                id="tipoUso"
                required
                value={formData.tipoUso}
                onChange={(e) => setFormData({ ...formData, tipoUso: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                <option value="Zoom Meetings">Zoom Meetings</option>
                <option value="Zoom Webinar">Zoom Webinar</option>
                <option value="Both">Ambos (Meetings y Webinar)</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="form-section">
            <h3>Período de Licencia</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fechaInicioUso">Fecha de Inicio *</label>
                <input
                  id="fechaInicioUso"
                  type="date"
                  required
                  value={formData.fechaInicioUso}
                  onChange={(e) => {
                    setFormData({ ...formData, fechaInicioUso: e.target.value });
                    setAvailableLicenses([]);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="fechaFinUso">Fecha de Fin *</label>
                <input
                  id="fechaFinUso"
                  type="date"
                  required
                  value={formData.fechaFinUso}
                  onChange={(e) => {
                    setFormData({ ...formData, fechaFinUso: e.target.value });
                    setAvailableLicenses([]);
                  }}
                  min={formData.fechaInicioUso || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {formData.fechaInicioUso && formData.fechaFinUso && (
              <div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={checkAvailability}
                  disabled={checkingAvailability}
                >
                  {checkingAvailability ? 'Verificando...' : '🔍 Verificar Disponibilidad (Opcional)'}
                </button>
                <small className="form-hint" style={{ display: 'block', marginTop: '8px' }}>
                  Esta verificación es solo informativa. Puedes enviar tu solicitud independientemente de la disponibilidad.
                </small>
              </div>
            )}
          </div>

          {/* Availability Information (Optional) */}
          {availableLicenses.length > 0 && (
            <div className="info" style={{ padding: '12px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px', color: '#155724' }}>
              ✅ Hay {availableLicenses.length} licencia(s) disponible(s) para tu período seleccionado. El administrador asignará una de ellas a tu solicitud.
            </div>
          )}

          {availableLicenses.length === 0 && formData.fechaInicioUso && formData.fechaFinUso && !checkingAvailability && (
            <div className="warning" style={{ padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px', color: '#856404' }}>
              ℹ️ Actualmente no hay licencias disponibles para el período seleccionado, pero puedes enviar tu solicitud de todos modos. El administrador gestionará la asignación.
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Enviando...' : '🚀 Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
