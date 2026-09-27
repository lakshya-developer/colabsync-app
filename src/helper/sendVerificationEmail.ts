import { resend } from "@/lib/resend";
import VerificationEmail from '../../emails/verificationEmail';
import OnboardingEmail from '../../emails/onboardingEmail';
import { ApiResponse } from "@/types/ApiResponse";

export async function sendVerificationEmail(email: string, name: string, verifyCode: string): Promise<ApiResponse> {
  try {
    await resend.emails.send({
      from: 'CollabSync <onboarding@resend.dev>',
      to: 'lakshyav221@gmail.com',
      subject: "CollabSync || Verification Email",
      react: VerificationEmail({ name, otp: verifyCode }),
    })
    return { success: true, message: "Verification email send successfully." }
  } catch (error) {
    console.log('Error sending verification email:', error);
    return { success: false, message: 'Failed to send verification email', error };
  }
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  password: string,
  role: string,
  companyName: string,
): Promise<ApiResponse> {
  try {
    await resend.emails.send({
      from: 'CollabSync <onboarding@resend.dev>',
      to: 'lakshyav221@gmail.com', // dev override — replace with `email` in production
      subject: `Welcome to ${companyName} — Your CollabSync account is ready`,
      react: OnboardingEmail({ name, email, password, role, companyName }),
    });
    return { success: true, message: "Welcome email sent successfully." };
  } catch (error) {
    console.log('Error sending welcome email:', error);
    return { success: false, message: 'Failed to send welcome email', error };
  }
}
