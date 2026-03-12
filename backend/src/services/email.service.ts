import nodemailer, { Transporter } from 'nodemailer';
import { settingsService } from './settings.service';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface AssignmentEmailData {
  teacherName: string;
  teacherEmail: string;
  licenseEmail: string;
  startDate: string;
  endDate: string;
  platform: string;
  zoomPassword?: string;
  moodleUser?: string;
  moodlePassword?: string;
  isExtension?: boolean;
}

interface ExpirationWarningData {
  teacherName: string;
  teacherEmail: string;
  licenseEmail: string;
  endDate: string;
  daysRemaining: number;
}

interface PasswordChangedData {
  licenseEmail: string;
  newPassword: string;
  reason: string;
}

export class EmailService {
  private transporter: Transporter | null = null;

  /**
   * Initialize email transporter with current settings
   */
  private async initTransporter(): Promise<void> {
    const host = await settingsService.getSetting('emailHost');
    const port = await settingsService.getSetting('emailPort');
    const secureRaw = await settingsService.getSetting('emailSecure');
    const user = await settingsService.getSetting('emailUser');
    const password = await settingsService.getSetting('emailPassword');
    const from = await settingsService.getSetting('emailFrom');

    if (!host || !port || !user || !password) {
      console.log('⚠️  Email configuration incomplete. Skipping email send.');
      return;
    }

    const portNumber = parseInt(port);
    // Port 465 → implicit TLS (secure: true)
    // Port 587 → STARTTLS (secure: MUST be false, then upgraded via requireTLS)
    //   Office365/Gmail label this as "SSL/TLS" in their UI but it is STARTTLS.
    //   Setting secure:true on port 587 causes the "wrong version number" SSL error.
    // Any other port → honour the stored setting.
    const secureFlag =
      portNumber === 465
        ? true
        : portNumber === 587
        ? false
        : secureRaw === true || secureRaw === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port: portNumber,
      secure: secureFlag,
      // Force STARTTLS upgrade on port 587 (and 25)
      ...(portNumber !== 465 && { requireTLS: true }),
      auth: {
        user,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Send an email
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Check if notifications are enabled
      const notificationsEnabled = await settingsService.getSetting('notifyOnExpiration');
      if (!notificationsEnabled) {
        console.log('📧 Email notifications are disabled');
        return false;
      }

      await this.initTransporter();

      if (!this.transporter) {
        console.log('⚠️  Email transporter not configured');
        return false;
      }

      const from = await settingsService.getSetting('emailFrom');
      const user = await settingsService.getSetting('emailUser');
      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      await this.transporter.sendMail({
        // Office365 (and most providers) require from === authenticated user
        // unless explicit "Send As" permission is granted in Exchange.
        from: from || user || '',
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      console.log(`✅ Email sent to: ${recipients}`);
      return true;
    } catch (error: any) {
      console.error('❌ Error sending email:', error.message);
      return false;
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }

  /**
   * Build HTML body for the license assignment confirmation email
   */
  private buildAssignmentEmailHtml(data: AssignmentEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .section-heading { font-size: 16px; font-weight: bold; margin: 20px 0 8px 0; padding-bottom: 6px; }
          .zoom-credentials { background: #eff6ff; padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid #bfdbfe; }
          .moodle-credentials { background: #f0fdf4; padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid #bbf7d0; }
          .warning-box { background: #fef3c7; padding: 12px 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #f59e0b; font-size: 13px; }
          .danger-box { background: #fef2f2; padding: 12px 15px; margin: 10px 0; border-radius: 5px; border: 2px solid #dc2626; font-size: 13px; }
          strong { color: #1f2937; }
          code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${data.isExtension ? '📅 Licencia de Zoom Ampliada' : '✅ Licencia de Zoom Asignada'}</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${data.teacherName}</strong>,</p>

            <p>${data.isExtension
              ? 'Tu licencia de Zoom ha sido <strong>ampliada</strong>. A continuación encontrarás los datos de acceso actualizados:'
              : 'Tu solicitud de licencia de Zoom ha sido aprobada y asignada. A continuación encontrarás los datos de acceso:'}</p>

            <div class="info-box">
              <p><strong>📅 Fecha de Inicio:</strong> ${data.startDate}</p>
              <p><strong>📅 Fecha de Fin:</strong> ${data.endDate}</p>
              <p><strong>🖥️ Tipo de Uso:</strong> ${data.platform}</p>
            </div>

            <p class="section-heading" style="color: #1d4ed8; border-bottom: 2px solid #1d4ed8;">🎥 Acceso a Zoom</p>
            <div class="zoom-credentials">
              <p><strong>📧 Email Zoom:</strong> ${data.licenseEmail}</p>
              ${data.zoomPassword ? `<p><strong>🔑 Contraseña Zoom:</strong> <code>${data.zoomPassword}</code></p>` : ''}
            </div>
            <div class="warning-box">
              <p style="margin: 0 0 6px 0;"><strong>⚠️ Sobre la contraseña Zoom:</strong></p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Al finalizar tu licencia el <strong>${data.endDate}</strong>, la contraseña Zoom será cambiada automáticamente por razones de seguridad y perderás el acceso a la cuenta.</li>
                <li>Si necesitas extender el período de uso, puedes solicitar una prórroga al administrador antes de la fecha de vencimiento.</li>
                <li>Recibirás un correo de recordatorio unos días antes de que expire la licencia.</li>
              </ul>
            </div>

            ${(data.moodleUser || data.moodlePassword) ? `
            <p class="section-heading" style="color: #059669; border-bottom: 2px solid #059669;">📚 Acceso a Moodle</p>
            <div class="moodle-credentials">
              ${data.moodleUser ? `<p><strong>👤 Usuario Moodle:</strong> <code>${data.moodleUser}</code></p>` : ''}
              ${data.moodlePassword ? `<p><strong>🔒 Contraseña Moodle:</strong> <code>${data.moodlePassword}</code></p>` : ''}
            </div>
            <div class="danger-box">
              <p style="margin: 0 0 6px 0;"><strong>🚫 MUY IMPORTANTE — NO CAMBIES LA CONTRASEÑA DE MOODLE</strong></p>
              <p style="margin: 0;">La contraseña de Moodle <strong>NO debe ser modificada bajo ningún concepto</strong>. Esta cuenta está vinculada al sistema de gestión de licencias y cualquier cambio de contraseña afectará el acceso de otros usuarios. Si tienes algún inconveniente con el acceso a Moodle, contacta al administrador.</p>
            </div>
            ` : ''}

            <p>Si tienes alguna pregunta, contacta al equipo de soporte.</p>

            <p>Saludos,<br><strong>Sistema de Gestión de Licencias Zoom</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático. Por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send assignment confirmation email to teacher
   */
  async sendAssignmentConfirmation(data: AssignmentEmailData): Promise<boolean> {
    const html = this.buildAssignmentEmailHtml(data);
    return await this.sendEmail({
      to: data.teacherEmail,
      subject: `✅ Licencia de Zoom Asignada - ${data.startDate} a ${data.endDate}`,
      html,
    });
  }

  /**
   * Send extension confirmation email to teacher (same content, extension-flagged header)
   */
  async sendExtensionConfirmation(data: AssignmentEmailData): Promise<boolean> {
    const html = this.buildAssignmentEmailHtml({ ...data, isExtension: true });
    return await this.sendEmail({
      to: data.teacherEmail,
      subject: `📅 Licencia de Zoom Ampliada - hasta ${data.endDate}`,
      html,
    });
  }

  /**
   * Send a sample assignment confirmation email (bypasses notificationsEnabled gate)
   */
  async sendAssignmentSample(recipientEmail: string): Promise<boolean> {
    const html = this.buildAssignmentEmailHtml({
      teacherName: 'Juan García López',
      teacherEmail: recipientEmail,
      licenseEmail: 'licencia01@example.com',
      startDate: '11/03/2026',
      endDate: '11/06/2026',
      platform: 'Uso para una plataforma Moodle de Grupo Aspasia',
      zoomPassword: 'Zoom@S3gura!2026',
      moodleUser: 'jgarcia.moodle',
      moodlePassword: 'Moodle#Pass2026',
    });

    try {
      await this.initTransporter();

      if (!this.transporter) {
        console.error('⚠️  Email transporter not configured — check host/port/user/password settings');
        return false;
      }

      const from = await settingsService.getSetting('emailFrom');
      const user = await settingsService.getSetting('emailUser');

      await this.transporter.sendMail({
        from: from || user || '',
        to: recipientEmail,
        subject: '[MUESTRA] ✅ Licencia de Zoom Asignada — 11/03/2026 a 11/06/2026',
        html,
        text: this.stripHtml(html),
      });

      console.log(`✅ Assignment sample email sent to: ${recipientEmail}`);
      return true;
    } catch (error: any) {
      console.error('❌ Error sending assignment sample email:', error.message);
      throw error;
    }
  }

  /**
   * Send expiration warning email to teacher
   */
  async sendExpirationWarning(data: ExpirationWarningData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .warning-box { background: #fef3c7; padding: 20px; margin: 15px 0; border-left: 4px solid #f59e0b; border-radius: 5px; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          strong { color: #1f2937; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Tu Licencia de Zoom Está por Expirar</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${data.teacherName}</strong>,</p>
            
            <div class="warning-box">
              <p style="font-size: 18px; margin: 0;"><strong>⏰ Tu licencia expira en ${data.daysRemaining} día${data.daysRemaining !== 1 ? 's' : ''}</strong></p>
            </div>
            
            <p>Te recordamos que tu licencia de Zoom tiene las siguientes características:</p>
            
            <ul>
              <li><strong>📧 Email de la Licencia:</strong> ${data.licenseEmail}</li>
              <li><strong>📅 Fecha de Expiración:</strong> ${data.endDate}</li>
            </ul>
            
            <p><strong>¿Qué sucederá después de la expiración?</strong></p>
            <ul>
              <li>🔒 La contraseña será cambiada automáticamente por seguridad</li>
              <li>❌ No podrás acceder a la cuenta después de la fecha de expiración</li>
              <li>📋 La licencia quedará disponible para otros docentes</li>
            </ul>
            
            <p><strong>¿Necesitas más tiempo?</strong></p>
            <p>Si requieres extender el período de uso, por favor contacta al administrador lo antes posible.</p>
            
            <p>Saludos,<br><strong>Sistema de Gestión de Licencias Zoom</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático. Por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: data.teacherEmail,
      subject: `⚠️ Tu Licencia de Zoom Expira en ${data.daysRemaining} Día${data.daysRemaining !== 1 ? 's' : ''}`,
      html,
    });
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChanged(data: PasswordChangedData, recipientEmail: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .info-box { background: #d1fae5; padding: 15px; margin: 15px 0; border-left: 4px solid #10b981; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          strong { color: #1f2937; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔐 Contraseña de Licencia Actualizada</h2>
          </div>
          <div class="content">
            <p>Hola,</p>
            
            <p>La contraseña de una licencia de Zoom ha sido actualizada automáticamente.</p>
            
            <div class="info-box">
              <p><strong>📧 Licencia:</strong> ${data.licenseEmail}</p>
              <p><strong>🔑 Nueva Contraseña:</strong> ${data.newPassword}</p>
              <p><strong>📝 Motivo:</strong> ${data.reason}</p>
            </div>
            
            <p><strong>Detalles:</strong></p>
            <ul>
              <li>Esta contraseña ha sido generada automáticamente por el sistema</li>
              <li>Cumple con todos los requisitos de seguridad de Zoom</li>
              <li>La licencia ahora está disponible para nuevas asignaciones</li>
            </ul>
            
            <p>No se requiere ninguna acción de tu parte. Esta notificación es solo informativa.</p>
            
            <p>Saludos,<br><strong>Sistema de Gestión de Licencias Zoom</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático. Por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipientEmail,
      subject: `🔐 Contraseña Actualizada - ${data.licenseEmail}`,
      html,
    });
  }

  /**
   * Send pending request notification to admins
   */
  async sendPendingRequestNotification(
    teacherName: string,
    teacherEmail: string,
    startDate: string,
    endDate: string,
    area: string
  ): Promise<boolean> {
    const adminEmails = await settingsService.getSetting('adminNotificationEmails');
    
    if (!adminEmails) {
      console.log('⚠️  No admin emails configured for notifications');
      return false;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .action-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          strong { color: #1f2937; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📋 Nueva Solicitud de Licencia Pendiente</h2>
          </div>
          <div class="content">
            <p>Hola Administrador,</p>
            
            <p>Se ha recibido una nueva solicitud de licencia de Zoom que requiere tu atención.</p>
            
            <div class="info-box">
              <p><strong>👤 Docente:</strong> ${teacherName}</p>
              <p><strong>📧 Email:</strong> ${teacherEmail}</p>
              <p><strong>🏢 Área:</strong> ${area}</p>
              <p><strong>📅 Período Solicitado:</strong> ${startDate} - ${endDate}</p>
            </div>
            
            <p><strong>Acción requerida:</strong></p>
            <p>Por favor, ingresa al Panel de Administración para asignar una licencia disponible a esta solicitud.</p>
            
            <p>Saludos,<br><strong>Sistema de Gestión de Licencias Zoom</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático. Por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emails = adminEmails.split(',').map((email: string) => email.trim());
    
    return await this.sendEmail({
      to: emails,
      subject: `📋 Nueva Solicitud de Licencia - ${teacherName}`,
      html,
    });
  }

  /**
   * Test email configuration — bypasses the notificationsEnabled gate
   * so it always attempts delivery regardless of the setting.
   */
  async sendTestEmail(recipientEmail: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Prueba de Configuración de Email</h2>
          </div>
          <div class="content">
            <p>¡Felicidades!</p>
            
            <p>Este es un correo de prueba para confirmar que la configuración de email está funcionando correctamente.</p>
            
            <p>Si estás viendo este mensaje, significa que:</p>
            <ul>
              <li>✅ Los datos de configuración SMTP son correctos</li>
              <li>✅ El servidor puede conectarse al servicio de email</li>
              <li>✅ Las notificaciones están listas para funcionar</li>
            </ul>
            
            <p>Saludos,<br><strong>Sistema de Gestión de Licencias Zoom</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático de prueba.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Bypass the notifyOnExpiration toggle — always send the test email.
    try {
      await this.initTransporter();

      if (!this.transporter) {
        console.error('⚠️  Email transporter not configured — check host/port/user/password settings');
        return false;
      }

      const from = await settingsService.getSetting('emailFrom');
      const user = await settingsService.getSetting('emailUser');

      await this.transporter.sendMail({
        // Must match the authenticated account on Office365
        from: from || user || '',
        to: recipientEmail,
        subject: '✅ Prueba de Configuración de Email - Sistema de Licencias Zoom',
        html,
        text: this.stripHtml(html),
      });

      console.log(`✅ Test email sent to: ${recipientEmail}`);
      return true;
    } catch (error: any) {
      console.error('❌ Error sending test email:', error.message);
      throw error; // Re-throw so the route returns the real error message
    }
  }
}

export const emailService = new EmailService();
