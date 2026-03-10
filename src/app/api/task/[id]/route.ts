import dbConnect from "@/lib/dbConnect";
import TaskModel from "@/models/Task";
import CompanyModel from "@/models/Company";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { Transaction } from "@/helper/transaction";
import { AuditLogModel } from "@/models/AuditLog";

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
          message: "Provided id is not valid.",
        },
        { status: 400 }
      );
    }

    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Not Authorized or Authenticated for this action.",
        },
        { status: 400 }
      );
    }

    const task = await TaskModel.findOne({
      _id: paramsInfo.id,
      companyId: token.companyId,
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: "Task with that id does not exist.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Task information.",
        data: task,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error occured while getting the task info.");
    return NextResponse.json(
      {
        success: false,
        message: "There was an error while getting the task information.",
        error,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const paramsInfo = await params;
    if(!mongoose.Types.ObjectId.isValid(paramsInfo.id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Task id provided is not valid.'
        },
        { status: 400 }
      )
    }

    const token = await getToken({req: request})

    if(!token || token.role === 'employee') {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authorized to do this task.'
        },
        { status: 400 }
      )
    }

    const task = await TaskModel.findOne({_id: paramsInfo.id, companyId: token.companyId})

    if(!task) {
      return NextResponse.json(
        {
          success: false,
          message: 'Task with that id does not exist.'
        },
        { status: 404 }
      )
    }

    const body = await request.json();
    const allowedFields = ['title','description','status','priority','assignedId','dueDate','attachments','comments']
    const updates: any = {}

    for(const fields of allowedFields) {
      if(body[fields] != undefined) {
        updates[fields] = body[fields]
      }
    }

    // if empty updates
    if(Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid update Provided.'
        },
        { status: 400 }
      )
    }

    const TaskUpdate = await Transaction(async (session) => {
      
      const taskUpdate = await TaskModel.findByIdAndUpdate(
        {_id: paramsInfo.id},
        {$set: updates},
        {new: true}
      ).session(session)

      if(!taskUpdate) {
        return NextResponse.json(
          {
            success: false,
            message: 'Task was not updated.'
          },
          { status: 400 }
        )
      }

      await AuditLogModel.create([{
        action: "TASk_UPDATED",
        actorId: token._id,
        targetType: "task",
        targetId: paramsInfo.id,
        meta: {
          previous: Object.keys(updates).map((field) => ({
            field,
            value: (task as any)[field],
          })),
          current: Object.keys(updates).map((field) => ({
            field,
            value: (taskUpdate as any)[field],
          })),
        },
      }], {session})

    })

    return NextResponse.json(
      {
        success: true,
        message: 'Task was updated.',
        data: TaskUpdate
      },
      { status: 200 }
    )
    

  } catch (error) {
    console.log('Error occured while updating the task info.')
    return NextResponse.json(
      {
        success: false,
        message: 'There was an error while updating the task info.',
        error
      },
      { status: 500 }
    )
  }
}


export async function DELETE(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>}
){

  await dbConnect();

  try {
    const paramsInfo = await params;
    if(!mongoose.Types.ObjectId.isValid(paramsInfo.id)){
      return NextResponse.json(
        {
          success: false,
          message: 'Task id provided is not valid.'
        },
        { status: 400 }
      )
    }

    const token = await getToken({req: request});

    if(!token || token.role === 'employee'){
      return NextResponse.json(
        {
          success:  false,
          message: "You don't have access to delete."
        },
        { status: 400 }
      )
    }

    const taskDelete = await TaskModel.findOneAndDelete({_id: paramsInfo.id, companyId: token.companyId});

    if(!taskDelete){
      return NextResponse.json(
        {
          success: false,
          message: 'Task with that id does not exit.'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Task deleted.',
        data: taskDelete
      },
      { status: 200 }
    )

  } catch (error) {
    console.log("There was an error while deleting the Task:",error);
    return NextResponse.json(
      {
        success: false,
        message: 'There was an errror while deleting the task.',
        error
      },
      { status: 500 }
    )
  }
}