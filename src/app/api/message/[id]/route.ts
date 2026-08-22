import dbConnect from "@/lib/dbConnect";
import { MessageModel } from "@/models/Message";
import { RoomModel } from "@/models/Room";
import { messageSchema } from "@/schemas/messageSchema";
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
        { success: false, message: "No valid room id provided." },
        { status: 400 }
      );
    }

    const token = await getToken({ req: request });
    if (!token || !token._id) {
      return NextResponse.json(
        { success: false, message: "Not authenticated to get messages." },
        { status: 401 }
      );
    }

    // Allow access to general/announcement rooms without strict participant check
    const room = await RoomModel.findOne({
      _id: paramsInfo.id,
      companyId: token.companyId,
    });
    if (!room) {
      return NextResponse.json(
        { success: false, message: "No such room found." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before"); // cursor: load messages before this ID
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    const query: Record<string, unknown> = { roomId: paramsInfo.id };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    // Fetch messages and populate sender name + avatar
    const messages = await MessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "name avatarUrl")
      .lean();

    // Return in chronological order (oldest first)
    const ordered = [...messages].reverse();

    return NextResponse.json(
      {
        success: true,
        message: "Messages fetched successfully.",
        data: ordered,
        hasMore: messages.length === limit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { success: false, message: "There was an error while getting messages." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const paramsInfo = await params;

    // Validate Room Id from params
    if (
      !mongoose.Types.ObjectId.isValid(paramsInfo.id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Provided room id is not a valid ObjectId.",
        },
        { status: 400 }
      );
    }

    // Authentication
    const token = await getToken({
      req: request,
    });

    if (!token || !token._id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not authenticated to send messages.",
        },
        { status: 401 }
      );
    }

    // Parse Body
    const body = await request.json();

    const parsed =
      messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Field parsing error.",
          error: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Validate Room Exists
    const room = await RoomModel.findById(
      paramsInfo.id
    );

    if (!room) {
      return NextResponse.json(
        {
          success: false,
          message: "Room does not exist.",
        },
        { status: 404 }
      );
    }

    // Optional Security Check
    // Prevent sending message to another room
    if (
      parsed.data.roomId !== paramsInfo.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "RoomId does not match route id.",
        },
        { status: 400 }
      );
    }


    // Prevent fake senderId
    if (
      parsed.data.senderId !==
      token._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "SenderId does not match authenticated user.",
        },
        { status: 403 }
      );
    }

    // Create Message
    const newMessage =
      await MessageModel.create({
        roomId: parsed.data.roomId,
        senderId: parsed.data.senderId,
        content: parsed.data.content,
        attachments:
          parsed.data.attachments || [],
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Message sent successfully.",
        data: newMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.log(
      "There was an error while creating a message.",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "There was an error while creating a message.",
      },
      { status: 500 }
    );
  }
}