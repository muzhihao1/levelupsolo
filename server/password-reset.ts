import crypto from "crypto";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Schema for password reset request
export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

// Schema for password reset
export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

// Generate a secure random token
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Token expiry time (1 hour)
const TOKEN_EXPIRY_HOURS = 1;

// Email configuration (using environment variables)
const createTransporter = () => {
  // In production, you would configure this with a real email service
  // For now, we'll create a placeholder that logs to console
  if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  
  // Development mode - just log emails
  return {
    sendMail: async (options: any) => {
      console.log("📧 Email would be sent:");
      console.log("To:", options.to);
      console.log("Subject:", options.subject);
      console.log("Text:", options.text);
      console.log("HTML:", options.html);
      return { messageId: "dev-" + Date.now() };
    },
  };
};

// Send password reset email
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.FRONTEND_URL || "https://www.levelupsolo.net"}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || "noreply@levelupsolo.net",
    to: email,
    subject: "重置您的 Level Up Solo 密码",
    text: `您好！

您收到此邮件是因为您（或其他人）请求重置您的 Level Up Solo 账户密码。

请点击以下链接重置您的密码：
${resetUrl}

此链接将在 ${TOKEN_EXPIRY_HOURS} 小时后失效。

如果您没有请求重置密码，请忽略此邮件，您的密码将保持不变。

祝好，
Level Up Solo 团队`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6366F1; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #6366F1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>重置密码</h1>
    </div>
    <div class="content">
      <p>您好！</p>
      <p>您收到此邮件是因为您（或其他人）请求重置您的 Level Up Solo 账户密码。</p>
      <p>请点击下面的按钮重置您的密码：</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">重置密码</a>
      </div>
      <p>或者复制以下链接到浏览器：</p>
      <p style="word-break: break-all; background: #eee; padding: 10px;">${resetUrl}</p>
      <p><strong>此链接将在 ${TOKEN_EXPIRY_HOURS} 小时后失效。</strong></p>
      <p>如果您没有请求重置密码，请忽略此邮件，您的密码将保持不变。</p>
    </div>
    <div class="footer">
      <p>祝好，<br>Level Up Solo 团队</p>
    </div>
  </div>
</body>
</html>
    `,
  };
  
  await transporter.sendMail(mailOptions);
}

// Request password reset
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  // Find user by email
  const user = await storage.getUserByEmail(email);
  
  // Always return success message to prevent email enumeration
  if (!user) {
    console.log(`Password reset requested for non-existent email: ${email}`);
    return { message: "如果该邮箱已注册，您将收到密码重置邮件。" };
  }
  
  // Generate token and expiry
  const token = generateResetToken();
  const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  
  // Save token to database
  await storage.setPasswordResetToken(user.id, token, expires);
  
  // Send email
  try {
    await sendPasswordResetEmail(user.email!, token);
    console.log(`Password reset email sent to: ${user.email}`);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    // Don't expose email sending errors to the user
  }
  
  return { message: "如果该邮箱已注册，您将收到密码重置邮件。" };
}

// Reset password with token
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  // Find user by valid reset token
  const user = await storage.getUserByResetToken(token);
  
  if (!user) {
    throw new Error("无效或已过期的重置令牌");
  }
  
  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Update password and clear reset token
  await storage.setUserPassword(user.id, hashedPassword);
  await storage.clearPasswordResetToken(user.id);
  
  console.log(`Password reset successful for user: ${user.id}`);
  
  return { message: "密码已成功重置" };
}