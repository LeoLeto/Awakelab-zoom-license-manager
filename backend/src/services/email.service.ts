import nodemailer, { Transporter } from 'nodemailer';
import { settingsService } from './settings.service';
import { EmailLog, EmailLogType } from '../models/EmailLog.model';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  logType?: EmailLogType;
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
  hostKey?: string;
  isExtension?: boolean;
  credentialsPending?: boolean;
  /** An admin edited an existing assignment (dates or recipient) */
  isUpdate?: boolean;
}

/** Credentials of one license inside a multi-license email */
export interface LicenseCredentials {
  licenseEmail: string;
  zoomPassword?: string;
  hostKey?: string;
  moodleUser?: string;
  moodlePassword?: string;
}

/**
 * Several licenses assigned to the same person with the same dates and use,
 * sent as ONE email (plus one admin copy) instead of one email per license.
 */
export interface MultiAssignmentEmailData {
  teacherName: string;
  teacherEmail: string;
  startDate: string;
  endDate: string;
  platform: string;
  /** true → reservation (>48h away): Zoom passwords are sent later by the 48h cron */
  credentialsPending?: boolean;
  licenses: LicenseCredentials[];
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

interface ExpirationWarningData {
  teacherName: string;
  teacherEmail: string;
  /** One license, or every license of the same person expiring that day */
  licenseEmail: string | string[];
  endDate: string;
  daysRemaining: number;
}

interface PasswordChangedData {
  licenseEmail: string;
  newPassword: string;
  reason: string;
}

interface AssignmentCancelledData {
  teacherName: string;
  teacherEmail: string;
  licenseEmail: string;
  startDate: string;
  endDate: string;
  /** false = a future reservation that never started */
  started?: boolean;
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
      await this.initTransporter();

      if (!this.transporter) {
        const msg = 'Email transporter not configured';
        console.log('⚠️  ' + msg);
        this.writeLog(options, 'failed', msg);
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
      this.writeLog(options, 'sent');
      return true;
    } catch (error: any) {
      console.error('❌ Error sending email:', error.message);
      this.writeLog(options, 'failed', error.message);
      return false;
    }
  }

  /** Persist an email log entry. Never throws — logging must not block email delivery. */
  private writeLog(options: EmailOptions, status: 'sent' | 'failed', error?: string): void {
    const to = Array.isArray(options.to) ? options.to : [options.to];
    EmailLog.create({
      to,
      subject: options.subject,
      html: options.html,
      logType: options.logType ?? 'test',
      status,
      ...(error ? { error } : {}),
    }).catch((err) => console.error('Failed to write email log:', err));
  }

