import { resend } from "@/lib/resend";
import VerificationEmail  from '../../emails/verificationEmail';
import { ApiResponse } from "@/types/ApiResponse";

export async function sendVerificationEmail(email: string, name: string, verifyCode: string): Promise<ApiResponse> {
  try {
    await resend.emails.send({
      from: 'Acme <onboarding@resend.dev',
      to: email,
      subject: "CollabSync || Verification Email",
      react: VerificationEmail({name, otp: verifyCode}),
    })
    return {success: true, message: "Verification email send successfully."}
  } catch (error) {
    console.log('Error sending verification email:', error);
    return {success: false, message: 'Failed to send verification email', error};
  }
}