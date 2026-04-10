import dbConnect from "@/lib/dbConnect";
import { MessageModel } from "@/models/Message";
import { RoomModel } from "@/models/Room";
import mongoose from "mongoose";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest, {params}: {params: Promise< {id: string}>}
){
  await dbConnect();

  try {
    const paramsInfo = await params;
    if(!mongoose.Types.ObjectId.isValid(paramsInfo.id)){
      return NextResponse.json(
        {
          success: false,
          message: "No valid room id provided."
        },
        { status: 400 }
      )
    }

    const token = await getToken({req: request});
    if(!token){
      return NextResponse.json(
        {
          success: false,
          message: 'Not Authenticated to get information.'
        },
        { status: 400 }
      )
    }

    const room = await RoomModel.findOne({_id: paramsInfo.id, companyId: token.companyId, participantsId: token._id});
    if(!room){
      return NextResponse.json(
        {
          success: false,
          message: 'No such room found with that id.'
        },
        { status: 404 }
      )
    }

    const messages = await MessageModel.findOne({roomId: paramsInfo.id}).limit(20);
    if(!messages){
      return NextResponse.json(
        {
          success: false,
          message: 'No Messages found.'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Messages Array',
        data: messages
      },
      { status: 200 }
    )

  } catch (error) {
    console.log("There was an error while getting messages.");
    return NextResponse.json(
      {
        success: false,
        message: 'There was an error while getting messages.',
        error
      },
      { status: 500 }
    )
    
  }
}

export async function POST(request: NextRequest, {params}: {params: Promise<{id: string}>}){
  await dbConnect();

  try {
    const paramsInfo = await params;
    if(!mongoose.Types.ObjectId.isValid(paramsInfo.id)){
      return NextResponse.json(
        {
          success: false,
          message: 'Id provided is not valid objected id.'
        },
        { status: 400 }
      )
    }

    const token = await getToken({req: request});
    if(!token){
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authenticated enough to do this task.'
        },
        { status: 400 }
      )
    }

    const body = await request.json();
    

  } catch (error) {
    console.log("There was an error while creating an message.");
    return NextResponse.json(
      {
        success: false,
        message: 'There was an error while creating a message.',
        error
      },
      { status: 500 }
    )
  }
}