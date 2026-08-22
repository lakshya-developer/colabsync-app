import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import TeamModel from '@/models/Team';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?._id || !token?.companyId) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  // All roles can list members (needed for DM member picker, task assignee picker)
  // Admin gets full details; others get a lightweight subset

  await dbConnect();

  const companyId = new mongoose.Types.ObjectId(String(token.companyId));

  try {
    const users = await UserModel.find(
      { companyId, isVerified: true },
      'name email role isOnline lastActive avatarUrl meta.designation meta.employeeCode meta.assignedTeamId createdAt',
    )
      .sort({ createdAt: -1 })
      .lean();

    // Build a teamId → teamName lookup for display
    const teamIds = [...new Set(
      users
        .map((u) => u.meta?.assignedTeamId)
        .filter(Boolean)
        .map((id) => String(id)),
    )];

    const teams = teamIds.length
      ? await TeamModel.find({ _id: { $in: teamIds } }, 'name').lean()
      : [];

    const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));

    const formatted = users.map((u) => ({
      _id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      isOnline: u.isOnline ?? false,
      lastActive: u.lastActive ?? null,
      avatarUrl: u.avatarUrl ?? null,
      designation: u.meta?.designation ?? '',
      employeeCode: u.meta?.employeeCode ?? '',
      assignedTeamId: u.meta?.assignedTeamId ? String(u.meta.assignedTeamId) : null,
      assignedTeamName: u.meta?.assignedTeamId
        ? (teamMap[String(u.meta.assignedTeamId)] ?? 'Unknown')
        : null,
      joinedAt: u.createdAt,
    }));

    // Non-admins get a lightweight subset
    const output =
      token.role === 'admin'
        ? formatted
        : formatted.map((u) => ({ _id: u._id, name: u.name, isOnline: u.isOnline, avatarUrl: u.avatarUrl, designation: u.designation }));

    return NextResponse.json({ success: true, data: output, users: output, total: output.length });
  } catch (error) {
    console.error('[api/user GET]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
