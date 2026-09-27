import { NextRequest, NextResponse } from "next/server";
import UserModel from "@/models/User";
import dbConnect from "@/lib/dbConnect";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ _id: userId });

    if (user) {
      if (!user.lastActive || Date.now() - user.lastActive.getTime() > 2 * 60 * 1000) {
        user.lastActive = new Date();
        await user.save();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
