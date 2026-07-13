import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/**
 * POST /api/socket-token
 *
 * Issues a short-lived JWT for Socket.IO authentication.
 *
 * NextAuth uses JWE (encrypted tokens) which can't be verified
 * by the standalone socket server. This endpoint bridges the gap:
 *   1. Verifies the user is authenticated via NextAuth session
 *   2. Signs a standard JWT with NEXTAUTH_SECRET
 *   3. Client sends this token to Socket.IO handshake
 *   4. Socket server verifies it with the same secret
 *
 * Token lifetime: 12 hours (client should refresh before expiry)
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token || !token._id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("NEXTAUTH_SECRET is not set");
      return NextResponse.json(
        { success: false, message: "Server configuration error" },
        { status: 500 }
      );
    }

    // Sign a standard JWT with the user's essential fields
    const socketToken = jwt.sign(
      {
        _id: token._id,
        email: token.email,
        name: token.name,
        role: token.role,
        companyId: token.companyId,
        isVerified: token.isVerified,
      },
      secret,
      {
        expiresIn: "12h",
        issuer: "collabsync",
        subject: String(token._id),
      }
    );

    return NextResponse.json(
      {
        success: true,
        token: socketToken,
        expiresIn: 12 * 60 * 60, // seconds
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating socket token:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate socket token" },
      { status: 500 }
    );
  }
}
