import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import TaskModel from "@/models/Task";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";


export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    
    const token = await getToken({req: request})

    if(!token || token.role === 'employee') {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not authenticated or authorozed to do this task.'
        },
        { status: 400 }
      )
    }

    

  } catch (error) {
    console.log("Error occured while creating task.", error)
    return NextResponse.json(
      {
        success: false,
        message: 'There was an error while creating the Task.',
        error
      },
      { status: 500 } 
    )
  }
}