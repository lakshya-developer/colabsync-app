import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import TaskModel from '@/models/Task';
import mongoose from 'mongoose';

/**
 * POST /api/task/[id]/comment
 *
 * Appends a comment to a task.
 * Body: { content: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request });
  if (!token?._id || !token?.companyId) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid task id' }, { status: 400 });
  }

  await dbConnect();

  try {
    const body = await request.json();
    const content = String(body.content ?? '').trim();

    if (!content) {
      return NextResponse.json({ message: 'Comment content is required' }, { status: 400 });
    }

    const task = await TaskModel.findOneAndUpdate(
      { _id: id, companyId: token.companyId },
      {
        $push: {
          comments: {
            commenterId: new mongoose.Types.ObjectId(String(token._id)),
            content,
            commentedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    const added = task.comments?.[task.comments.length - 1];

    return NextResponse.json({
      success: true,
      comment: {
        _id:             String(added?._id),
        commenterId:     String(token._id),
        commenterName:   String(token.name),
        commenterInitial: String(token.name).charAt(0).toUpperCase(),
        content:         added?.content,
        commentedAt:     added?.commentedAt,
      },
    });
  } catch (error) {
    console.error('[POST /api/task/[id]/comment]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
