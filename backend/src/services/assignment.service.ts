import { Assignment, IAssignment } from '../models/Assignment.model';
import { License } from '../models/License.model';
import { Types } from 'mongoose';
import { HistoryService } from './history.service';
import { emailService } from './email.service';
import { settingsService } from './settings.service';
import zoomService from './zoom.service';
import { licenseService } from './license.service';

const MAX_ASSIGNMENT_DAYS = 365;

const toIsoDay = (d: Date) => d.toISOString().split('T')[0];

/** e.g. "18 de junio de 2027" — dates are stored in UTC day boundaries */
const formatLongDate = (d: Date) =>
  d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** e.g. "5-11-2027": same format as the other emails, read in UTC */
const formatShortDate = (d: Date | string) => new Date(d).toLocaleDateString('es-CL', { timeZone: 'UTC' });

export class AssignmentService {
  /**
   * Get all assignments
   */
  async getAllAssignments(): Promise<IAssignment[]> {
    return await Assignment.find()
      .populate('licenseId')
      .sort({ createdAt: -1 });
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(id: string): Promise<IAssignment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de asignación inválido');
    }
    return await Assignment.findById(id).populate('licenseId');
  }

  /**
   * Get assignments for a license
   */
  async getAssignmentsByLicense(licenseId: string): Promise<IAssignment[]> {
    if (!Types.ObjectId.isValid(licenseId)) {
      throw new Error('ID de licencia inválido');
    }
    return await Assignment.find({ licenseId: new Types.ObjectId(licenseId) })
      .sort({ createdAt: -1 });
  }

  /**
   * Get active assignments
   */
  async getActiveAssignments(): Promise<IAssignment[]> {
    const now = new Date();
    return await Assignment.find({
      estado: 'activo',
      fechaInicioUso: { $lte: now },
      fechaFinUso: { $gte: now }
    })
      .populate('licenseId')
      .sort({ fechaFinUso: 1 });
  }

  /**
   * Get pending assignments (awaiting license assignment)
   */
  async getPendingAssignments(): Promise<IAssignment[]> {
    return await Assignment.find({
      estado: 'pendiente'
    })
      .sort({ createdAt: -1 });
  }

  /**
   * Get assignments by teacher email
   */
  async getAssignmentsByTeacher(email: string): Promise<IAssignment[]> {
    return await Assignment.find({ 
      correocorporativo: email.toLowerCase() 
    })
      .populate('licenseId')
      .sort({ createdAt: -1 });
  }

  /**
   * Admin manual assignment of one or more licenses to the same person for the
   * same period. Mirrors what approving a request does, but grouped:
   *  - starts within 48h → each Zoom password is rotated now and ONE email with
   *    every license's credentials is sent immediately (plus one admin copy);
   *  - starts later → ONE reservation email now (no Zoom passwords); the 48h
   *    cron rotates the passwords and sends ONE credentials email later.
   * Every license is validated before anything is created, so a conflict
   * never leaves a half-made batch.
   */
  async createManualAssignments(
    assignmentData: Partial<IAssignment>,
    licenseIds: string[],
    actor: string
  ): Promise<{ assignments: IAssignment[]; credentialsPending: boolean; emailSent: boolean }> {
    const ids = [...new Set((licenseIds || []).map(String))];
    if (ids.length === 0) {
      throw new Error('Selecciona al menos una licencia');
    }
    if (!ids.every((id) => Types.ObjectId.isValid(id))) {
      throw new Error('ID de licencia inválido');
    }
    if (!assignmentData.fechaInicioUso || !assignmentData.fechaFinUso) {
      throw new Error('Las fechas de inicio y fin son obligatorias');
    }

    const start = new Date(assignmentData.fechaInicioUso);
    const end = new Date(assignmentData.fechaFinUso);
    end.setUTCHours(23, 59, 59, 999);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new Error('Las fechas indicadas no son válidas');
    }
    if (end.getTime() - start.getTime() > MAX_ASSIGNMENT_DAYS * 24 * 60 * 60 * 1000) {
      throw new Error('El período máximo de una licencia es de 1 año (365 días).');
    }

    // Validate the whole batch first
    const licenses = await License.find({ _id: { $in: ids } });
    if (licenses.length !== ids.length) {
      throw new Error('Alguna de las licencias seleccionadas no existe');
    }
    const inMaintenance = licenses.filter((l) => l.estado === 'mantenimiento');
    if (inMaintenance.length > 0) {
      throw new Error(`Licencia en mantenimiento: ${inMaintenance.map((l) => l.email).join(', ')}`);
    }
    const conflicts = await Assignment.find({
      licenseId: { $in: ids },
      estado: 'activo',
      fechaInicioUso: { $lte: end },
      fechaFinUso: { $gte: start },
    }).populate('licenseId');
    if (conflicts.length > 0) {
      const taken = [...new Set(conflicts.map((c: any) => c.licenseId?.email).filter(Boolean))];
      throw new Error(`No disponibles para el rango de fechas solicitado: ${taken.join(', ')}`);
    }

    const created: IAssignment[] = [];
    for (const id of ids) {
      created.push(
        await this.createAssignment(
          { ...assignmentData, licenseId: id as any, isExtension: false, originalAssignmentId: undefined },
          actor
        )
      );
    }

    const hoursUntilStart = (start.getTime() - Date.now()) / (1000 * 60 * 60);
    const credentialsPending = hoursUntilStart > 48;
    const byId = new Map(licenses.map((l) => [l._id.toString(), l]));
    const credentials = [];

    for (const assignment of created) {
      const license = byId.get(String(assignment.licenseId))!;
      let zoomPassword: string | undefined;
      if (!credentialsPending) {
        zoomPassword = await this.refreshLicensePassword(license.email, license.passwordEmail);
        await Assignment.findByIdAndUpdate(assignment._id, { $set: { credentialsSent: true } });
      }
      credentials.push({
        licenseEmail: license.email,
        zoomPassword,
        hostKey: license.claveAnfitrionZoom,
        moodleUser: license.usuarioMoodle,
        moodlePassword: license.claveUsuarioMoodle,
      });
    }

    let emailSent = false;
    try {
      emailSent = await emailService.sendMultiAssignmentConfirmation({
        teacherName: created[0].nombreApellidos,
        teacherEmail: created[0].correocorporativo,
        startDate: start.toLocaleDateString('es-CL', { timeZone: 'UTC' }),
        endDate: end.toLocaleDateString('es-CL', { timeZone: 'UTC' }),
        platform: created[0].tipoUso,
        credentialsPending,
        licenses: credentials.sort((a, b) =>
          a.licenseEmail.localeCompare(b.licenseEmail, 'es', { numeric: true })
        ),
      });
    } catch (error: any) {
      console.error('Failed to send manual assignment email:', error.message);
    }

    return { assignments: created, credentialsPending, emailSent };
  }

  /**
   * Set a fresh Zoom password for a license (Zoom + DB). Falls back to the
   * stored password if Zoom rejects the change, same as approving a request.
   */
  private async refreshLicensePassword(licenseEmail: string, storedPassword?: string): Promise<string | undefined> {
    try {
      const fresh = zoomService.generateSecurePassword();
      await zoomService.changeUserPassword(licenseEmail, fresh);
      await licenseService.updatePasswordByEmail(licenseEmail, fresh);
      // Respect Zoom API rate limits on batches
      await new Promise((resolve) => setTimeout(resolve, 500));
      return fresh;
    } catch (error: any) {
      console.error(`Failed to refresh Zoom password for ${licenseEmail}, using stored password:`, error.message);
      return storedPassword;
    }
  }

  /**
   * Create a new assignment
   */
  async createAssignment(assignmentData: Partial<IAssignment>, actor: string = 'system'): Promise<IAssignment> {
    // Normalize fechaFinUso to end-of-day so the final day is fully included in active queries
    if (assignmentData.fechaFinUso) {
      const d = new Date(assignmentData.fechaFinUso);
      d.setUTCHours(23, 59, 59, 999);
      assignmentData = { ...assignmentData, fechaFinUso: d };
    }

    // If licenseId is provided, validate and check availability
    if (assignmentData.licenseId) {
      // Validate license exists
      const license = await License.findById(assignmentData.licenseId);
      if (!license) {
        throw new Error('Licencia no encontrada');
      }

      // Check if license is available for the requested dates
      const overlappingAssignments = await Assignment.find({
        licenseId: assignmentData.licenseId,
        estado: 'activo',
        $or: [
          {
            fechaInicioUso: { $lte: assignmentData.fechaFinUso },
            fechaFinUso: { $gte: assignmentData.fechaInicioUso }
          }
        ]
      });

      if (overlappingAssignments.length > 0) {
        throw new Error('La licencia no está disponible para el rango de fechas solicitado');
      }
    }

    // Set estado based on whether licenseId is provided
    const estado = assignmentData.licenseId ? 'activo' : 'pendiente';
    
    const assignment = new Assignment({
      ...assignmentData,
      estado
    });
    const savedAssignment = await assignment.save();

    // Update license status to 'ocupado' only if licenseId is provided
    // and the assignment starts within the next 48 hours
    if (assignmentData.licenseId) {
      const startDate = new Date(assignmentData.fechaInicioUso!);
      const hoursUntilStart = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilStart > 48) {
        // >48h away — license stays libre; credentials sent later by cron
        savedAssignment.credentialsSent = false;
        await savedAssignment.save();
      } else {
        // ≤48h — lock the license immediately
        await License.findByIdAndUpdate(
          assignmentData.licenseId,
          { $set: { estado: 'ocupado' } }
        );
      }

      // Record assignment action
      await HistoryService.recordChange({
        entityType: 'assignment',
        entityId: savedAssignment._id,
        action: 'assign',
        actor,
        changes: [
          { field: 'licenseId', newValue: assignmentData.licenseId },
          { field: 'nombreApellidos', newValue: savedAssignment.nombreApellidos },
          { field: 'estado', newValue: estado },
          { field: 'fechaInicioUso', newValue: savedAssignment.fechaInicioUso },
          { field: 'fechaFinUso', newValue: savedAssignment.fechaFinUso },
        ],
        metadata: {
          assignmentName: savedAssignment.nombreApellidos,
        },
      });
    } else {
      // Record create action for pending assignment
      await HistoryService.recordChange({
        entityType: 'assignment',
        entityId: savedAssignment._id,
        action: 'create',
        actor,
        changes: [
          { field: 'nombreApellidos', newValue: savedAssignment.nombreApellidos },
          { field: 'estado', newValue: estado },
          { field: 'fechaInicioUso', newValue: savedAssignment.fechaInicioUso },
          { field: 'fechaFinUso', newValue: savedAssignment.fechaFinUso },
        ],
        metadata: {
          assignmentName: savedAssignment.nombreApellidos,
        },
      });
      
      // Send notification to admins about new pending request
      const notifyOnNewRequest = await settingsService.getSetting('notifyOnNewRequest');
      if (notifyOnNewRequest) {
        try {
          await emailService.sendPendingRequestNotification(
            savedAssignment.nombreApellidos,
            savedAssignment.correocorporativo,
            new Date(savedAssignment.fechaInicioUso).toLocaleDateString('es-CL'),
            new Date(savedAssignment.fechaFinUso).toLocaleDateString('es-CL'),
            savedAssignment.area,
            !!savedAssignment.isExtension
          );
        } catch (error: any) {
          console.error('Failed to send pending request notification:', error.message);
        }
      }
    }

    return savedAssignment;
  }

  /**
   * Update assignment
   */
  async updateAssignment(id: string, updateData: Partial<IAssignment>, actor: string = 'system'): Promise<IAssignment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de asignación inválido');
    }

    const existingAssignment = await Assignment.findById(id);
    if (!existingAssignment) {
      throw new Error('Asignación no encontrada');
    }

    // Normalize fechaFinUso to end-of-day so the final day is fully included in active queries
    if (updateData.fechaFinUso) {
      const d = new Date(updateData.fechaFinUso);
      d.setUTCHours(23, 59, 59, 999);
      updateData = { ...updateData, fechaFinUso: d };
    }

    const oldLicenseId = existingAssignment.licenseId;
    let isAssigningLicense = false;

    // Detect extension: end date pushed forward on an already-active assignment
    const isExtension =
      !!updateData.fechaFinUso &&
      !!existingAssignment.licenseId &&
      new Date(updateData.fechaFinUso) > new Date(existingAssignment.fechaFinUso);

    // If licenseId is being assigned (for pending requests)
    if (updateData.licenseId && !existingAssignment.licenseId) {
      isAssigningLicense = true;
      
      // Validate license exists
      const license = await License.findById(updateData.licenseId);
      if (!license) {
        throw new Error('Licencia no encontrada');
      }

      // Check if license is available for the assignment dates
      const overlappingAssignments = await Assignment.find({
        _id: { $ne: id },
        licenseId: updateData.licenseId,
        estado: 'activo',
        $or: [
          {
            fechaInicioUso: { $lte: existingAssignment.fechaFinUso },
            fechaFinUso: { $gte: existingAssignment.fechaInicioUso }
          }
        ]
      });

      if (overlappingAssignments.length > 0) {
        throw new Error('La licencia no está disponible para el rango de fechas solicitado');
      }

      const assignStartDate = new Date(existingAssignment.fechaInicioUso);
      const hoursUntilStart = (assignStartDate.getTime() - Date.now()) / (1000 * 60 * 60);

      if (existingAssignment.isExtension) {
        // Extension: the teacher reuses the SAME license and its existing
        // credentials. The Zoom password must NEVER be rotated for an
        // extension (doing so would break the teacher's in-progress access).
        // The license is already occupied by the original assignment, so keep
        // it locked and mark credentials as handled so the 48h cron skips it.
        await License.findByIdAndUpdate(
          updateData.licenseId,
          { $set: { estado: 'ocupado' } }
        );
        (updateData as any).credentialsSent = true;
      } else if (hoursUntilStart > 48) {
        // >48h away — license stays libre; credentials sent later by cron
        (updateData as any).credentialsSent = false;
      } else {
        // ≤48h — lock the license immediately
        await License.findByIdAndUpdate(
          updateData.licenseId,
          { $set: { estado: 'ocupado' } }
        );
      }

      // Set estado to 'activo' when assigning a license
      updateData.estado = 'activo';
    }

    // If dates are being updated, check for conflicts
    if (updateData.fechaInicioUso || updateData.fechaFinUso) {
      const startDate = updateData.fechaInicioUso || existingAssignment.fechaInicioUso;
      const endDate = updateData.fechaFinUso || existingAssignment.fechaFinUso;
      const licenseToCheck = updateData.licenseId || existingAssignment.licenseId;

      if (licenseToCheck) {
        const overlappingAssignments = await Assignment.find({
          _id: { $ne: id },
          licenseId: licenseToCheck,
          estado: 'activo',
          $or: [
            {
              fechaInicioUso: { $lte: endDate },
              fechaFinUso: { $gte: startDate }
            }
          ]
        });

        if (overlappingAssignments.length > 0) {
          throw new Error('Las fechas actualizadas entran en conflicto con asignaciones existentes');
        }
      }
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('licenseId');

    if (updatedAssignment) {
      // Track changes
      const fieldsToTrack = [
        'licenseId', 'nombreApellidos', 'correocorporativo', 'area',
        'comunidadAutonoma', 'tipoUso', 'fechaInicioUso', 'fechaFinUso', 'estado'
      ];

      const changes = HistoryService.extractChanges(
        existingAssignment.toObject(),
        updatedAssignment.toObject(),
        fieldsToTrack
      );

      if (changes.length > 0) {
        // Determine action type
        let action: 'update' | 'assign' | 'unassign' | 'status_change' = 'update';
        
        if (isAssigningLicense) {
          action = 'assign';
        } else if (changes.some(c => c.field === 'licenseId')) {
          action = oldLicenseId ? 'unassign' : 'assign';
        } else if (changes.some(c => c.field === 'estado')) {
          action = 'status_change';
        }

        await HistoryService.recordChange({
          entityType: 'assignment',
          entityId: updatedAssignment._id,
          action,
          actor,
          changes,
          metadata: {
            assignmentName: updatedAssignment.nombreApellidos,
          },
        });
        
        // Send email confirmation when assigning license to pending request
        if (isAssigningLicense && updatedAssignment.licenseId) {
          try {
            const license = await License.findById(updatedAssignment.licenseId);
            if (license) {
              if (updatedAssignment.isExtension) {
                // Extension: the teacher keeps the same license and the same
                // credentials. Send the EXTENSION email with the existing
                // stored password — never rotate the Zoom password here.
                await emailService.sendExtensionConfirmation({
                  teacherName: updatedAssignment.nombreApellidos,
                  teacherEmail: updatedAssignment.correocorporativo,
                  licenseEmail: license.email,
                  startDate: new Date(updatedAssignment.fechaInicioUso).toLocaleDateString('es-CL'),
                  endDate: new Date(updatedAssignment.fechaFinUso).toLocaleDateString('es-CL'),
                  platform: updatedAssignment.tipoUso,
                  zoomPassword: license.passwordEmail,
                  hostKey: license.claveAnfitrionZoom,
                  moodleUser: license.usuarioMoodle,
                  moodlePassword: license.claveUsuarioMoodle,
                });
              } else {
                const startDate = new Date(updatedAssignment.fechaInicioUso);
                const hoursUntilStart = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);

                if (hoursUntilStart > 48) {
                  // Assignment starts in >48h — send confirmation WITHOUT
                  // password; credentials will be sent 48h before by cron.
                  await emailService.sendAssignmentConfirmation({
                    teacherName: updatedAssignment.nombreApellidos,
                    teacherEmail: updatedAssignment.correocorporativo,
                    licenseEmail: license.email,
                    startDate: startDate.toLocaleDateString('es-CL'),
                    endDate: new Date(updatedAssignment.fechaFinUso).toLocaleDateString('es-CL'),
                    platform: updatedAssignment.tipoUso,
                    hostKey: license.claveAnfitrionZoom,
                    moodleUser: license.usuarioMoodle,
                    moodlePassword: license.claveUsuarioMoodle,
                    credentialsPending: true,
                  });
                } else {
                  // Assignment starts within 48h — generate a fresh
                  // password and send credentials immediately.
                  let freshPassword = license.passwordEmail;
                  try {
                    freshPassword = zoomService.generateSecurePassword();
                    await zoomService.changeUserPassword(license.email, freshPassword);
                    await licenseService.updatePasswordByEmail(license.email, freshPassword);
                    console.log(`🔑 Password refreshed for ${license.email} during assignment`);
                  } catch (pwdError: any) {
                    console.error(`Failed to refresh Zoom password for ${license.email}, using stored password:`, pwdError.message);
                  }

                  await emailService.sendAssignmentConfirmation({
                    teacherName: updatedAssignment.nombreApellidos,
                    teacherEmail: updatedAssignment.correocorporativo,
                    licenseEmail: license.email,
                    startDate: startDate.toLocaleDateString('es-CL'),
                    endDate: new Date(updatedAssignment.fechaFinUso).toLocaleDateString('es-CL'),
                    platform: updatedAssignment.tipoUso,
                    zoomPassword: freshPassword,
                    hostKey: license.claveAnfitrionZoom,
                    moodleUser: license.usuarioMoodle,
                    moodlePassword: license.claveUsuarioMoodle,
                  });
                }
              }
            }
          } catch (error: any) {
            console.error('Failed to send assignment confirmation email:', error.message);
          }
        }

        // Send extension confirmation email when end date is pushed forward
        if (isExtension && updatedAssignment.licenseId) {
          try {
            const license = await License.findById(updatedAssignment.licenseId);
            if (license) {
              await emailService.sendExtensionConfirmation({
                teacherName: updatedAssignment.nombreApellidos,
                teacherEmail: updatedAssignment.correocorporativo,
                licenseEmail: license.email,
                startDate: new Date(updatedAssignment.fechaInicioUso).toLocaleDateString('es-CL'),
                endDate: new Date(updatedAssignment.fechaFinUso).toLocaleDateString('es-CL'),
                platform: updatedAssignment.tipoUso,
                zoomPassword: license.passwordEmail,
                hostKey: license.claveAnfitrionZoom,
                moodleUser: license.usuarioMoodle,
                moodlePassword: license.claveUsuarioMoodle,
              });
            }
          } catch (error: any) {
            console.error('Failed to send extension confirmation email:', error.message);
          }
        }
      }
    }

    return updatedAssignment;
  }

  /**
   * Cancel one assignment (admin). A pending request is just cancelled. For an
   * assignment with a license:
   *  - the person is emailed (plus admin copy) unless notify === false;
   *  - if the credentials were already sent, the Zoom password is changed so
   *    they cannot keep using the account — unless another assignment of the
   *    same license already holds those same credentials;
   *  - the license status is recomputed from what is left on it.
   */
  async cancelAssignment(
    id: string,
    actor: string = 'system',
    options: { notify?: boolean } = {}
  ): Promise<{ assignment: IAssignment; emailSent: boolean; passwordRotated: boolean; rotationSkipped?: string } | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de asignación inválido');
    }

    const existingAssignment = await Assignment.findById(id);
    if (!existingAssignment) {
      return null;
    }
    if (existingAssignment.estado === 'cancelado') {
      throw new Error('Esta asignación ya está cancelada');
    }

    // findByIdAndUpdate (not .save()) so legacy tipoUso values are not re-validated
    const assignment = await Assignment.findByIdAndUpdate(
      id,
      { $set: { estado: 'cancelado' } },
      { new: true }
    );
    if (!assignment) return null;

    let emailSent = false;
    let passwordRotated = false;
    let rotationSkipped: string | undefined;
    const licenseId = existingAssignment.licenseId;

    if (licenseId && existingAssignment.estado === 'activo') {
      const license = await License.findById(licenseId);
      const now = new Date();
      const started = new Date(existingAssignment.fechaInicioUso) <= now;
      const credentialsOut = existingAssignment.credentialsSent !== false;
      const ended = new Date(existingAssignment.fechaFinUso) < now;

      if (license && credentialsOut && !ended) {
        const othersWithCredentials = await Assignment.countDocuments({
          licenseId,
          estado: 'activo',
          _id: { $ne: id },
          credentialsSent: { $ne: false },
          fechaFinUso: { $gte: now },
        });
        if (othersWithCredentials > 0) {
          rotationSkipped = 'Otra asignación de esta licencia ya tiene las mismas claves; no se ha cambiado la contraseña.';
        } else {
          const before = license.passwordEmail;
          const fresh = await this.refreshLicensePassword(license.email, before);
          passwordRotated = !!fresh && fresh !== before;
        }
      }

      await this.syncLicenseStatus(String(licenseId));

      if (license && options.notify !== false) {
        try {
          emailSent = await emailService.sendAssignmentCancelled({
            teacherName: existingAssignment.nombreApellidos,
            teacherEmail: existingAssignment.correocorporativo,
            licenseEmail: license.email,
            startDate: formatShortDate(existingAssignment.fechaInicioUso),
            endDate: formatShortDate(existingAssignment.fechaFinUso),
            started,
          });
        } catch (error: any) {
          console.error('Failed to send cancellation email:', error.message);
        }
      }
    }

    await HistoryService.recordChange({
      entityType: 'assignment',
      entityId: assignment._id,
      action: 'status_change',
      actor,
      changes: [
        { field: 'estado', oldValue: existingAssignment.estado, newValue: 'cancelado' },
      ],
      metadata: {
        assignmentName: assignment.nombreApellidos,
        reason: licenseId
          ? `Cancelada manualmente por un administrador${passwordRotated ? '; contraseña de Zoom cambiada' : ''}${emailSent ? '; aviso enviado al docente' : ''}`
          : 'Solicitud cancelada',
      },
    });

    return { assignment, emailSent, passwordRotated, rotationSkipped };
  }

  /**
   * License status follows its assignments: 'ocupado' while an active
   * assignment is running or starts within 48h, otherwise 'libre'.
   * Licenses in maintenance are left alone.
   */
  private async syncLicenseStatus(licenseId: string): Promise<void> {
    const license = await License.findById(licenseId);
    if (!license || license.estado === 'mantenimiento') return;
    const now = new Date();
    const busy = await Assignment.countDocuments({
      licenseId: license._id,
      estado: 'activo',
      fechaInicioUso: { $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
      fechaFinUso: { $gte: now },
    });
    const estado = busy > 0 ? 'ocupado' : 'libre';
    if (license.estado !== estado) {
      await License.findByIdAndUpdate(license._id, { $set: { estado } });
      await HistoryService.recordChange({
        entityType: 'license',
        entityId: license._id,
        action: 'status_change',
        actor: 'system',
        changes: [{ field: 'estado', oldValue: license.estado, newValue: estado }],
        metadata: { licenseEmail: license.email, reason: 'Recalculado tras modificar o cancelar una asignación' },
      });
    }
  }

  /**
   * Admin edit of an assignment that already has a license: person, area,
   * type of use and dates. Same rules as creating one (365 days max, no
   * overlap on the license, start at 00:00 UTC, end at 23:59:59.999 UTC).
   *  - New recipient: they always get an email. If the previous person may
   *    know the password, it is changed first. Within 48h of the start the new
   *    person gets the credentials now; otherwise a reservation, and the 48h
   *    cron sends them later.
   *  - Same person, new dates: with notify, an "actualizada" email (with the
   *    password if they already had it, or fresh credentials if the new start
   *    is now within 48h).
   *  - Only name/area/type: no email.
   */
  async editAssignment(
    id: string,
    data: Partial<IAssignment>,
    actor: string = 'system',
    options: { notify?: boolean } = {}
  ): Promise<{ assignment: IAssignment; emailSent: boolean; passwordRotated: boolean; credentialsPending: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de asignación inválido');
    }
    const existing = await Assignment.findById(id);
    if (!existing) {
      throw new Error('Asignación no encontrada');
    }
    if (existing.estado !== 'activo' || !existing.licenseId) {
      throw new Error('Solo se pueden editar asignaciones activas con licencia');
    }

    const patch: Record<string, any> = {};
    const str = (v: any) => (typeof v === 'string' ? v.trim() : v);

    for (const field of ['nombreApellidos', 'area', 'comunidadAutonoma', 'tipoUso'] as const) {
      const v = str((data as any)[field]);
      if (v !== undefined && v !== ((existing as any)[field] ?? '')) patch[field] = v;
    }
    if (patch.nombreApellidos === '') throw new Error('El nombre es obligatorio');
    if (patch.area === '') throw new Error('El área es obligatoria');

    if (data.correocorporativo !== undefined) {
      const email = String(data.correocorporativo).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('El correo indicado no es válido');
      }
      if (email !== existing.correocorporativo.toLowerCase()) patch.correocorporativo = email;
    }

    const start = new Date(data.fechaInicioUso ?? existing.fechaInicioUso);
    const end = new Date(data.fechaFinUso ?? existing.fechaFinUso);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new Error('Las fechas indicadas no son válidas');
    }
    if (end.getTime() - start.getTime() > MAX_ASSIGNMENT_DAYS * 24 * 60 * 60 * 1000) {
      throw new Error('El período máximo de una licencia es de 1 año (365 días).');
    }
    if (end < new Date()) {
      throw new Error('La fecha de fin no puede ser anterior a hoy. Para terminar una asignación, cancélala.');
    }
    if (start.getTime() !== new Date(existing.fechaInicioUso).getTime()) patch.fechaInicioUso = start;
    if (end.getTime() !== new Date(existing.fechaFinUso).getTime()) patch.fechaFinUso = end;

    if (Object.keys(patch).length === 0) {
      throw new Error('No hay cambios que guardar');
    }

    if (patch.fechaInicioUso || patch.fechaFinUso) {
      const overlapping = await Assignment.findOne({
        _id: { $ne: id },
        licenseId: existing.licenseId,
        estado: 'activo',
        fechaInicioUso: { $lte: end },
        fechaFinUso: { $gte: start },
      });
      if (overlapping) {
        throw new Error(
          `Las fechas se solapan con otra asignación de esta licencia (${overlapping.nombreApellidos}, ` +
          `${formatShortDate(overlapping.fechaInicioUso)} - ${formatShortDate(overlapping.fechaFinUso)})`
        );
      }
    }

    const license = await License.findById(existing.licenseId);
    if (!license) throw new Error('Licencia no encontrada');

    const recipientChanged = !!patch.correocorporativo;
    const datesChanged = !!(patch.fechaInicioUso || patch.fechaFinUso);
    const credentialsOut = existing.credentialsSent !== false;
    const startsWithin48h = (start.getTime() - Date.now()) / (1000 * 60 * 60) <= 48;

    let passwordRotated = false;
    let sendCredentialsNow = false;
    let credentialsPending = false;
    let notify = false;

    if (recipientChanged) {
      notify = true;
      if (credentialsOut || startsWithin48h) {
        // The previous person may know the current password
        const before = license.passwordEmail;
        const fresh = await this.refreshLicensePassword(license.email, before);
        passwordRotated = !!fresh && fresh !== before;
      }
      sendCredentialsNow = startsWithin48h;
      credentialsPending = !startsWithin48h;
      patch.credentialsSent = startsWithin48h;
    } else if (datesChanged && options.notify !== false) {
      notify = true;
      if (credentialsOut) {
        sendCredentialsNow = true;
      } else if (startsWithin48h) {
        // A reservation that now starts within 48h: what the 48h cron would do
        const before = license.passwordEmail;
        const fresh = await this.refreshLicensePassword(license.email, before);
        passwordRotated = !!fresh && fresh !== before;
        sendCredentialsNow = true;
        patch.credentialsSent = true;
      } else {
        credentialsPending = true;
      }
    } else {
      credentialsPending = !credentialsOut;
    }

    const updated = await Assignment.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true }
    );
    if (!updated) throw new Error('Asignación no encontrada');

    const changes = HistoryService.extractChanges(existing.toObject(), updated.toObject(), [
      'nombreApellidos', 'correocorporativo', 'area', 'comunidadAutonoma', 'tipoUso', 'fechaInicioUso', 'fechaFinUso',
    ]);
    await HistoryService.recordChange({
      entityType: 'assignment',
      entityId: updated._id,
      action: 'update',
      actor,
      changes,
      metadata: {
        assignmentName: updated.nombreApellidos,
        reason: `Editada por un administrador${passwordRotated ? '; contraseña de Zoom cambiada' : ''}`,
      },
    });

    await this.syncLicenseStatus(String(license._id));

    let emailSent = false;
    if (notify) {
      const current = await License.findById(license._id);
      try {
        emailSent = await emailService.sendAssignmentConfirmation({
          teacherName: updated.nombreApellidos,
          teacherEmail: updated.correocorporativo,
          licenseEmail: license.email,
          startDate: formatShortDate(updated.fechaInicioUso),
          endDate: formatShortDate(updated.fechaFinUso),
          platform: updated.tipoUso,
          zoomPassword: sendCredentialsNow ? current?.passwordEmail : undefined,
          hostKey: license.claveAnfitrionZoom,
          moodleUser: license.usuarioMoodle,
          moodlePassword: license.claveUsuarioMoodle,
          credentialsPending: !sendCredentialsNow,
          // A new recipient never saw this assignment: plain assignment email
          isUpdate: !recipientChanged,
        });
      } catch (error: any) {
        console.error('Failed to send edited assignment email:', error.message);
      }
    }

    return { assignment: updated, emailSent, passwordRotated, credentialsPending };
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(id: string, actor: string = 'system'): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID de asignación inválido');
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return false;
    }

    const result = await Assignment.findByIdAndDelete(id);

    if (result) {
      // Record history
      await HistoryService.recordChange({
        entityType: 'assignment',
        entityId: new Types.ObjectId(id),
        action: 'delete',
        actor,
        changes: [
          { field: 'nombreApellidos', oldValue: assignment.nombreApellidos },
          { field: 'estado', oldValue: assignment.estado },
        ],
        metadata: {
          assignmentName: assignment.nombreApellidos,
        },
      });

      // Check if there are other active assignments for this license
      const activeAssignments = await Assignment.find({
        licenseId: assignment.licenseId,
        estado: 'activo'
      });

      // If no other active assignments, set license to 'libre'
      if (activeAssignments.length === 0 && assignment.licenseId) {
        await License.findByIdAndUpdate(
          assignment.licenseId,
          { $set: { estado: 'libre' } }
        );
      }
    }

    return result !== null;
  }

  /**
   * Mark expired assignments
   * This should be called by a cron job
   */
  /**
   * Mark past-end assignments as expired and free their licenses.
   * Returns the IDs of the licenses that became free in this run, so the
   * nightly job can rotate exactly those passwords (the previous user's
   * access must end with the assignment).
   */
  async markExpiredAssignments(): Promise<{ count: number; freedLicenseIds: string[] }> {
    const now = new Date();
    const freedLicenseIds: string[] = [];

    // Fetch before updating so we have the docs for history recording
    const toExpire = await Assignment.find({
      estado: 'activo',
      fechaFinUso: { $lt: now }
    });

    if (toExpire.length === 0) return { count: 0, freedLicenseIds };

    await Assignment.updateMany(
      { _id: { $in: toExpire.map(a => a._id) } },
      { $set: { estado: 'expirado' } }
    );

    for (const assignment of toExpire) {
      // Record expiration in history
      await HistoryService.recordChange({
        entityType: 'assignment',
        entityId: assignment._id,
        action: 'status_change',
        actor: 'system',
        changes: [{ field: 'estado', oldValue: 'activo', newValue: 'expirado' }],
        metadata: { assignmentName: assignment.nombreApellidos },
      });

      // Free the license if no other active assignment is using it
      if (assignment.licenseId) {
        const activeAssignments = await Assignment.find({
          licenseId: assignment.licenseId,
          estado: 'activo'
        });

        if (activeAssignments.length === 0) {
          await License.findByIdAndUpdate(
            assignment.licenseId,
            { $set: { estado: 'libre' } }
          );
          freedLicenseIds.push(assignment.licenseId.toString());
        }
      }
    }

    return { count: toExpire.length, freedLicenseIds: [...new Set(freedLicenseIds)] };
  }

  /**
   * Check whether the license of an existing assignment can be extended to newEndDate.
   *
   * An extension is submitted as a new assignment covering
   * [day after the current end, newEndDate], so both rules apply to that window:
   *  - it may not exceed MAX_ASSIGNMENT_DAYS (same rule as POST /assignments);
   *  - no other active assignment of the same license may overlap it.
   * When a rule fails, the result says why and, when possible, the latest end
   * date that would be accepted (maxEndDate, YYYY-MM-DD).
   */
  async checkExtensionAvailability(
    assignmentId: string,
    newEndDate: Date
  ): Promise<{
    available: boolean;
    assignment: IAssignment;
    message?: string;
    reason?: 'max_period' | 'conflict';
    maxEndDate?: string;
    conflictStartDate?: string;
  }> {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new Error('ID de asignación inválido');
    }

    const assignment = await Assignment.findById(assignmentId).populate('licenseId');
    if (!assignment) {
      throw new Error('Asignación no encontrada');
    }

    if (!assignment.licenseId) {
      throw new Error(
        'La asignación seleccionada aún no tiene una licencia asignada (está pendiente). No es posible solicitar una ampliación.'
      );
    }

    if (newEndDate <= assignment.fechaFinUso) {
      throw new Error('La nueva fecha de fin debe ser posterior a la fecha de fin actual de la asignación');
    }

    const DAY_MS = 24 * 60 * 60 * 1000;
    const extensionStart = new Date(assignment.fechaFinUso);
    extensionStart.setUTCDate(extensionStart.getUTCDate() + 1);
    extensionStart.setUTCHours(0, 0, 0, 0);

    const requestedEnd = new Date(newEndDate);
    requestedEnd.setUTCHours(0, 0, 0, 0);

    const latestAllowedByPeriod = new Date(extensionStart.getTime() + MAX_ASSIGNMENT_DAYS * DAY_MS);
    if (requestedEnd > latestAllowedByPeriod) {
      return {
        available: false,
        assignment,
        reason: 'max_period',
        maxEndDate: toIsoDay(latestAllowedByPeriod),
        message:
          `Cada ampliación puede cubrir como máximo 1 año (${MAX_ASSIGNMENT_DAYS} días) desde el fin de tu período actual. ` +
          `Puedes ampliar hasta el ${formatLongDate(latestAllowedByPeriod)} y, cuando ese período esté por terminar, solicitar otra ampliación.`,
      };
    }

    const requestedEndOfDay = new Date(requestedEnd);
    requestedEndOfDay.setUTCHours(23, 59, 59, 999);

    // Other active assignments of the same license that overlap the extension window
    const licenseId = (assignment.licenseId as any)._id ?? assignment.licenseId;
    const conflicting = await Assignment.find({
      licenseId,
      estado: 'activo',
      _id: { $ne: assignment._id },
      fechaInicioUso: { $lte: requestedEndOfDay },
      fechaFinUso: { $gte: extensionStart },
    }).sort({ fechaInicioUso: 1 });

    if (conflicting.length > 0) {
      const next = conflicting[0];
      const nextStart = new Date(next.fechaInicioUso);
      const isSameTeacher = next.correocorporativo === assignment.correocorporativo;
      const who = isSameTeacher ? 'ya tienes otra asignación de esta licencia' : 'esta licencia estará en uso por otra persona';

      // Latest end date that still fits before the next booking starts
      const dayBeforeNext = new Date(nextStart);
      dayBeforeNext.setUTCHours(0, 0, 0, 0);
      dayBeforeNext.setUTCDate(dayBeforeNext.getUTCDate() - 1);
      const canExtendPartially = dayBeforeNext >= extensionStart;

      return {
        available: false,
        assignment,
        reason: 'conflict',
        conflictStartDate: toIsoDay(nextStart),
        ...(canExtendPartially && { maxEndDate: toIsoDay(dayBeforeNext) }),
        message: canExtendPartially
          ? `No es posible ampliar hasta esa fecha: ${who} a partir del ${formatLongDate(nextStart)}. ` +
            `Puedes ampliar como máximo hasta el ${formatLongDate(dayBeforeNext)}, o solicitar una nueva licencia para el período completo.`
          : `No es posible ampliar esta licencia: ${who} a partir del ${formatLongDate(nextStart)}. ` +
            'Debes solicitar una nueva licencia para el período que necesitas.',
      };
    }

    return { available: true, assignment };
  }

  /**
   * Admin view of a license's calendar: every active assignment that has not
   * ended yet (current and future), plus pending extension requests that
   * continue one of this license's assignments.
   */
  async getLicenseSchedule(licenseId: string): Promise<{
    assignments: IAssignment[];
    pendingExtensions: IAssignment[];
  }> {
    if (!Types.ObjectId.isValid(licenseId)) {
      throw new Error('ID de licencia inválido');
    }
    const id = new Types.ObjectId(licenseId);

    const assignments = await Assignment.find({
      licenseId: id,
      estado: 'activo',
      fechaFinUso: { $gte: new Date() },
    }).sort({ fechaInicioUso: 1 });

    // Extension requests have no licenseId until approved; they point to the
    // assignment they extend. Include those of any assignment of this license.
    const licenseAssignmentIds = await Assignment.find({ licenseId: id }).distinct('_id');
    const pendingExtensions = await Assignment.find({
      estado: 'pendiente',
      isExtension: true,
      originalAssignmentId: { $in: licenseAssignmentIds },
    }).sort({ fechaInicioUso: 1 });

    return { assignments, pendingExtensions };
  }

  /**
   * Get assignments expiring soon (within X days)
   */
  async getExpiringAssignments(daysAhead: number = 7): Promise<IAssignment[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await Assignment.find({
      estado: 'activo',
      fechaFinUso: {
        $gte: now,
        $lte: futureDate
      }
    })
      .populate('licenseId')
      .sort({ fechaFinUso: 1 });
  }
}

export const assignmentService = new AssignmentService();
