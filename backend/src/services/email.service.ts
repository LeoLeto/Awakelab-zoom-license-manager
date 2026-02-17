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
  password?: string;
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
    const secure = await settingsService.getSetting('emailSecure');
    const user = await settingsService.getSetting('emailUser');
    const password = await settingsService.getSetting('emailPassword');
    const from = await settingsService.getSetting('emailFrom');

    if (!host || !port || !user || !password) {
      console.log('⚠️  Email configuration incomplete. Skipping email send.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: secure === true,
      auth: {
        user,
        pass: password,
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
      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      await this.transporter.sendMail({
        from: from || 'noreply@awakelab.cl',
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
   * Send assignment confirmation email to teacher
   */
  async sendAssignmentConfirmation(data: AssignmentEmailData): Promise<boolean> {
    const html = `
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
          .credentials { background: #fef3c7; padding: 15px; margin: 15px 0; border-radius: 5px; border: 1px solid #f59e0b; }
          strong { color: #1f2937; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Licencia de Zoom Asignada</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${data.teacherName}</strong>,</p>
            
            <p>Tu solicitud de licencia de Zoom ha sido aprobada y asignada. A continuación encontrarás los detalles:</p>
            
            <div class="info-box">
              <p><strong>📧 Email de la Licencia:</strong> ${data.licenseEmail}</p>
              <p><strong>📅 Fecha de Inicio:</strong> ${data.startDate}</p>
              <p><strong>📅 Fecha de Fin:</strong> ${data.endDate}</p>
              <p><strong>🖥️ Plataforma:</strong> ${data.platform}</p>
            </div>
            
            ${data.password ? `
            <div class="credentials">
              <p><strong>🔐 Contraseña:</strong> ${data.password}</p>
              <p style="font-size: 12px; margin-top: 10px;">⚠️ Guarda esta contraseña de forma segura. No vuelvas a compartirla por email.</p>
            </div>
            ` : ''}
            
            <p><strong>⚠️ Importante:</strong></p>
            <ul>
              <li>La licencia estará activa hasta la fecha de fin indicada</li>
              <li>Después de esa fecha, la contraseña será cambiada automáticamente</li>
              <li>Si necesitas extender el período, contacta al administrador</li>
            </ul>
            
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

    return await this.sendEmail({
      to: data.teacherEmail,
      subject: `✅ Licencia de Zoom Asignada - ${data.startDate} a ${data.endDate}`,
      html,
    });
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
   * Test email configuration
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

    return await this.sendEmail({
      to: recipientEmail,
      subject: '✅ Prueba de Configuración de Email - Sistema de Licencias Zoom',
      html,
    });
  }
}

export const emailService = new EmailService();
