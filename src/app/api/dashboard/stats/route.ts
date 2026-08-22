import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import TaskModel from '@/models/Task';
import TeamModel from '@/models/Team';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?._id || !token?.companyId) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  await dbConnect();

  const companyId = new mongoose.Types.ObjectId(String(token.companyId));
  const userId    = new mongoose.Types.ObjectId(String(token._id));
  const now       = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  try {
    // ── Admin stats ─────────────────────────────────────────────────────────
    if (token.role === 'admin') {
      const [totalMembers, teamsCount, onlineMembersCount, activeTasks] = await Promise.all([
        UserModel.countDocuments({ companyId, isVerified: true }),
        TeamModel.countDocuments({ companyId, isDeleted: false }),
        UserModel.countDocuments({
          companyId,
          isOnline: true,
        }),
        TaskModel.countDocuments({
          companyId,
          status: { $nin: ['completed', 'cancelled'] },
        }),
      ]);

      return NextResponse.json({
        role: 'admin',
        totalMembers,
        teamsCount,
        onlineMembersCount,
        activeTasks,
      });
    }

    // ── Manager stats (scoped to their team) ─────────────────────────────────
    if (token.role === 'manager') {
      const team = await TeamModel.findOne({ managerId: userId, companyId, isDeleted: false });
      const teamId = team?._id;

      const [teamSize, tasksAssigned, tasksCompletedThisWeek, overdueCount] = await Promise.all([
        teamId ? UserModel.countDocuments({ 'meta.assignedTeamId': teamId }) : Promise.resolve(0),
        teamId
          ? TaskModel.countDocuments({ teamId, status: { $nin: ['completed', 'cancelled'] } })
          : TaskModel.countDocuments({ creatorId: userId, status: { $nin: ['completed', 'cancelled'] } }),
        teamId
          ? TaskModel.countDocuments({
              teamId,
              status: 'completed',
              updatedAt: { $gte: weekStart },
            })
          : Promise.resolve(0),
        teamId
          ? TaskModel.countDocuments({
              teamId,
              status: { $nin: ['completed', 'cancelled'] },
              dueDate: { $lt: now },
            })
          : Promise.resolve(0),
      ]);

      return NextResponse.json({
        role: 'manager',
        teamId: teamId?.toString() ?? null,
        teamName: team?.name ?? null,
        teamSize,
        tasksAssigned,
        tasksCompletedThisWeek,
        overdueCount,
      });
    }

    // ── Employee stats (scoped to self) ──────────────────────────────────────
    const [dueToday, overdue, completedThisWeek, inProgress] = await Promise.all([
      TaskModel.countDocuments({
        assignedId: userId,
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999)),
        },
      }),
      TaskModel.countDocuments({
        assignedId: userId,
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: { $lt: new Date() },
      }),
      TaskModel.countDocuments({
        assignedId: userId,
        status: 'completed',
        updatedAt: { $gte: weekStart },
      }),
      TaskModel.countDocuments({
        assignedId: userId,
        status: 'in_progress',
      }),
    ]);

    return NextResponse.json({
      role: 'employee',
      dueToday,
      overdue,
      completedThisWeek,
      inProgress,
    });
  } catch (error) {
    console.error('[dashboard/stats]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
