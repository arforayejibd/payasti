const nodemailer = require('nodemailer');
const { SITE_NAME, SITE_URL, CONTACT } = require('../config/constants');

// Create transporter based on environment or fallback to console logger
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Generate a responsive, aesthetically styled HTML email template for password reset
 */
function getPasswordResetEmailHtml({ name, resetUrl }) {
  const currentYear = new Date().getFullYear();
  const contactEmail = (CONTACT && CONTACT.email) ? CONTACT.email : 'payastimag@gmail.com';
  const logoUrl = `${SITE_URL}/images/Payasti-logo.png`;

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>পাসওয়ার্ড রিসেট অনুরোধ | ${SITE_NAME}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f4f6f8; font-family: 'Hind Siliguri', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2d3748; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .content-cell { padding: 24px 18px !important; }
      .btn-action { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f5;">
  <!-- Preheader text (invisible preview) -->
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    আপনার ${SITE_NAME} অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার লিংক।
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f5; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(7, 86, 3, 0.08); border: 1px solid #e2ece0;">
          
          <!-- Top Accent Line -->
          <tr>
            <td style="background: linear-gradient(90deg, #075603 0%, #068200 100%); height: 6px;"></td>
          </tr>

          <!-- Header / Brand Area -->
          <tr>
            <td align="center" style="padding: 32px 24px 20px; background-color: #ffffff; text-align: center;">
              <a href="${SITE_URL}" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${logoUrl}" alt="${SITE_NAME}" width="160" style="display: block; width: 160px; max-width: 100%; height: auto; margin: 0 auto;">
              </a>
              <div style="margin-top: 8px; font-size: 13px; color: #075603; font-weight: 600; letter-spacing: 0.5px;">
                সাহিত্য স্মারক ও সৃষ্টিশীল প্রকাশনা
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="height: 1px; background-color: #edf2ee; width: 100%;"></div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content-cell" style="padding: 36px 40px; background-color: #ffffff;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1a202c; line-height: 1.4;">
                পাসওয়ার্ড রিসেটের অনুরোধ
              </h1>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #4a5568;">
                প্রিয় <strong>${name || 'লেখক'}</strong>,
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #4a5568;">
                আপনার <strong>${SITE_NAME}</strong> অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার জন্য একটি অনুরোধ পাওয়া গেছে। নতুন পাসওয়ার্ড নির্ধারণ করতে নিচের বাটনে ক্লিক করুন:
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #075603 0%, #068200 100%);">
                    <a href="${resetUrl}" target="_blank" class="btn-action" style="font-size: 17px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 34px; display: inline-block; border-radius: 8px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(7, 86, 3, 0.25);">
                      পাসওয়ার্ড রিসেট করুন
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7faf7; border-left: 4px solid #075603; border-radius: 4px; margin: 24px 0;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #2d3748;">
                      ⏰ <strong>সময়সীমা:</strong> নিরাপত্তার স্বার্থে এই রিসেট লিংকটি আগামী <strong>১ ঘণ্টা</strong>র জন্য কার্যকর থাকবে।
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link Section -->
              <p style="margin: 24px 0 8px; font-size: 14px; line-height: 1.6; color: #718096;">
                যদি উপরের বাটনে ক্লিক করতে কোনো সমস্যা হয়, তবে নিচের লিংকটি কপি করে আপনার ব্রাউজারের অ্যাড্রেস বারে পেস্ট করুন:
              </p>
              <div style="background-color: #edf2f7; padding: 10px 14px; border-radius: 6px; word-break: break-all; font-size: 13px; color: #2b6cb0; line-height: 1.5;">
                <a href="${resetUrl}" target="_blank" style="color: #075603; text-decoration: underline;">${resetUrl}</a>
              </div>

              <!-- Security Disclaimer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e2e8f0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #a0aec0;">
                  🔒 <strong>জরুরি তথ্য:</strong> আপনি যদি এই পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকেন, তবে নির্দ্বিধায় এই ইমেইলটি উপেক্ষা করতে পারেন। আপনার বর্তমান পাসওয়ার্ড ও অ্যাকাউন্ট সম্পূর্ণ নিরাপদ রয়েছে।
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td align="center" style="padding: 24px 30px; background-color: #f0f7ef; text-align: center; border-top: 1px solid #e2ece0;">
              <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #075603;">
                ${SITE_NAME}
              </p>
              <p style="margin: 0 0 12px; font-size: 13px; color: #4a5568;">
                বাংলা সাহিত্য ও সৃষ্টিশীল চিন্তার উন্মুক্ত প্ল্যাটফর্ম
              </p>
              <p style="margin: 0; font-size: 12px; color: #718096; line-height: 1.6;">
                যেকোনো প্রয়োজনে যোগাযোগ: <a href="mailto:${contactEmail}" style="color: #075603; text-decoration: none;">${contactEmail}</a><br>
                © ${currentYear} ${SITE_NAME}। সর্বস্বত্ব সংরক্ষিত।
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send password reset email to user
 */
async function sendPasswordResetEmail(user, resetUrl) {
  const mailHtml = getPasswordResetEmailHtml({
    name: user.display_name || user.username,
    resetUrl
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || `"${SITE_NAME}" <${CONTACT && CONTACT.email ? CONTACT.email : 'noreply@payasti.com'}>`,
    to: user.email,
    subject: `পাসওয়ার্ড রিসেটের অনুরোধ - ${SITE_NAME}`,
    html: mailHtml,
    text: `প্রিয় ${user.display_name || user.username},\n\nআপনার ${SITE_NAME} অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার জন্য নিচের লিংকে প্রবেশ করুন:\n${resetUrl}\n\nএই লিংকটি আগামী ১ ঘণ্টা কার্যকর থাকবে।\n\nআপনি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন।`
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[MAIL] Password reset email sent to ${user.email} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[MAIL ERROR] Failed to send email via SMTP:', error);
      // Fallback log
      console.log(`[MAIL FALLBACK] Reset URL for ${user.email}: ${resetUrl}`);
      return { success: false, error: error.message, resetUrl };
    }
  } else {
    // Development fallback logger
    console.log('=====================================================');
    console.log(`[MAIL DEV MODE] Password Reset Requested for: ${user.email}`);
    console.log(`User: ${user.display_name} (@${user.username})`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('=====================================================');
    return { success: true, devMode: true, resetUrl };
  }
}

module.exports = {
  sendPasswordResetEmail,
  getPasswordResetEmailHtml
};
