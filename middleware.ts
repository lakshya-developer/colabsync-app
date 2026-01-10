import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import UserModel from "@/models/User";
import dbConnect from "@/lib/dbConnect";

export async function middleware(request: NextRequest) {
  const token = await getToken({req: request})

  if(token?._id){
    await dbConnect()

    const user = await UserModel.findOne({_id: token._id});

    if(!user) {
      return NextResponse.next()
    }

    if(!user?.lastActive || Date.now() - user?.lastActive.getTime() > 2 * 60 * 1000){
      user.lastActive = new Date();
      await user.save()
    }

    return NextResponse.next();
  }
}