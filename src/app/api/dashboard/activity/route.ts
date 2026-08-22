import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import { AuditLogModel } from '@/models/AuditLog';
import UserModel from '@/models/User';
import mongoose from 'mongoose';

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  TASK_CREATED: 'Task created',
  TASK_UPDATED: 'Task updated',
  TASK_COMPLETED: 'Task completed',
  TASK_DELETED: 'Task deleted',
  USER_CREATED: 'Member added',
  USER_UPDATED: 'Member updated',
  USER_DELETED: 'Member removed',
  TEAM_CREATED: 'Team created',
  TEAM_UPDATED: 'Team updated',
  TEAM_DELETED: 'Team deleted',
  COMPANY_UPDATED: 'Company settings updated',
};

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?._id || !token?.companyId) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  // Only admins and managers get the activity feed
  if (token.role === 'employee') {
    return NextResponse.json({ activity: [] });
  }

  await dbConnect();

  try {
    const companyId = new mongoose.Types.ObjectId(String(token.companyId));

    // Fetch last 10 audit log entries for this company
    // AuditLog doesn't have companyId directly — we query by actorId ∈ company users
    const companyUserIds = await UserModel.find({ companyId }, '_id').lean();
    const idSet = companyUserIds.map((u) => u._id as mongoose.Types.ObjectId);

    const logs = await AuditLogModel
      .find({ actorId: { $in: idSet } })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean() as any[];

    // Populate actor names
    const actorIds = [...new Set(logs.map((l: any) => String(l.actorId)))];
    const actors = await UserModel.find(
      { _id: { $in: actorIds } },
      'name',
    ).lean();
    const actorMap = Object.fromEntries(actors.map((a) => [String(a._id), a.name]));

    const activity = logs.map((log: any) => ({
      _id: String(log._id),
      action: ACTION_LABELS[log.action] ?? log.action,
      actorName: actorMap[String(log.actorId)] ?? 'Unknown',
      targetType: log.targetType,
      note: log.meta?.note ?? '',
      time: timeAgo(new Date(log.timestamp)),
    }));

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('[dashboard/activity]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
