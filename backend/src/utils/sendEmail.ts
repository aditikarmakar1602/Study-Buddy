import nodemailer from 'nodemailer';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

const sendEmail = async (options: EmailOptions) => {
  // 1. Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 2. Define the email options
  const message = {
    from: `${process.env.FROM_NAME || 'StudyBuddy AI'} <${process.env.FROM_EMAIL || 'noreply@studybuddy.ai'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // 3. Send the email
  const info = await transporter.sendMail(message);
  console.log('[DEBUG Backend] Message sent: %s', info.messageId);
};

export default sendEmail;