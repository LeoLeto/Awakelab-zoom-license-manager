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
  const [selectedLicense, setSelectedLicense] = useState('');
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
    
    if (!selectedLicense) {
      setError('Please select a license');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await assignmentApi.createAssignment({
        licenseId: selectedLicense,
        ...formData,
      });
      
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
      setSelectedLicense('');
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
        <h3>✅ License Request Submitted Successfully!</h3>
        <p>Your license has been assigned. You can view it in the "My Assignments" section.</p>
        <button onClick={() => setSuccess(false)} className="btn-primary">
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="teacher-request-form">
      <div className="card">
        <h2>📝 Request a Zoom License</h2>
        <p className="form-description">
          Fill out this form to request a Zoom license for your teaching needs.
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombreApellidos">Full Name *</label>
                <input
                  id="nombreApellidos"
                  type="text"
                  required
                  value={formData.nombreApellidos}
                  onChange={(e) => setFormData({ ...formData, nombreApellidos: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label htmlFor="correocorporativo">Corporate Email *</label>
                <input
                  id="correocorporativo"
                  type="email"
                  required
                  value={formData.correocorporativo}
                  onChange={(e) => setFormData({ ...formData, correocorporativo: e.target.value })}
                  placeholder="john.doe@example.com"
                />
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="form-section">
            <h3>Work Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="area">Area/Department *</label>
                <input
                  id="area"
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="e.g., Mathematics, Sciences, Languages"
                />
              </div>
              <div className="form-group">
                <label htmlFor="comunidadAutonoma">Autonomous Community *</label>
                <select
                  id="comunidadAutonoma"
                  required
                  value={formData.comunidadAutonoma}
                  onChange={(e) => setFormData({ ...formData, comunidadAutonoma: e.target.value })}
                >
                  <option value="">Select...</option>
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
              <label htmlFor="tipoUso">Platform Type *</label>
              <select
                id="tipoUso"
                required
                value={formData.tipoUso}
                onChange={(e) => setFormData({ ...formData, tipoUso: e.target.value })}
              >
                <option value="">Select...</option>
                <option value="Zoom Meetings">Zoom Meetings</option>
                <option value="Zoom Webinar">Zoom Webinar</option>
                <option value="Both">Both (Meetings & Webinar)</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="form-section">
            <h3>License Period</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fechaInicioUso">Start Date *</label>
                <input
                  id="fechaInicioUso"
                  type="date"
                  required
                  value={formData.fechaInicioUso}
                  onChange={(e) => {
                    setFormData({ ...formData, fechaInicioUso: e.target.value });
                    setSelectedLicense('');
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="fechaFinUso">End Date *</label>
                <input
                  id="fechaFinUso"
                  type="date"
                  required
                  value={formData.fechaFinUso}
                  onChange={(e) => {
                    setFormData({ ...formData, fechaFinUso: e.target.value });
                    setSelectedLicense('');
                  }}
                  min={formData.fechaInicioUso || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {formData.fechaInicioUso && formData.fechaFinUso && (
              <button
                type="button"
                className="btn-secondary"
                onClick={checkAvailability}
                disabled={checkingAvailability}
              >
                {checkingAvailability ? 'Checking...' : '🔍 Check Availability'}
              </button>
            )}
          </div>

          {/* Available Licenses */}
          {availableLicenses.length > 0 && (
            <div className="form-section">
              <h3>Available Licenses</h3>
              <div className="license-selection">
                <p className="success">
                  ✅ {availableLicenses.length} license(s) available for your selected period!
                </p>
                <div className="form-group">
                  <label htmlFor="license">Select a License *</label>
                  <select
                    id="license"
                    required
                    value={selectedLicense}
                    onChange={(e) => setSelectedLicense(e.target.value)}
                  >
                    <option value="">Choose one...</option>
                    {availableLicenses.map((license) => (
                      <option key={license._id} value={license._id}>
                        {license.usuarioMoodle} ({license.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {availableLicenses.length === 0 && formData.fechaInicioUso && formData.fechaFinUso && !checkingAvailability && (
            <div className="warning">
              ⚠️ No licenses available for the selected period. Please try different dates or contact an administrator.
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !selectedLicense}
            >
              {loading ? 'Submitting...' : '🚀 Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
