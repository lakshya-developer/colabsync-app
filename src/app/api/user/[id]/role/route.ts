import { getToken } from "next-auth/jwt";
import UserModel from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { NextRequest, NextResponse } from "next/server";
import { X } from "lucide-react";
import mongoose from "mongoose";
import { AuditLogModel } from "@/models/AuditLog";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const token = await getToken({ req: request });
    const paramsInfo = await params;

    if (!token || token.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid role",
        },
        { status: 400 },
      );
    }

    // Valid Objected Id
    if (!mongoose.Types.ObjectId.isValid(paramsInfo.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Id not valid",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const allowedFields = ["employee", "manager", "admin"];

    if (!body["role"] || !allowedFields.includes(body["role"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Not a valid role to change."
        },
        { status: 400 }
      )
    }

    const userPrev = await UserModel.findOne({
      _id: paramsInfo.id,
      companyId: token._id,
    }).select("-passwordHashed");

    if (!userPrev) {
      return NextResponse.json(
        {
          success: false,
          message: "No such User with that id found.",
        },
        { status: 404 },
      );
    }

    const user = await UserModel.findByIdAndUpdate(
      { _id: paramsInfo.id, companyId: token.companyId },
      { $set: { role: body["role"] } },
      { new: true },
    ).select("-passwordHashed");

    // 🧾 Audit log
    await AuditLogModel.create({
      action: "USER_ROLE_CHANGE",
      actorId: token._id,
      targetType: "user",
      targetId: user!._id,
      meta: {
        previous: {"Role": userPrev.role},
        current: {"Role": user?.role},
        note: `User ${user!.name} role changed to ${body["role"]} by ${token.name}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User data updated successfuly.",
        data: user,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error occured while updating user data", error);
    return Response.json(
      {
        success: false,
        message: "There was an error while updating user data.",
        error: error,
      },
      { status: 500 },
    );
  }
}
