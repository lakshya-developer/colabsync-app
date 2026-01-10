import { resend } from "@/lib/resend";
import OnboardingEmail from "../../emails/onboardingEmail";
import { ApiResponse } from "@/types/ApiResponse";

export async function sendVerificationEmail(
  name: string,
  email: string,
  password: string,
  role: string,
  companyName: string,
  companyEmail: string
): Promise<ApiResponse> {
  try {
    await resend.emails.send({
      from: companyEmail,
      to: email,
      subject: `Welcome to ${companyName}`,
      react: OnboardingEmail({ name, email, password, role, companyName }),
    });
    return { success: true, message: "Onboarding email send successfully." };
  } catch (error) {
    console.log("Error sending verification email:", error);
    return {
      success: false,
      message: "Failed to send Onboarding email",
      error,
    };
  }
}
