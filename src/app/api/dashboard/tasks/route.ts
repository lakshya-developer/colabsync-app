import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import TaskModel from '@/models/Task';
import TeamModel from '@/models/Team';
import mongoose from 'mongoose';

function formatDue(dueDate: Date): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.floor(
    (due.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?._id || !token?.companyId) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  await dbConnect();

  const userId    = new mongoose.Types.ObjectId(String(token._id));
  const companyId = new mongoose.Types.ObjectId(String(token.companyId));

  try {
    let query: Record<string, unknown>;

    if (token.role === 'manager') {
      // Manager sees tasks across their whole team
      const team = await TeamModel.findOne({
        managerId: userId,
        companyId,
        isDeleted: false,
      }).lean();

      query = team
        ? { teamId: team._id, status: { $ne: 'cancelled' } }
        : { creatorId: userId, status: { $ne: 'cancelled' } };
    } else {
      // Employee sees only their assigned tasks
      query = { assignedId: userId, status: { $ne: 'cancelled' } };
    }

    const tasks = await TaskModel.find(query)
      .sort({ dueDate: 1 })
      .limit(10)
      .lean();

    const formatted = tasks.map((t) => ({
      _id: String(t._id),
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueLabel: formatDue(t.dueDate),
      dueDate: t.dueDate,
      isOverdue:
        t.status !== 'completed' && new Date(t.dueDate) < new Date(),
    }));

    return NextResponse.json({ tasks: formatted });
  } catch (error) {
    console.error('[dashboard/tasks]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
