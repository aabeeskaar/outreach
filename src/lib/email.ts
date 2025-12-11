import nodemailer from "nodemailer";

// Create transporter based on environment variables
function getTransporter() {
  // Check for SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to Gmail app-specific password if configured
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  return null;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendBroadcastEmail(options: SendEmailOptions): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) {
    console.error("No email transporter configured. Set SMTP_* or GMAIL_* environment variables.");
    return false;
  }

  try {
    const fromEmail = options.from || process.env.SMTP_FROM || process.env.GMAIL_USER || "noreply@outreachai.com";

    await transporter.sendMail({
      from: `OutreachAI <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendBulkEmails(
  recipients: Array<{ email: string; name?: string }>,
  subject: string,
  htmlTemplate: string,
  onProgress?: (sent: number, failed: number) => void
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    // Personalize template if name is available
    const personalizedHtml = htmlTemplate
      .replace(/{{name}}/g, recipient.name || "there")
      .replace(/{{email}}/g, recipient.email);

    const success = await sendBroadcastEmail({
      to: recipient.email,
      subject,
      html: personalizedHtml,
    });

    if (success) {
      sent++;
    } else {
      failed++;
    }

    if (onProgress) {
      onProgress(sent, failed);
    }

    // Small delay between emails to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { sent, failed };
}

export function isEmailConfigured(): boolean {
  return !!(
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
    (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
  );
}
