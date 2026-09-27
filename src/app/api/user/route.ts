import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import TeamModel from '@/models/Team';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '@/helper/sendVerificationEmail';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?._id || !token?.companyId) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  await dbConnect();
  const companyId = new mongoose.Types.ObjectId(String(token.companyId));

  try {
    const users = await UserModel.find(
      { companyId, isVerified: true },
      'name email role isOnline lastActive avatarUrl meta.designation meta.employeeCode meta.assignedTeamId createdAt',
    ).sort({ createdAt: -1 }).lean();

    const teamIds = [...new Set(
      users.map((u) => u.meta?.assignedTeamId).filter(Boolean).map((id) => String(id)),
    )];
    const teams = teamIds.length ? await TeamModel.find({ _id: { $in: teamIds } }, 'name').lean() : [];
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
      assignedTeamName: u.meta?.assignedTeamId ? (teamMap[String(u.meta.assignedTeamId)] ?? 'Unknown') : null,
      joinedAt: u.createdAt,
    }));

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

// ── POST /api/user — Hire a new employee or manager ───────────────────────────
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const token = await getToken({ req: request });

    if (!token?._id || !token?.companyId || token.role === 'employee') {
      return NextResponse.json({ success: false, message: 'Unauthorised.' }, { status: 401 });
    }

    const { name, email, role, designation, teamId, tempPassword } = await request.json();

    if (!name?.trim() || !email?.trim() || !role) {
      return NextResponse.json({ success: false, message: 'Name, email, and role are required.' }, { status: 400 });
    }

    const allowedRoles = token.role === 'admin' ? ['employee', 'manager'] : ['employee'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: `As a ${token.role} you can only hire: ${allowedRoles.join(', ')}.` },
        { status: 403 },
      );
    }

    // Manager: force assign to their own team
    let resolvedTeamId: string | null = teamId ?? null;
    if (token.role === 'manager') {
      const myTeam = await TeamModel.findOne({
        managerId: new mongoose.Types.ObjectId(String(token._id)),
        companyId: new mongoose.Types.ObjectId(String(token.companyId)),
        isDeleted: { $ne: true },
      });
      if (!myTeam) {
        return NextResponse.json({ success: false, message: 'You are not assigned to any team.' }, { status: 400 });
      }
      resolvedTeamId = String(myTeam._id);
    }

    if (resolvedTeamId && !mongoose.Types.ObjectId.isValid(resolvedTeamId)) {
      return NextResponse.json({ success: false, message: 'Invalid teamId.' }, { status: 400 });
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ success: false, message: 'A user with this email already exists.' }, { status: 409 });
    }

    const password = tempPassword?.trim() || generateTempPassword();
    const passwordHashed = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHashed,
      role,
      companyId: new mongoose.Types.ObjectId(String(token.companyId)),
      isVerified: true,
      meta: {
        designation: designation?.trim() ?? '',
        assignedTeamId: resolvedTeamId ? new mongoose.Types.ObjectId(resolvedTeamId) : undefined,
      },
    });

    await newUser.save();

    if (resolvedTeamId) {
      await TeamModel.findByIdAndUpdate(resolvedTeamId, { $addToSet: { memberId: newUser._id } });
    }

    // Send welcome email — passes temp password as the OTP field so the user can sign in
    await sendVerificationEmail(email, name, password);

    return NextResponse.json(
      {
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} hired successfully.`,
        data: {
          _id: String(newUser._id),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          employeeCode: newUser.meta?.employeeCode ?? '',
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[api/user POST]', error);
    return NextResponse.json({ success: false, message: 'Failed to hire member. Please try again.' }, { status: 500 });
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
