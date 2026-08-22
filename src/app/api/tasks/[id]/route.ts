import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import TaskModel from '@/models/Task';
import UserModel from '@/models/User';
import TeamModel from '@/models/Team';
import mongoose from 'mongoose';

/**
 * GET /api/tasks/[id]
 *
 * Returns a single task with fully populated:
 *   - assigneeName, assigneeInitial
 *   - creatorName
 *   - teamName
 *   - comments with commenterName attached
 */
export async function GET(
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
    const task = await TaskModel.findOne({
      _id: id,
      companyId: token.companyId,
    }).lean();

    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    // Collect all user IDs we need to resolve
    const commenterIds = (task.comments ?? []).map((c) => String(c.commenterId));
    const allUserIds = [
      ...new Set([String(task.assignedId), String(task.creatorId), ...commenterIds]),
    ];

    const [users, team] = await Promise.all([
      UserModel.find({ _id: { $in: allUserIds } }, 'name').lean(),
      task.teamId
        ? TeamModel.findById(task.teamId, 'name').lean()
        : Promise.resolve(null),
    ]);

    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u.name as string]));

    const populated = {
      _id:             String(task._id),
      key:             `CS-${String(task._id).slice(-5).toUpperCase()}`,
      title:           task.title,
      description:     task.description ?? '',
      status:          task.status,
      priority:        task.priority,
      assignedId:      String(task.assignedId),
      assigneeName:    userMap[String(task.assignedId)] ?? 'Unassigned',
      assigneeInitial: (userMap[String(task.assignedId)] ?? 'U').charAt(0).toUpperCase(),
      creatorId:       String(task.creatorId),
      creatorName:     userMap[String(task.creatorId)] ?? 'Unknown',
      teamId:          task.teamId ? String(task.teamId) : null,
      teamName:        (team as any)?.name ?? null,
      dueDate:         task.dueDate,
      startDate:       (task as any).startDate ?? null,
      createdAt:       task.createdAt,
      updatedAt:       (task as any).updatedAt,
      attachments:     task.attachments ?? [],
      comments:        (task.comments ?? []).map((c) => ({
        _id:           String(c._id),
        commenterId:   String(c.commenterId),
        commenterName: userMap[String(c.commenterId)] ?? 'Unknown',
        commenterInitial: (userMap[String(c.commenterId)] ?? 'U').charAt(0).toUpperCase(),
        content:       c.content,
        commentedAt:   c.commentedAt,
      })),
    };

    return NextResponse.json({ task: populated });
  } catch (error) {
    console.error('[GET /api/tasks/[id]]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