  /** Resend any logged email to its original recipients (or override the destination). */
  async resendEmail(logId: string, toOverride?: string[]): Promise<boolean> {
    const log = await EmailLog.findById(logId);
    if (!log) throw new Error('Entrada de log no encontrada');
    return this.sendEmail({
      to: toOverride ?? log.to,
      subject: `[REENVÍO] ${log.subject}`,
      html: log.html,
      logType: log.logType,
    });
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
            <h2>${data.isUpdate ? '✏️ Licencia de Zoom Actualizada' : data.isExtension ? '📅 Licencia de Zoom Ampliada' : '✅ Licencia de Zoom Asignada'}</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${data.teacherName}</strong>,</p>

            <p>${data.isUpdate
              ? 'Un administrador ha <strong>actualizado</strong> los datos de tu licencia de Zoom. Estos son los datos vigentes:'
              : data.isExtension
              ? 'Tu licencia de Zoom ha sido <strong>ampliada</strong>. A continuación encontrarás los datos de acceso actualizados:'
              : data.credentialsPending
                ? 'Tu solicitud de licencia de Zoom ha sido <strong>aprobada</strong>. A continuación encontrarás los detalles de tu reserva:'
                : 'Tu solicitud de licencia de Zoom ha sido aprobada y asignada. A continuación encontrarás los datos de acceso:'}</p>

            <div class="info-box">
              <p><strong>📅 Fecha de Inicio:</strong> ${data.startDate}</p>
              <p><strong>📅 Fecha de Fin:</strong> ${data.endDate}</p>
              <p><strong>🖥️ Tipo de Uso:</strong> ${data.platform}</p>
            </div>

            <p class="section-heading" style="color: #1d4ed8; border-bottom: 2px solid #1d4ed8;">🎥 Acceso a Zoom</p>
            <div class="zoom-credentials">
              <p><strong>📧 Email Zoom:</strong> ${data.licenseEmail}</p>
              ${data.hostKey ? `<p><strong>🎙️ Clave de anfitrión:</strong> <code>${data.hostKey}</code></p>` : ''}
              ${!data.credentialsPending && data.zoomPassword ? `<p><strong>🔑 Contraseña Zoom:</strong> <code>${data.zoomPassword}</code></p>` : ''}
            </div>
            ${data.credentialsPending ? `
            <div class="warning-box">
              <p style="margin: 0;">🔑 <strong>La contraseña de acceso se enviará automáticamente aproximadamente 48 horas antes de tu fecha de inicio (<u>${data.startDate}</u>)</strong>. Esto garantiza que recibas una contraseña válida y actualizada.</p>
            </div>
            ` : `
            <div class="warning-box">
              <p style="margin: 0 0 6px 0;"><strong>⚠️ Sobre la contraseña Zoom:</strong></p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Al finalizar tu licencia el <strong>${data.endDate}</strong>, la contraseña Zoom será cambiada automáticamente por razones de seguridad y perderás el acceso a la cuenta.</li>
                <li>Si necesitas extender el período de uso, puedes solicitar una prórroga al administrador antes de la fecha de vencimiento.</li>
                <li>Recibirás un correo de recordatorio unos días antes de que expire la licencia.</li>
              </ul>
            </div>
            `}

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
   * Send assignment confirmation email to teacher.
   * When actual credentials are included (not credentialsPending), also sends
   * a copy to admin notification emails so administrators have a record.
   */
  async sendAssignmentConfirmation(data: AssignmentEmailData): Promise<boolean> {
    const html = this.buildAssignmentEmailHtml(data);
    const subject = data.isUpdate
      ? `✏️ Licencia de Zoom actualizada - ${data.startDate} a ${data.endDate}`
      : `✅ Licencia de Zoom Asignada - ${data.startDate} a ${data.endDate}`;

    const sent = await this.sendEmail({
      to: data.teacherEmail,
      subject,
      html,
      logType: 'assignment_confirmation',
    });

    if (sent) {
      await this.sendAdminCredentialCopy(data, html);
    }

    return sent;
  }

  /**
   * Send a copy of the credentials email to all configured admin addresses.
   * Subject is prefixed with [COPIA ADMIN] so admins can distinguish it.
   */
  private async sendAdminCredentialCopy(data: AssignmentEmailData, html: string): Promise<void> {
    await this.sendAdminCopy(
      `[COPIA ADMIN] ✅ Credenciales enviadas a ${data.teacherName} (${data.licenseEmail})`,
      html
    );
  }

  /**
   * Configured admin notification addresses. The setting has been stored both
   * as an array and as a comma-separated string, so accept both.
   */
  async getAdminNotificationEmails(): Promise<string[]> {
    const setting = await settingsService.getSetting('adminNotificationEmails');
    if (Array.isArray(setting)) {
      return setting.map((e: string) => String(e).trim()).filter(Boolean);
    }
    if (typeof setting === 'string' && setting.trim()) {
      return setting.split(',').map((e: string) => e.trim()).filter(Boolean);
    }
    return [];
  }

  /** Send a copy of a credentials email to every admin address. Never throws. */
  private async sendAdminCopy(subject: string, html: string): Promise<void> {
    try {
      const emails = await this.getAdminNotificationEmails();
      if (emails.length === 0) return;
      await this.sendEmail({ to: emails, subject, html, logType: 'admin_copy' });
    } catch (error: any) {
      console.error('Failed to send admin credential copy:', error.message);
    }
  }

  /**
   * Send ONE email with every license assigned to the same person for the
   * same period (plus one admin copy). With a single license it falls back to
   * the regular single-license email so nothing changes for the usual case.
   */
  async sendMultiAssignmentConfirmation(data: MultiAssignmentEmailData): Promise<boolean> {
    if (data.licenses.length === 0) return false;
    if (data.licenses.length === 1) {
      const [license] = data.licenses;
      return this.sendAssignmentConfirmation({
        teacherName: data.teacherName,
        teacherEmail: data.teacherEmail,
        startDate: data.startDate,
        endDate: data.endDate,
        platform: data.platform,
        credentialsPending: data.credentialsPending,
        ...license,
      });
    }

    const n = data.licenses.length;
    const html = this.buildMultiAssignmentEmailHtml(data);
    const subject = data.credentialsPending
      ? `📋 ${n} licencias de Zoom reservadas - ${data.startDate} a ${data.endDate}`
      : `✅ ${n} licencias de Zoom asignadas - ${data.startDate} a ${data.endDate}`;

    const sent = await this.sendEmail({
      to: data.teacherEmail,
      subject,
      html,
      logType: 'assignment_confirmation',
    });

    if (sent) {
      await this.sendAdminCopy(
        data.credentialsPending
          ? `[COPIA ADMIN] 📋 Reserva de ${n} licencias enviada a ${data.teacherName}`
          : `[COPIA ADMIN] ✅ Credenciales de ${n} licencias enviadas a ${data.teacherName}`,
        html
      );
    }

    return sent;
  }

  /**
   * Build HTML body for the multi-license assignment email: shared details
   * once, then one table row per license.
   */
  private buildMultiAssignmentEmailHtml(data: MultiAssignmentEmailData): string {
    const n = data.licenses.length;
    const pending = !!data.credentialsPending;
    const hasMoodle = data.licenses.some((l) => l.moodleUser || l.moodlePassword);

    const rows = data.licenses
      .map((l, i) => `
        <tr style="background:${i % 2 ? '#f8fafc' : '#ffffff'}">
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280;vertical-align:top">${i + 1}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top">
            <strong>${escapeHtml(l.licenseEmail)}</strong>
            ${!pending && l.zoomPassword ? `<br><span style="font-size:13px">🔑 Contraseña: <code>${escapeHtml(l.zoomPassword)}</code></span>` : ''}
            ${l.hostKey ? `<br><span style="font-size:13px">🎙️ Clave anfitrión: <code>${escapeHtml(l.hostKey)}</code></span>` : ''}
          </td>
          ${hasMoodle ? `
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-size:13px">
            ${l.moodleUser ? `👤 <code>${escapeHtml(l.moodleUser)}</code><br>` : ''}
            ${l.moodlePassword ? `🔒 <code>${escapeHtml(l.moodlePassword)}</code>` : ''}
          </td>` : ''}
        </tr>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 680px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          .section-heading { font-size: 16px; font-weight: bold; margin: 20px 0 8px 0; padding-bottom: 6px; }
          .warning-box { background: #fef3c7; padding: 12px 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #f59e0b; font-size: 13px; }
          .danger-box { background: #fef2f2; padding: 12px 15px; margin: 10px 0; border-radius: 5px; border: 2px solid #dc2626; font-size: 13px; }
          strong { color: #1f2937; }
          code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; }
          th { text-align: left; background: #eff6ff; color: #1d4ed8; padding: 8px; font-size: 13px; border-bottom: 2px solid #bfdbfe; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${pending ? `📋 ${n} Licencias de Zoom Reservadas` : `✅ ${n} Licencias de Zoom Asignadas`}</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${escapeHtml(data.teacherName)}</strong>,</p>

            <p>${pending
              ? `Se te han reservado <strong>${n} licencias de Zoom</strong>, todas con las mismas fechas. A continuación encontrarás los detalles de tu reserva:`
              : `Se te han asignado <strong>${n} licencias de Zoom</strong>, todas con las mismas fechas. A continuación encontrarás los datos de acceso de cada una:`}</p>

            <div class="info-box">
              <p><strong>📅 Fecha de Inicio:</strong> ${escapeHtml(data.startDate)}</p>
              <p><strong>📅 Fecha de Fin:</strong> ${escapeHtml(data.endDate)}</p>
              <p><strong>🖥️ Tipo de Uso:</strong> ${escapeHtml(data.platform)}</p>
              <p><strong>🔢 Licencias:</strong> ${n}</p>
            </div>

            <p class="section-heading" style="color: #1d4ed8; border-bottom: 2px solid #1d4ed8;">🎥 Licencias${pending ? '' : ' y datos de acceso'}</p>
            <table>
              <thead>
                <tr>
                  <th style="width:28px">#</th>
                  <th>Acceso a Zoom</th>
                  ${hasMoodle ? '<th>Acceso a Moodle</th>' : ''}
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            ${pending ? `
            <div class="warning-box">
              <p style="margin: 0;">🔑 <strong>Las contraseñas de acceso a Zoom se enviarán automáticamente aproximadamente 48 horas antes de la fecha de inicio (<u>${escapeHtml(data.startDate)}</u>)</strong>, en un único correo con todas las licencias. Esto garantiza que recibas contraseñas válidas y actualizadas.</p>
            </div>
            ` : `
            <div class="warning-box">
              <p style="margin: 0 0 6px 0;"><strong>⚠️ Sobre las contraseñas Zoom:</strong></p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Al finalizar las licencias el <strong>${escapeHtml(data.endDate)}</strong>, las contraseñas Zoom se cambiarán automáticamente por razones de seguridad y perderás el acceso a las cuentas.</li>
                <li>Si necesitas extender el período de uso, puedes solicitar una prórroga al administrador antes de la fecha de vencimiento.</li>
                <li>Recibirás un correo de recordatorio unos días antes de que expiren.</li>
              </ul>
            </div>
            `}

            ${hasMoodle ? `
            <div class="danger-box">
              <p style="margin: 0 0 6px 0;"><strong>🚫 MUY IMPORTANTE — NO CAMBIES LAS CONTRASEÑAS DE MOODLE</strong></p>
              <p style="margin: 0;">Las contraseñas de Moodle <strong>NO deben ser modificadas bajo ningún concepto</strong>. Estas cuentas están vinculadas al sistema de gestión de licencias y cualquier cambio de contraseña afectará el acceso de otros usuarios. Si tienes algún inconveniente con el acceso a Moodle, contacta al administrador.</p>
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
   * Send extension confirmation email to teacher (same content, extension-flagged header)
   */
  async sendExtensionConfirmation(data: AssignmentEmailData): Promise<boolean> {
    const html = this.buildAssignmentEmailHtml({ ...data, isExtension: true });
    const sent = await this.sendEmail({
      to: data.teacherEmail,
      subject: `📅 Licencia de Zoom Ampliada - hasta ${data.endDate}`,
      html,
      logType: 'extension_confirmation',
    });

    if (sent) {
      await this.sendAdminCredentialCopy(data, html);
    }

    return sent;
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
      hostKey: '123456',
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

      const sampleSubject = '[MUESTRA] ✅ Licencia de Zoom Asignada — 11/03/2026 a 11/06/2026';
      await this.transporter.sendMail({
        from: from || user || '',
        to: recipientEmail,
        subject: sampleSubject,
        html,
        text: this.stripHtml(html),
      });

      console.log(`✅ Assignment sample email sent to: ${recipientEmail}`);
      this.writeLog({ to: recipientEmail, subject: sampleSubject, html, logType: 'sample' }, 'sent');
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
    const licenseEmails = Array.isArray(data.licenseEmail) ? data.licenseEmail : [data.licenseEmail];
    const many = licenseEmails.length > 1;
    const days = `${data.daysRemaining} día${data.daysRemaining !== 1 ? 's' : ''}`;
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
            <h2>${many ? `⚠️ Tus ${licenseEmails.length} Licencias de Zoom Están por Expirar` : '⚠️ Tu Licencia de Zoom Está por Expirar'}</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${escapeHtml(data.teacherName)}</strong>,</p>
            
            <div class="warning-box">
              <p style="font-size: 18px; margin: 0;"><strong>⏰ ${many ? `Tus ${licenseEmails.length} licencias expiran` : 'Tu licencia expira'} en ${days}</strong></p>
            </div>
            
            <p>${many ? 'Te recordamos que estas licencias de Zoom expiran el mismo día:' : 'Te recordamos que tu licencia de Zoom tiene las siguientes características:'}</p>
            
            <ul>
              ${many
                ? `<li><strong>📧 Licencias:</strong><ul>${licenseEmails.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul></li>`
                : `<li><strong>📧 Email de la Licencia:</strong> ${escapeHtml(licenseEmails[0])}</li>`}
              <li><strong>📅 Fecha de Expiración:</strong> ${escapeHtml(data.endDate)}</li>
            </ul>
            
            <p><strong>¿Qué sucederá después de la expiración?</strong></p>
            <ul>
              <li>🔒 ${many ? 'Las contraseñas serán cambiadas' : 'La contraseña será cambiada'} automáticamente por seguridad</li>
              <li>❌ No podrás acceder ${many ? 'a las cuentas' : 'a la cuenta'} después de la fecha de expiración</li>
              <li>📋 ${many ? 'Las licencias quedarán disponibles' : 'La licencia quedará disponible'} para otros docentes</li>
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
      subject: many
        ? `⚠️ Tus ${licenseEmails.length} Licencias de Zoom Expiran en ${data.daysRemaining} Día${data.daysRemaining !== 1 ? 's' : ''}`
        : `⚠️ Tu Licencia de Zoom Expira en ${data.daysRemaining} Día${data.daysRemaining !== 1 ? 's' : ''}`,
      html,
      logType: 'expiration_warning',
    });
  }

  /**
   * Notify a teacher that their active assignment has been cancelled because
   * an administrator freed the license. The teacher loses access immediately.
   */
  async sendAssignmentCancelled(data: AssignmentCancelledData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
          strong { color: #1f2937; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚫 Acceso a Licencia de Zoom Cancelado</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${data.teacherName}</strong>,</p>

            ${data.started === false
              ? `<p>Te informamos que tu <strong>reserva</strong> de la siguiente licencia de Zoom ha sido
            <strong>cancelada por un administrador</strong>. No llegarás a recibir las claves de acceso.</p>`
              : `<p>Te informamos que tu acceso a la siguiente licencia de Zoom ha sido
            <strong>cancelado por un administrador</strong> y la licencia ha quedado liberada.
            A partir de ahora <strong>ya no podrás acceder a esta cuenta</strong>.</p>`}

            <div class="info-box">
              <p><strong>📧 Email de la Licencia:</strong> ${data.licenseEmail}</p>
              <p><strong>📅 Período asignado originalmente:</strong> ${data.startDate} - ${data.endDate}</p>
            </div>

            ${data.started === false ? '' : `<p>Por motivos de seguridad, la contraseña de la cuenta puede ser modificada, por lo que
            las credenciales que tenías ya no serán válidas.</p>`}

            <p>Si crees que esto es un error o necesitas una licencia para continuar tu actividad,
            por favor contacta al administrador lo antes posible.</p>

            <p>Saludos,<br><strong>Sistema de Gestión de Licencias Zoom</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático. Por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = data.started === false
      ? `🚫 Tu reserva de licencia de Zoom (${data.licenseEmail}) ha sido cancelada`
      : `🚫 Tu licencia de Zoom (${data.licenseEmail}) ha sido cancelada`;
    const sent = await this.sendEmail({
      to: data.teacherEmail,
      subject,
      html,
      logType: 'assignment_cancelled',
    });
    if (sent) {
      await this.sendAdminCopy(`[COPIA ADMIN] 🚫 Cancelada a ${data.teacherName} (${data.licenseEmail})`, html);
    }
    return sent;
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
      logType: 'password_changed',
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
    area: string,
    isExtension: boolean = false
  ): Promise<boolean> {
    const adminEmailsSetting = await settingsService.getSetting('adminNotificationEmails');

    // Normalize: DB may store the value as an array or a comma-separated string
    let emails: string[] = [];
    if (Array.isArray(adminEmailsSetting)) {
      emails = adminEmailsSetting.map((e: string) => e.trim()).filter(Boolean);
    } else if (typeof adminEmailsSetting === 'string' && adminEmailsSetting.trim()) {
      emails = adminEmailsSetting.split(',').map((e: string) => e.trim()).filter(Boolean);
    }

    if (emails.length === 0) {
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
            <h2>${isExtension ? '📅 Solicitud de Ampliación de Licencia Pendiente' : '📋 Nueva Solicitud de Licencia Pendiente'}</h2>
          </div>
          <div class="content">
            <p>Hola Administrador,</p>

            <p>${isExtension
              ? 'Se ha recibido una <strong>solicitud de ampliación</strong> de licencia de Zoom que requiere tu atención.'
              : 'Se ha recibido una <strong>nueva solicitud</strong> de licencia de Zoom que requiere tu atención.'}</p>

            <div class="info-box">
              <p><strong>👤 Docente:</strong> ${teacherName}</p>
              <p><strong>📧 Email:</strong> ${teacherEmail}</p>
              <p><strong>🏢 Área:</strong> ${area}</p>
              <p><strong>📅 Período Solicitado:</strong> ${startDate} - ${endDate}</p>
              ${isExtension ? '<p><strong>🔄 Tipo:</strong> Ampliación de licencia existente</p>' : ''}
            </div>

            <p><strong>Acción requerida:</strong></p>
            <p>${isExtension
              ? 'Por favor, ingresa al Panel de Administración para asignar una licencia disponible al nuevo período de ampliación.'
              : 'Por favor, ingresa al Panel de Administración para asignar una licencia disponible a esta solicitud.'}</p>
            
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
      to: emails,
      subject: isExtension
        ? `📅 Solicitud de Ampliación de Licencia - ${teacherName}`
        : `📋 Nueva Solicitud de Licencia - ${teacherName}`,
      html,
      logType: 'pending_request_notification',
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

      const testSubject = '✅ Prueba de Configuración de Email - Sistema de Licencias Zoom';
      await this.transporter.sendMail({
        // Must match the authenticated account on Office365
        from: from || user || '',
        to: recipientEmail,
        subject: testSubject,
        html,
        text: this.stripHtml(html),
      });

      console.log(`✅ Test email sent to: ${recipientEmail}`);
      this.writeLog({ to: recipientEmail, subject: testSubject, html, logType: 'test' }, 'sent');
      return true;
    } catch (error: any) {
      console.error('❌ Error sending test email:', error.message);
      this.writeLog(
        { to: recipientEmail, subject: '✅ Prueba de Configuración de Email - Sistema de Licencias Zoom', html, logType: 'test' },
        'failed',
        error.message
      );
      throw error; // Re-throw so the route returns the real error message
    }
  }
}

export const emailService = new EmailService();
