import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import generateVerificationCode from "@/lib/generateVerificationCode";
import { sendVerificationEmail } from "@/helper/sendVerificationEmail";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return Response.json(
        { success: false, message: "No account found with this email." },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return Response.json(
        { success: false, message: "This account is already verified." },
        { status: 400 }
      );
    }

    // Generate a fresh code
    const { code, codeHash, expiresAt } = await generateVerificationCode();

    user.emailVerification = { codeHash, expiresAt };
    await user.save();

    // Send the email
    const emailResponse = await sendVerificationEmail(email, user.name, code);

    if (!emailResponse.success) {
      return Response.json(
        { success: false, message: emailResponse.message },
        { status: 500 }
      );
    }

    return Response.json(
      { success: true, message: "Verification code sent successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error resending verification code:", error);
    return Response.json(
      { success: false, message: "Failed to resend code. Please try again." },
      { status: 500 }
    );
  }
}
