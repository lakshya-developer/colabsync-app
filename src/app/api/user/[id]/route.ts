import { getToken } from "next-auth/jwt";
import UserModel from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { NextRequest, NextResponse } from "next/server";
import { X } from "lucide-react";
import mongoose from "mongoose";
import { AuditLogModel } from "@/models/AuditLog";
import { object } from "zod";
import TeamModel from "@/models/Team";

export async function PATCH(request: NextRequest, {params}: {params: {id: string}}) {
  await dbConnect()

  try {

    const token = await getToken({req: request});

    if(!token || token.role !== 'admin' || 'manager') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid role'
        },
        { status: 400 }
      )
    }

    // Valid Objected Id
    if(!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Id not valid'
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const allowedFeilds = ["name", "avatarUrl", "meta"];
    const updates: any = {};

    for(const field in allowedFeilds){
      if(body[field] && body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // If empty updates
    if(Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid update field provided'
        },
        { status: 400 }
      )
    }

    const userPrev = await UserModel.findOne(
      {_id: params.id, companyId: token.companyId}
    ).select("-passwordHashed")

    const user = await UserModel.findByIdAndUpdate(
      {_id: params.id, companyId: token.companyId},
      {$set: updates},
      {new: true}
    ).select("-passwordHashed")

    if(!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'No such User with that id found.'
        },
        { status: 404 }
      )
    }

    await AuditLogModel.create({
      action: "USER_UPDATED",
      actorId: new mongoose.Types.ObjectId(token.id as string),
      targetType: "user",
      targetId: new mongoose.Types.ObjectId(params.id),
      meta: {
        previous: Object.keys(updates).map(field => ({
          field,
          value: (userPrev as any)[field]
        })),
        current: Object.keys(updates).map(field => ({
          field,
          value: (user as any)[field]
        })),
        note: `User ${token.id} updated user ${params.id}`
      }
    })

    
    return NextResponse.json(
      {
        success: true,
        message: 'User data updated successfuly.',
        data: user
      },
      { status: 200 }
    )

  } catch (error) {
    console.log("Error occured while updating user data", error)
    return Response.json(
      {
        success: false,
        message: 'There was an error while updating user data.',
        error: error
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, {params}: {params: {id: string}}) {
  await dbConnect()

  try {
    
    const token = await getToken({req: request});

    if(!token || token.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid role'
        },
        { status: 400 }
      )
    }

    // Valid Objected Id
    if(!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Id not valid'
        },
        { status: 400 }
      )
    }

    const user = await UserModel.findOneAndDelete(
      {_id: params.id, companyId: token.companyId}
    ).select("-passwordHashed")

    if(!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'No such User with that id found.'
        },
        { status: 404 }
      )
    }

    await AuditLogModel.create({
      action: "USER_DELETED",
      actorId: new mongoose.Types.ObjectId(token.id as string),
      targetType: "user",
      targetId: new mongoose.Types.ObjectId(params.id),
      meta: {
        note: `User ${token.id} deleted user ${params.id}`
      }
    })

    
    return NextResponse.json(
      {
        success: true,
        message: 'User deleted successfuly.',
        data: user
      },
      { status: 200 }
    )

  } catch (error) {
    console.log("Error occured while deleting user", error)
    return Response.json(
      {
        success: false,
        message: 'There was an error while deleting user.',
        error: error
      },
      { status: 500 }
    )
  }
}