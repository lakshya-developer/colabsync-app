import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import TeamModel from '@/models/Team';
import TaskModel from '@/models/Task';
import UserModel from '@/models/User';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?._id || !token?.companyId) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  if (token.role === 'employee') {
    return NextResponse.json({ teams: [] });
  }

  await dbConnect();

  const companyId = new mongoose.Types.ObjectId(String(token.companyId));
  const userId    = new mongoose.Types.ObjectId(String(token._id));

  try {
    // ── Admin: all teams with health metrics ─────────────────────────────────
    if (token.role === 'admin') {
      const teams = await TeamModel.find({ companyId, isDeleted: false }).lean();

      const teamsWithHealth = await Promise.all(
        teams.map(async (team) => {
          const [totalTasks, completedTasks, memberCount] = await Promise.all([
            TaskModel.countDocuments({ teamId: team._id }),
            TaskModel.countDocuments({ teamId: team._id, status: 'completed' }),
            UserModel.countDocuments({ 'meta.assignedTeamId': team._id }),
          ]);

          const completionPct =
            totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return {
            _id: String(team._id),
            name: team.name,
            memberCount,
            totalTasks,
            completedTasks,
            completionPct,
          };
        }),
      );

      return NextResponse.json({ teams: teamsWithHealth });
    }

    // ── Manager: their single team + member list ──────────────────────────────
    const team = await TeamModel.findOne({
      managerId: userId,
      companyId,
      isDeleted: false,
    }).lean();

    if (!team) {
      return NextResponse.json({ teams: [], members: [] });
    }

    // Get members assigned to this team
    const members = await UserModel.find(
      { 'meta.assignedTeamId': team._id },
      'name isOnline lastActive meta.designation',
    ).lean();

    // Task counts per member this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const membersWithTasks = await Promise.all(
      members.map(async (m) => {
        const [activeTasks] = await Promise.all([
          TaskModel.countDocuments({
            assignedId: m._id,
            teamId: team._id,
            status: { $nin: ['completed', 'cancelled'] },
          }),
        ]);
        return {
          _id: String(m._id),
          name: m.name,
          designation: m.meta?.designation ?? '',
          isOnline: m.isOnline ?? false,
          activeTasks,
        };
      }),
    );

    const [totalTasks, completedTasks] = await Promise.all([
      TaskModel.countDocuments({ teamId: team._id }),
      TaskModel.countDocuments({ teamId: team._id, status: 'completed' }),
    ]);

    const completionPct =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      teams: [
        {
          _id: String(team._id),
          name: team.name,
          memberCount: members.length,
          totalTasks,
          completedTasks,
          completionPct,
        },
      ],
      members: membersWithTasks,
    });
  } catch (error) {
    console.error('[dashboard/teams]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
