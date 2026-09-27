import dbConnect from "@/lib/dbConnect";
import CompanyModel from "@/models/Company";
import Team from "@/models/Team";
import UserModel from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createTeamSchema } from "@/schemas/createTeamShema";
import mongoose from "mongoose";
import TeamModel from "@/models/Team";

/**
 * GET /api/teams
 *
 * Returns teams scoped by role:
 *   admin   → all teams in the company with member count
 *   manager → only their assigned team
 *   employee → []
 */
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const token = await getToken({ req: request });

    if (!token?._id || !token?.companyId) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    if (token.role === "employee") {
      return NextResponse.json({ success: true, data: [] });
    }

    const companyId = new mongoose.Types.ObjectId(String(token.companyId));
    const userId    = new mongoose.Types.ObjectId(String(token._id));

    if (token.role === "admin") {
      const teams = await TeamModel.find({ companyId, isDeleted: { $ne: true } }).lean();

      const teamsWithCounts = await Promise.all(
        teams.map(async (team) => {
          const memberCount = await UserModel.countDocuments({
            "meta.assignedTeamId": team._id,
          });
          return {
            _id:         String(team._id),
            name:        team.name,
            description: team.description ?? "",
            managerId:   team.managerId ? String(team.managerId) : null,
            memberCount,
            createdAt:   team.createdAt,
          };
        })
      );

      return NextResponse.json({ success: true, data: teamsWithCounts });
    }

    // Manager — return only their assigned team
    const team = await TeamModel.findOne({
      managerId: userId,
      companyId,
      isDeleted: { $ne: true },
    }).lean();

    if (!team) {
      return NextResponse.json({ success: true, data: [] });
    }

    const memberCount = await UserModel.countDocuments({
      "meta.assignedTeamId": team._id,
    });

    return NextResponse.json({
      success: true,
      data: [
        {
          _id:         String(team._id),
          name:        team.name,
          description: team.description ?? "",
          managerId:   team.managerId ? String(team.managerId) : null,
          memberCount,
          createdAt:   team.createdAt,
        },
      ],
    });
  } catch (error) {
    console.error("[GET /api/teams]", error);
    return NextResponse.json(
      { success: false, message: "There was an error while fetching teams." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  dbConnect();

  try {
    
    const body = await request.json()
    const parsed = createTeamSchema.safeParse(body)

    if(!parsed.success){
      return NextResponse.json(
        {
          success: false,
          message: 'Field parsing error.',
          error: parsed.error.flatten()
        },
        { status: 400 }
      )
    }

    const token = await getToken({req: request})

    if(!token || token.role === 'employee') {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authenticated to create team.'
        },
        { status: 400 }
      )
    }


    if(!mongoose.Types.ObjectId.isValid(parsed.data.companyId)){
      return NextResponse.json(
        {
          success: false,
          message: 'CompanyId is not valid.'
        },
        { status: 400 }
      )
    }

    if(parsed.data.managerId) {
      if(!mongoose.Types.ObjectId.isValid(parsed.data.managerId)) {
        return NextResponse.json(
          {
            success: false,
            message: 'ManagerId is not valid.'
          },
          { status: 400 }
        )
      }
    }

    const newTeam = new TeamModel({
      name: parsed.data.name,
      description: parsed.data.description || "",
      companyId: parsed.data.companyId,
      managerId: parsed.data.managerId || null,
      createdBy: token._id,
    })
    await newTeam.save();

    if(parsed.data.managerId) {
      const manager = await UserModel.findOne({_id: parsed.data.managerId, role: 'manager', companyId: parsed.data.companyId});

      if(!manager) {
        return NextResponse.json(
          {
            success: false,
            message: 'There is no manager with that id.'
          },
          { status: 400 }
        )
      }

      manager.meta.assignedTeamId = newTeam._id
      await manager.save()
    }

    return NextResponse.json(
      {
        success: true,
        message: 'New Team created.',
        data:  newTeam
      },
      { status: 201 }
    )

  } catch (error) {
    console.log("Error While creating Team.", error);
    return NextResponse.json(
      {
        success: false,
        message: 'There was an error while creating team.'
      },
      { status: 500}
    )
  }
}