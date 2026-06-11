"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendEmail = async (options) => {
    // 1. Create a transporter
    const transporter = nodemailer_1.default.createTransport({
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
exports.default = sendEmail;
