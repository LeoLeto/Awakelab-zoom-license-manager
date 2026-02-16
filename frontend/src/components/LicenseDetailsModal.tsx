import { LicenseWithAssignment } from '../types/license.types';
import { useState } from 'react';
import { HistoryViewer } from './HistoryViewer';

interface LicenseDetailsModalProps {
  licenseData: LicenseWithAssignment;
  onClose: () => void;
}

export default function LicenseDetailsModal({ licenseData, onClose }: LicenseDetailsModalProps) {
  const { license, assignment } = licenseData;
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 Detalles de la Licencia</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={activeTab === 'details' ? 'tab-active' : ''} 
            onClick={() => setActiveTab('details')}
          >
            📄 Detalles
          </button>
          <button 
            className={activeTab === 'history' ? 'tab-active' : ''} 
            onClick={() => setActiveTab('history')}
          >
            📜 Historial
          </button>
        </div>
        
        <div className="modal-body">{activeTab === 'details' ? (
          <>
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
          </>
          ) : (
            <div className="history-section">
              <HistoryViewer 
                entityType="license" 
                entityId={license._id} 
                showFilters={false}
                title="Historial de esta Licencia"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>

        <style>{`
          .modal-tabs {
            display: flex;
            gap: 10px;
            padding: 10px 20px;
            background: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
          }

          .modal-tabs button {
            padding: 10px 20px;
            border: none;
            background: transparent;
            color: #6c757d;
            font-weight: 500;
            cursor: pointer;
            border-radius: 4px 4px 0 0;
            transition: all 0.3s;
          }

          .modal-tabs button:hover {
            background: #e9ecef;
            color: #495057;
          }

          .modal-tabs button.tab-active {
            background: white;
            color: #007bff;
            border-bottom: 3px solid #007bff;
          }

          .history-section {
            max-height: 500px;
            overflow-y: auto;
            padding: 10px;
          }
        `}</style>
      </div>
    </div>
  );
}
