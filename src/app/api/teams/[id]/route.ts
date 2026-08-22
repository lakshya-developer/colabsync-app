import { Transaction } from "@/helper/transaction";
import dbConnect from "@/lib/dbConnect";
import { AuditLogModel } from "@/models/AuditLog";
import TeamModel from "@/models/Team";
import UserModel from "@/models/User";
import mongoose from "mongoose";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const paramsInfo = await params;
    if (!mongoose.Types.ObjectId.isValid(paramsInfo.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Team Id",
        },
        { status: 400 }
      );
    }

    const token = await getToken({ req: request });

    if (!token || !token.companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authorized or authenticated for this action.",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(token.companyId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Not a valid company id.",
        },
        { status: 400 }
      );
    }

    const team = await TeamModel.findOne({
      _id: paramsInfo.id,
      companyId: token.companyId,
    });

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Team with that id not found",
        },
        { status: 400 }
      );
    }

    if (token.companyId !== team.companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "Not in valid company to access the info.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Team Info",
        data: team,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error occured while getting team information.");
    return NextResponse.json(
      {
        success: false,
        message: "There was an error while getting teams information.",
        error,
      },
      { status: 500 }
    );
  }
}

// ─── PATCH — alias for PUT (frontend uses PATCH for rename) ──────────────────

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const token = await getToken({ req: request });
    const paramsInfo = await params;

    if (!token || (token.role !== "admin" && token.role !== "manager")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(paramsInfo.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Team Id",
        },
        { status: 400 }
      );
    }

    const team = await TeamModel.findOne({
      _id: paramsInfo.id,
      companyId: token.companyId,
    });

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Team with that id not found.",
        },
        { status: 404 }
      );
    }

    if (token.companyId !== team.companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "Not in valid company to access the info.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const allowedFields = ["name", "description", "memberIds"];
    const updates: any = {};

    for (const fields of allowedFields) {
      if (
        body[fields] &&
        body[fields] !== undefined &&
        fields !== "memberIds"
      ) {
        updates[fields] = body[fields];
      }
    }
    

    if (Object.keys(updates).length === 0 && !body.memberIds) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid update field provided",
        },
        { status: 400 }
      );
    }

    const teamUpdate = await Transaction(async (session) => {
      if (body.memberIds) {
        const users = await UserModel.find({
          _id: { $in: body.memberIds },
          companyId: token.companyId,
          role: "employee",
        });
  
        if (users.length === 0) {
          return NextResponse.json(
            {
              success: false,
              message: "No new users provided",
            },
            { status: 400 }
          );
        }
  
        const newMembers = users.filter(
          (u) => !team.memberId.some((users) => users.equals(u._id))
        );
  
        if (newMembers.length === 0) {
          return NextResponse.json(
            {
              success: false,
              message: "No users provided",
            },
            { status: 400 }
          );
        }
  
        await TeamModel.updateOne(
          { _id: paramsInfo.id, companyId: token.companyId },
          { $addToSet: { memberId: { $each: newMembers.map((id) => id) } } }
        ).session(session);
  
        await UserModel.updateMany(
          {
            _id: { $in: newMembers.map((u) => u._id) },
            companyId: token.companyId,
          },
          { $set: { "meta.assignedTeamId": paramsInfo.id } }
        ).session(session);
      }
  
      const updatedTeam = await TeamModel.findOneAndUpdate(
        { _id: paramsInfo.id, companyId: token.companyId },
        { $set: updates },
        { new: true }
      ).session(session);
  
      if (!updatedTeam) {
        return NextResponse.json(
          {
            success: false,
            message: "There was a problem while updating.",
          },
          { status: 400 }
        );
      }
  
      if (body.memberIds) {
        updates["memberIds"] = body["memberIds"];
      }
  
      await AuditLogModel.create([{
        action: "TEAM_UPDATED",
        actorId: token._id,
        targetType: "team",
        targetId: paramsInfo.id,
        meta: {
          previous: Object.keys(updates).map((field) => ({
            field,
            value: (team as any)[field],
          })),
          current: Object.keys(updates).map((field) => ({
            field,
            value: (updatedTeam as any)[field],
          })),
        },
      }], { session });
    })

    return NextResponse.json(
      {
        success: true,
        message: "Team info updated",
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error occured while updating teams info.");
    return NextResponse.json(
      {
        success: false,
        message: "There was an error while updating team info.",
        error,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{id: string}>}
){
  await dbConnect();

  try {
    const paramsInfo = await params;
    if(!mongoose.Types.ObjectId.isValid(paramsInfo.id)){
      return NextResponse.json(
        {
          success: false,
          message: 'Team Id is not a valid objected Id.'
        },
        { status: 400 }
      )
    }

    const token = await getToken({ req: request });

    if(!token || token.role === 'employee') {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authenticated or authorized to do this task.'
        },
        { status: 400 }
      )
    }

    let teamPrev;
    if(token.role === 'admin'){
      teamPrev = await TeamModel.findOne({_id: paramsInfo.id, companyId: token.companyId});
    } else{
      teamPrev = await TeamModel.findOne({_id: paramsInfo.id, companyId: token.companyId, createdBy: token._id});
    }

    if(!teamPrev){
      return NextResponse.json(
        {
          success: false,
          message: 'No such Team exist with that id or you are not authorized to remove.'
        },
        { status: 404 }
      )
    }

    const removeTeam = await Transaction(async (session) => {
      const teamRemove = await TeamModel.findOneAndUpdate(
        { _id: paramsInfo.id, companyId: token.companyId },
        { $set: { "isDeleted": true } }
      ).session(session)

      await AuditLogModel.create([{
        action: "TEAM_REMOVED",
        actorId: token._id,
        targetType: "team",
        targetId: paramsInfo.id,
        meta: {
          note: `${token.name} with id: ${token._id} removed team ${teamPrev.name} with id:  ${paramsInfo.id}`,
        },
      }], { session });

      return teamPrev;
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Team removed successfully.',
        data: removeTeam
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.log("There was an error while removing Team: ", error);
    return NextResponse.json(
      {
        success: false,
        message: 'There was an error while removing Team.',
        error
      },
      { status: 500 }
    )
    
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const paramsInfo = await params;
    if (!mongoose.Types.ObjectId.isValid(paramsInfo.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Team id is not a valid objeted Id.",
        },
        { status: 400 }
      );
    }

    const token = await getToken({ req: request });

    if (!token || token.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Not authorized or authenticated to delete team.",
        },
        { status: 400 }
      );
    }

    const teamPrev = await TeamModel.findOne({
      _id: paramsInfo.id,
      companyId: token.companyId,
    });

    if (!teamPrev) {
      return NextResponse.json(
        {
          success: false,
          message: "Team with this id does not exist.",
        },
        { status: 400 }
      );
    }

    const deleteTeam = await Transaction(async (session) => {
      const team = await TeamModel.deleteOne({
        _id: paramsInfo.id,
        companyId: token.companyId,
      }).session(session);

      // Clear manager assignment if one exists
      await UserModel.updateOne(
        {
          role: "manager",
          "meta.assignedTeamId": paramsInfo.id,
          companyId: token.companyId,
        },
        {
          $set: { "meta.assignedTeamId": null },
        }
      ).session(session);

      // Clear member assignments
      await UserModel.updateMany(
        {
          "meta.assignedTeamId": paramsInfo.id,
          companyId: token.companyId,
        },
        { $set: { "meta.assignedTeamId": null } }
      ).session(session);

      await AuditLogModel.create([{
        action: "TEAM_DELETED",
        actorId: token._id,
        targetType: "team",
        targetId: paramsInfo.id,
        meta: {
          note: `${token.name} with id: ${token._id} deleted team ${teamPrev.name} ${paramsInfo.id}`,
        },
      }], { session });

      return teamPrev;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Team deleted successfully.",
        data: deleteTeam
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error occured while deleting team.", error);
    return NextResponse.json(
      {
        success: false,
        message: "There was an error while deleting the team,",
        error,
      },
      { status: 500 }
    );
  }
}