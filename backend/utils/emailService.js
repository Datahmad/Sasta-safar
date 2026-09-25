const nodemailer = require('nodemailer');
const axios = require('axios');

/**
 * Create SMTP Transporter
 */
function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  // Optimized for Gmail App Passwords
  if (process.env.SMTP_HOST === 'smtp.gmail.com' || (user && user.endsWith('@gmail.com'))) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Send 6-Digit OTP via Email
 */
async function sendEmailOtp({ email, otp, name }) {
  const normEmail = email.toLowerCase().trim();
  const userName = name || 'Traveler';
  const fromAddress = process.env.EMAIL_FROM || '"Sasta Safar" <no-reply@sastasafar.pk>';

  console.log(`\n======================================================`);
  console.log(`🔑 [Sasta Safar Verification OTP]`);
  console.log(`👤 Name:  ${userName}`);
  console.log(`📧 Email: ${normEmail}`);
  console.log(`🔢 OTP:   ${otp} (Valid for 10 minutes)`);
  console.log(`======================================================\n`);

  const transporter = getTransporter();

  if (!transporter) {
    // Development / Default Mode (no SMTP credentials configured in .env yet)
    return {
      sent: false,
      devMode: true,
      otp,
      message: 'SMTP credentials not configured in backend/.env yet. Verification code logged to terminal.',
    };
  }

  try {
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #059669, #0d9488); padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 32px 24px; text-align: center; }
          .otp-box { background: #f0fdf4; border: 2px dashed #059669; border-radius: 12px; padding: 16px; margin: 24px 0; display: inline-block; letter-spacing: 8px; font-size: 32px; font-weight: 900; color: #065f46; font-family: monospace; }
          .info { color: #64748b; font-size: 13px; line-height: 1.6; margin-bottom: 24px; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚗 Sasta Safar</h1>
            <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Smart Route & Fuel Cost Calculator</p>
          </div>
          <div class="content">
            <h2 style="margin: 0 0 8px; font-size: 18px; color: #0f172a;">Verify Your Account</h2>
            <p style="margin: 0; color: #475569; font-size: 14px;">Hi ${userName}, use the code below to complete your registration:</p>
            <div class="otp-box">${otp}</div>
            <p class="info">This code is valid for <strong>10 minutes</strong>. If you did not request this account registration, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Sasta Safar. 100% Free & Open-Source Route Optimization.
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: normEmail,
      subject: `[Sasta Safar] Your Verification Code: ${otp}`,
      text: `Your Sasta Safar verification code is: ${otp}. It expires in 10 minutes.`,
      html: htmlTemplate,
    });

    console.log(`[SMTP Mailer Success]: Sent email to ${normEmail}, messageId: ${info.messageId}`);
    return {
      sent: true,
      devMode: false,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error(`[SMTP Mailer Error]: Failed to send email to ${normEmail}:`, err.message);
    return {
      sent: false,
      devMode: true,
      otp,
      error: err.message,
      message: 'Failed to connect to SMTP server. Verification code available in dev console.',
    };
  }
}

/**
 * Send OTP via WhatsApp Cloud API (if configured in .env)
 */
async function sendWhatsAppOtp({ phone, otp, name }) {
  if (!phone) return { sent: false, message: 'No phone number provided' };

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  console.log(`\n📱 [Sasta Safar WhatsApp OTP]`);
  console.log(`📞 Phone: ${phone}`);
  console.log(`🔢 OTP:   ${otp}`);
  console.log(`======================================================\n`);

  if (!token || !phoneNumberId) {
    return {
      sent: false,
      devMode: true,
      otp,
      message: 'WhatsApp Cloud API credentials not configured in backend/.env.',
    };
  }

  try {
    // Sanitize phone number (e.g. 03001234567 -> 923001234567)
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.slice(1);
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'template',
      template: {
        name: 'sasta_safar_otp',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otp }],
          },
        ],
      },
    };

    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { sent: true, devMode: false, data: res.data };
  } catch (err) {
    console.error('[WhatsApp Cloud API Error]:', err.response?.data || err.message);
    return {
      sent: false,
      devMode: true,
      otp,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}

module.exports = {
  sendEmailOtp,
  sendWhatsAppOtp,
};
