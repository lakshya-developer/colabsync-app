import dbConnect from "@/lib/dbConnect";
import { AuditLogModel } from "@/models/AuditLog";
import TeamModel from "@/models/Team";
import UserModel from "@/models/User";
import mongoose from "mongoose";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Team Id",
        },
        { status: 400 }
      );
    }


    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authorized or authenticated for this action.",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(token.companyId as string)) {
      return NextResponse.json(
        {
          success: false,
          message: "Not a valid company id.",
        },
        { status: 400 }
      );
    }

    const team = await TeamModel.findOne({ _id: params.id, companyId: token.companyId });

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Team with that id not found",
        },
        { status: 400 }
      );
    }

    if (token.companyId !== team.companyId.toString()) {
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

export async function PUT(
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
          message: "Unauthorized.",
        },
        { status: 400 }
      );
    }

    if (mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Team Id",
        },
        { status: 400 }
      );
    }

    const team = await TeamModel.findOne({ _id: params.id, companyId: token.companyId });

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Team with that id not found.",
        },
        { status: 404 }
      );
    }

    if (token.companyId !== team.companyId.toString()) {
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

    for (const fields of allowedFeilds) {
      if (
        body[fields] &&
        body[fields] !== undefined &&
        fields !== "memberIds"
      ) {
        updates[fields] = body[fields];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid update field provided",
        },
        { status: 400 }
      );
    }

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

      const newMembers = users.filter((u) => !team.memberId.some(id => id.equals(u._id)));

      if(newMembers.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "No users provided",
          },
          { status: 400 }
        );
      }

      await TeamModel.updateOne(
        { _id: params.id, companyId: token.companyId },
        { $addToSet: { memberIds: { $each: newMembers.map(u => u._id) } } }
      );
      

      await UserModel.updateMany(
        {_id: {$in: newMembers.map((u) => u._id)}, companyId: token.companyId},
        {$set: {'meta.assignedTeamId': params.id }}
      )
    }

    const updatedTeam = await TeamModel.findOneAndUpdate(
      { _id: params.id, companyId: token.companyId }, 
      { $set: updates },
      { new: true }
    );

    if(!updatedTeam) {
      return NextResponse.json(
        {
          success: false,
          message: "There was a problem while updating."
        },
        { status: 400 }
      );
    }

    if(body.memberIds) {
      updates['memberIds'] = body["memberIds"]
    }

    await AuditLogModel.create({
      action: "TEAM_UPDATED",
      actorId: token._id,
      targetType: "team",
      targetId: params.id,
      meta: {
        previous: Object.keys(updates).map(field => ({
          field,
          value: (team as any)[field]
        })),
        current: Object.keys(updates).map(field => ({
          field,
          value: (updatedTeam as any)[field]
        })),
      }
    });

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


export async function DELETE(request: NextRequest, {params}: {params: {id: string}}) {
  await dbConnect();

  try {
    if(!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Team id is not a valid objeted Id.'
        },
        { status: 400 }
      )
    }

    const token = await getToken({req: request});

    if(!token || token.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authorized or authenticated to delete team.'
        },
        { status: 400 }
      )
    }

    const teamPrev = await TeamModel.findOne({
      _id: params.id,
      companyId: token.companyId
    })

    if(!teamPrev) {
      return NextResponse.json(
        {
          success: false,
          message: 'Team with this id does not exist.'
        },
        { status: 400 }
      )
    }

    const team = await TeamModel.deleteOne({_id: params.id, companyId: token.companyId});

    const manager = await UserModel.updateOne(
      {
        role: 'manager',
        'meta.assignedTeamId': params.id,
        companyId: token.companyId
      },
      {
        $set: {'meta.assignedTeamId': null}
      }
    )

    if(manager.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No manager found or assigned to team.'
        },
        { status: 404}
      )
    }

    const users = await UserModel.updateMany(
      {
        'meta.assignedTeamId': params.id,
        companyId: token.companyId
      },
      { $set: {'meta.assignedTeamId': null} }
    )

    if(users.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No user found assigned to this team.'
        },
        { status: 500 }
      )
    }
    

    await AuditLogModel.create({
      action: "TEAM_DELETED",
      actorId: token._id,
      targetType: 'team',
      targetId: params.id,
      meta: {
        note: `${token.name} with id: ${token._id} deleted team ${teamPrev.name} ${params.id}`
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Team deleted successfully.'
      },
      { status: 200 }
    )

  } catch (error) {
    console.log("Error occured while deleting team.", error)
    return NextResponse.json(
      {
        success: false,
        message: 'There was an error while deleting the team,',
        error,
      },
      { status: 500 }
    )
  }
}