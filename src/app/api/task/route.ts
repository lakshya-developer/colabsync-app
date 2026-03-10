import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import TaskModel from "@/models/Task";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createTaskSchema } from "@/schemas/createTaskSchema";
import mongoose from "mongoose";


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

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if(!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Faild parsing error',
          error: parsed.error.flatten()
        },
        { status: 400 }
      )
    }

    if(!mongoose.Types.ObjectId.isValid(parsed.data.companyId) || !mongoose.Types.ObjectId.isValid(parsed.data.creatorId) || !mongoose.Types.ObjectId.isValid(parsed.data.assignedId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Id provided for company, creator or assigned to is not valid'
        },
        { status: 400 }
      )
    }

    const newTask = new TaskModel({
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate,
      priority: parsed.data.priority,
      assignedId: parsed.data.assignedId,
      creatorId: parsed.data.creatorId,
      teamId: parsed.data.teamId,
      companyId: parsed.data.companyId,
      attachments: parsed.data.attachments,
      startDate: parsed.data.startDate
    })
    await newTask.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Task created successfully.',
        data: newTask
      },
      { status: 201 }
    )

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