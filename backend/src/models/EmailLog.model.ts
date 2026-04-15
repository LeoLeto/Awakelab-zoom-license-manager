import mongoose, { Schema, Document } from 'mongoose';

export type EmailLogType =
  | 'assignment_confirmation'
  | 'pending_request_notification'
  | 'extension_confirmation'
  | 'expiration_warning'
  | 'password_changed'
  | 'admin_copy'
  | 'test'
  | 'sample';

export interface IEmailLog extends Document {
  to: string[];
  subject: string;
  html: string;
  logType: EmailLogType;
  status: 'sent' | 'failed';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    to: [{ type: String, required: true }],
    subject: { type: String, required: true },
    html: { type: String, required: true },
    logType: {
      type: String,
      enum: [
        'assignment_confirmation',
        'pending_request_notification',
        'extension_confirmation',
        'expiration_warning',
        'password_changed',
        'admin_copy',
        'test',
        'sample',
      ],
      default: 'test',
    },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    error: { type: String },
  },
  {
    timestamps: true,
    collection: 'email_logs',
  }
);

EmailLogSchema.index({ createdAt: -1 });
EmailLogSchema.index({ status: 1 });
EmailLogSchema.index({ logType: 1 });

export const EmailLog = mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
