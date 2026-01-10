import { getToken } from "next-auth/jwt";
import UserModel from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { NextRequest, NextResponse } from "next/server";
import { X } from "lucide-react";
import mongoose from "mongoose";
import { AuditLogModel } from "@/models/AuditLog";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  try {
    const token = await getToken({ req: request });

    if (!token || (token.role !== 'admin' && token.role !== 'manager')) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid role",
        },
        { status: 400 }
      );
    }

    // Valid Objected Id
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Id not valid",
        },
        { status: 400 }
      );
    }

    if (token.role) {
    }

    const body = await request.json();
    const allowedFields = ["name", "avatarUrl", "meta"];
    const updates: any = {};

    for (const field of allowedFeilds) {
      if (body[field] && body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // If empty updates
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid update field provided",
        },
        { status: 400 }
      );
    }

    const userPrev = await UserModel.findOne({_id: params.id, companyId: token._id}).select("-passwordHashed");

    if(!userPrev) {
      return NextResponse.json(
        {
          success: false,
          message: "No such User with that id found.",
        },
        { status: 404 }
      );
    }

    const user = await UserModel.findByIdAndUpdate(
      { _id: params.id, companyId: token.companyId },
      { $set: updates },
      { new: true }
    ).select("-passwordHashed");


    // 🧾 Audit log
    await AuditLogModel.create(
      {
        action: "USER_UPDATED",
        actorId: token._id,
        targetType: "user",
        targetId: user!._id,
        meta: {
          previous: Object.keys(updates).map((field) => ({
            field,
            value: (userPrev as any)[field],
          })),
          current: Object.keys(updates).map((field) => ({
            field,
            value: (user as any)[field],
          })),
          note: `User ${user!.name} updated by ${token.name}`,
        },
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "User data updated successfuly.",
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error occured while updating user data", error);
    return Response.json(
      {
        success: false,
        message: "There was an error while updating user data.",
        error: error,
      },
      { status: 500 }
    );
  }
}
