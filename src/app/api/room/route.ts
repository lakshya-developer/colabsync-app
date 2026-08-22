import dbConnect from "@/lib/dbConnect";
import { RoomModel } from "@/models/Room";
import TeamModel from "@/models/Team";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";

// ─── Schema (teamId is now optional for company-wide rooms) ───────────────────

const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  description: z.string().optional().default(""),
  type: z.enum(["general", "team", "direct", "announcement"]),
  participantsId: z.array(z.string()).optional().default([]),
  teamId: z
    .string()
    .refine((id) => mongoose.Types.ObjectId.isValid(id), { message: "Invalid Team ID" })
    .optional()
    .nullable(),
  companyId: z
    .string()
    .refine((id) => mongoose.Types.ObjectId.isValid(id), { message: "Invalid Company ID" }),
});

// ─── GET — List rooms the current user has access to ─────────────────────────

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const token = await getToken({ req: request });

    if (!token || !token._id || !token.companyId) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // optional filter: "general", "direct", "announcement", "team"

    const query: Record<string, unknown> = {
      companyId: token.companyId,
      $or: [
        { participantsId: token._id },
        { type: "announcement" }, // announcements are visible to all in the company
        { type: "general" },      // general channels are visible to all in the company
      ],
    };

    if (type) {
      query.type = type;
      delete query.$or; // when filtering by type, bypass the $or
      if (type === "direct") {
        // DMs — must be a participant
        query.participantsId = token._id;
      }
    }

    const rooms = await RoomModel.find(query)
      .sort({ "meta.lastMessageAt": -1 })
      .limit(50)
      .lean();

    return NextResponse.json(
      { success: true, data: rooms },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch rooms." },
      { status: 500 }
    );
  }
}

// ─── POST — Create a new room ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Field parsing error.", error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const token = await getToken({ req: request });

    if (!token || !token._id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated to create room." },
        { status: 401 }
      );
    }

    const { name, description, type, teamId, companyId, participantsId } = parsed.data;

    // Validate team if provided
    if (teamId) {
      const team = await TeamModel.findOne({ _id: teamId, companyId });
      if (!team) {
        return NextResponse.json(
          { success: false, message: "Team does not exist." },
          { status: 404 }
        );
      }
    }

    // Always include creator as participant
    const allParticipants = Array.from(new Set([token._id.toString(), ...(participantsId ?? [])]));

    // Deduplication logic — for DMs check participants, for others check name
    let existingRoom = null;
    if (type === 'direct' && allParticipants.length === 2) {
      existingRoom = await RoomModel.findOne({
        type: 'direct',
        companyId,
        participantsId: { $all: allParticipants, $size: 2 },
      });
    } else if (type !== 'direct') {
      existingRoom = await RoomModel.findOne({ name, companyId, ...(teamId ? { teamId } : {}) });
    }

    if (existingRoom) {
      // For DMs, returning existing room is the correct behavior
      if (type === 'direct') {
        return NextResponse.json(
          { success: true, message: 'DM room already exists.', data: existingRoom },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'Room with this name already exists.' },
        { status: 409 }
      );
    }

    const newRoom = new RoomModel({
      name,
      description: description || "",
      type,
      ...(teamId ? { teamId } : {}),
      companyId,
      participantsId: allParticipants,
      createdBy: token._id,
    });

    await newRoom.save();

    return NextResponse.json(
      { success: true, message: "Room created successfully.", data: newRoom },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { success: false, message: "There was an error while creating room." },
      { status: 500 }
    );
  }
}
