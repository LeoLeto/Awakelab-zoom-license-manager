import { LicenseWithAssignment } from '../types/license.types';

interface LicenseDetailsModalProps {
  licenseData: LicenseWithAssignment;
  onClose: () => void;
}

export default function LicenseDetailsModal({ licenseData, onClose }: LicenseDetailsModalProps) {
  const { license, assignment } = licenseData;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 Detalles de la Licencia</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="modal-body">
          <div className="details-section">
            <h4>Información de la Licencia</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>Email:</label>
                <span>{license.email}</span>
              </div>
              
              <div className="detail-item">
                <label>Usuario Moodle:</label>
                <span>{license.usuarioMoodle}</span>
              </div>
              
              <div className="detail-item">
                <label>Clave Usuario Moodle:</label>
                <span>{license.claveUsuarioMoodle}</span>
              </div>
              
              <div className="detail-item">
                <label>Clave Anfitrión Zoom:</label>
                <span>{license.claveAnfitrionZoom}</span>
              </div>
              
              <div className="detail-item">
                <label>Contraseña Zoom:</label>
                <span>{license.passwordZoom}</span>
              </div>
              
              <div className="detail-item">
                <label>Contraseña Email:</label>
                <span>{license.passwordEmail}</span>
              </div>
              
              <div className="detail-item">
                <label>Estado:</label>
                <span className={`badge ${license.estado}`}>
                  {license.estado}
                </span>
              </div>
              
              {license.observaciones && (
                <div className="detail-item full-width">
                  <label>Observaciones:</label>
                  <span>{license.observaciones}</span>
                </div>
              )}
              
              <div className="detail-item">
                <label>Cuenta:</label>
                <span>{license.cuenta}</span>
              </div>
            </div>
          </div>

          {assignment && (
            <div className="details-section">
              <h4>Información de Asignación</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Nombre y Apellidos:</label>
                  <span>{assignment.nombreApellidos}</span>
                </div>
                
                <div className="detail-item">
                  <label>Correo Corporativo:</label>
                  <span>{assignment.correocorporativo}</span>
                </div>
                
                <div className="detail-item">
                  <label>Área:</label>
                  <span>{assignment.area}</span>
                </div>
                
                <div className="detail-item">
                  <label>Comunidad Autónoma:</label>
                  <span>{assignment.comunidadAutonoma}</span>
                </div>
                
                <div className="detail-item">
                  <label>Tipo de Uso (Plataforma):</label>
                  <span>{assignment.tipoUso}</span>
                </div>
                
                <div className="detail-item">
                  <label>Fecha Inicio Uso:</label>
                  <span>{new Date(assignment.fechaInicioUso).toLocaleDateString()}</span>
                </div>
                
                <div className="detail-item">
                  <label>Fecha Fin Uso:</label>
                  <span>{new Date(assignment.fechaFinUso).toLocaleDateString()}</span>
                </div>
                
                <div className="detail-item">
                  <label>Estado de Asignación:</label>
                  <span className={`badge ${assignment.estado}`}>
                    {assignment.estado}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="details-section">
            <h4>Información de Sistema</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>Fecha de Creación:</label>
                <span>{new Date(license.createdAt).toLocaleString()}</span>
              </div>
              
              <div className="detail-item">
                <label>Última Actualización:</label>
                <span>{new Date(license.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
