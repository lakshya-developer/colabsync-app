import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/check
 *
 * Lightweight credential check that runs BEFORE NextAuth signIn().
 * Purpose: NextAuth v4 with redirect:false squashes all authorize() errors
 * into a generic "CredentialsSignin" error, making it impossible to surface
 * specific messages to the user. This endpoint duplicates the authorize()
 * logic and returns precise, user-friendly error messages.
 *
 * On success → 200 { success: true }
 * On failure → 4xx { success: false, message: "..." }
 */
export async function POST(request: Request) {
  await dbConnect();

  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return Response.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ email: identifier });

    if (!user) {
      return Response.json(
        { success: false, message: "No account found with that email address." },
        { status: 401 }
      );
    }

    if (!user.isVerified) {
      return Response.json(
        {
          success: false,
          message: "Please verify your email before signing in.",
          unverified: true,
        },
        { status: 403 }
      );
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHashed);

    if (!isPasswordCorrect) {
      return Response.json(
        { success: false, message: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    // ✅ Credentials are valid — NextAuth will handle session creation
    return Response.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Error in /api/auth/check:", error);
    return Response.json(
      { success: false, message: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
