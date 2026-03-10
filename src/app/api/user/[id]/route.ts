import { getToken } from "next-auth/jwt";
import UserModel from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { NextRequest, NextResponse } from "next/server";
import { X } from "lucide-react";
import mongoose from "mongoose";
import { AuditLogModel } from "@/models/AuditLog";
import { object } from "zod";
import TeamModel from "@/models/Team";
import { Transaction } from "@/helper/transaction";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const token = await getToken({ req: request });
    const paramsInfo = await params;
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated.",
        },
        { status: 400 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(paramsInfo.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Not a valid Id.",
        },
        { status: 400 },
      );
    }

    const user = await UserModel.findOne({_id: paramsInfo.id, companyId: token.companyId})

    if(!user){
      return NextResponse.json(
        {
          succes: false,
          message: 'User you are finding does not exist.'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User data',
        data: user
      },
      { status: 200 }
    )

  } catch (error) {
    console.log("Error occured while getting user info: ", error);
    return NextResponse.json(
      {
        success: false,
        message: "There was an error while geting user information.",
        error,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const token = await getToken({ req: request });
    const paramsInfo = await params;

    if (!token || (token.role !== "admin" && token.role !== "manager")) {
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
    const allowedFields = ["name", "avatarUrl", "meta"];
    const updates: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
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
        { status: 400 },
      );
    }

    const userPrev = await UserModel.findOne({
      _id: paramsInfo.id,
      companyId: token.companyId,
    }).select("-passwordHashed");

    const user = await UserModel.findByIdAndUpdate(
      { _id: paramsInfo.id, companyId: token.companyId },
      { $set: updates },
      { new: true },
    ).select("-passwordHashed");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No such User with that id found.",
        },
        { status: 404 },
      );
    }

    await AuditLogModel.create({
      action: "USER_UPDATED",
      actorId: new mongoose.Types.ObjectId(token._id as string),
      targetType: "user",
      targetId: new mongoose.Types.ObjectId(paramsInfo.id),
      meta: {
        previous: Object.keys(updates).map((field) => ({
          field,
          value: (userPrev as any)[field],
        })),
        current: Object.keys(updates).map((field) => ({
          field,
          value: (user as any)[field],
        })),
        note: `User ${token._id} updated user ${paramsInfo.id}`,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();

  try {
    const token = await getToken({ req: request });
    const paramsInfo = await params;

    if (!token || token.role === "employee") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid role",
        },
        { status: 400 },
      );
    }

    const user = await UserModel.findOne({
      _id: paramsInfo.id,
      companyId: token.companyId,
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No such User with that id found.",
        },
        { status: 404 },
      );
    }

    if (
      (token.role === "manager" && user.role === "manager") ||
      user.role === "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You don't have rights to do that.",
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

    const userDeleteAction = await Transaction(async (session) => {
      const userDelete = await UserModel.deleteOne({
        _id: paramsInfo.id,
        companyId: token.companyId,
      }).session(session);

      if (userDelete.deletedCount === 0 || userDelete.acknowledged === false) {
        return NextResponse.json(
          {
            success: false,
            message: "No user with that id exist.",
          },
          { status: 400 },
        );
      }

      const teamUpdate = await TeamModel.findOneAndUpdate(
        { _id: user.meta.assignedTeamId, companyId: token.companyId },
        {
          $pull: { memberId: paramsInfo.id },
        },
      );

      if (!teamUpdate) {
        return NextResponse.json(
          {
            success: false,
            message: "No team assigned to that user with that id exist.",
          },
          { status: 400 },
        );
      }

      await AuditLogModel.create({
        action: "USER_DELETED",
        actorId: new mongoose.Types.ObjectId(token._id as string),
        targetType: "user",
        targetId: new mongoose.Types.ObjectId(paramsInfo.id),
        meta: {
          note: `User ${token._id} deleted user ${paramsInfo.id}`,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "User deleted successfuly.",
        data: user,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error occured while deleting user", error);
    return Response.json(
      {
        success: false,
        message: "There was an error while deleting user.",
        error: error,
      },
      { status: 500 },
    );
  }
}
