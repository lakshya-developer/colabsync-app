import dbConnect from "@/lib/dbConnect";
import { RoomModel } from "@/models/Room";
import TeamModel from "@/models/Team";
import { createRoomSchema } from "@/schemas/createRoomSchema";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();

    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Field parsing error.",
          error: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated to create room.",
        },
        { status: 401 },
      );
    }

    const { name, description,type , teamId, companyId, participantsId } =
      parsed.data;

    const team = await TeamModel.findOne({
      _id: teamId,
      companyId,
    });

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Team does not exist.",
        },
        { status: 404 },
      );
    }

    const existingRoom = await RoomModel.findOne({
      name,
      teamId,
      companyId,
    });

    if (existingRoom) {
      return NextResponse.json(
        {
          success: false,
          message: "Room already exists.",
        },
        { status: 409 },
      );
    }

    const newRoom = new RoomModel({
      name,
      description: description || "",
      type,
      teamId,
      companyId,
      participantsId: participantsId || [],
      createdBy: token._id,
    });

    await newRoom.save();

    return NextResponse.json(
      {
        success: true,
        message: "Room created successfully.",
        data: newRoom,
      },
      { status: 201 },
    );
  } catch (error) {
    console.log("Error occured while creating room.", error);

    return NextResponse.json(
      {
        success: false,
        message: "There was an error while creating room.",
      },
      { status: 500 },
    );
  }
}
