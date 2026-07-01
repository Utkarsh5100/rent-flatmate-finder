import nodemailer from 'nodemailer';

import { logger } from '../lib/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function createTransport() {
  const provider = process.env['EMAIL_PROVIDER'] ?? 'nodemailer';

  if (provider === 'resend') {
    // Resend uses SMTP with their gateway
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: process.env['EMAIL_API_KEY'] ?? '' },
    });
  }

  // Default nodemailer SMTP
  return nodemailer.createTransport({
    host: process.env['SMTP_HOST'] ?? 'smtp.gmail.com',
    port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
    secure: false,
    auth: {
      user: process.env['SMTP_USER'] ?? '',
      pass: process.env['SMTP_PASS'] ?? '',
    },
  });
}

/**
 * Send an email. Non-blocking — logs failure but never throws.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const from = process.env['EMAIL_FROM'] ?? 'noreply@rentfinder.com';
    const transport = createTransport();
    await transport.sendMail({ from, ...options });
    logger.info({ to: options.to, subject: options.subject }, 'Email sent');
    return true;
  } catch (err) {
    logger.error({ err, to: options.to }, 'Email send failed — non-blocking');
    return false;
  }
}

/** Email: owner notified of high-score tenant interest */
export function sendHighScoreInterestEmail(ownerEmail: string, tenantName: string, listingTitle: string, score: number) {
  void sendEmail({
    to: ownerEmail,
    subject: `🔥 High-match tenant interested in "${listingTitle}"`,
    html: `<h2>Great news!</h2><p><strong>${tenantName}</strong> (compatibility score: <strong>${score}/100</strong>) has expressed interest in your listing "<strong>${listingTitle}</strong>".</p><p>Log in to review and respond.</p>`,
  });
}

/** Email: tenant notified of owner decision */
export function sendInterestDecisionEmail(tenantEmail: string, listingTitle: string, status: 'ACCEPTED' | 'DECLINED') {
  const emoji = status === 'ACCEPTED' ? '✅' : '❌';
  void sendEmail({
    to: tenantEmail,
    subject: `${emoji} Your interest in "${listingTitle}" was ${status.toLowerCase()}`,
    html: `<h2>Interest Update</h2><p>The owner of "<strong>${listingTitle}</strong>" has <strong>${status.toLowerCase()}</strong> your interest request.</p>${status === 'ACCEPTED' ? '<p>You can now start a conversation!</p>' : '<p>Keep browsing for other listings.</p>'}`,
  });
}
