import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import TaskModel from '@/models/Task';
import TeamModel from '@/models/Team';
import UserModel from '@/models/User';
import mongoose from 'mongoose';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDueLabel(dueDate: Date): string {
  const now = new Date();
  const d = new Date(dueDate);
  const diffDays = Math.floor(
    (d.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `${diffDays}d`;
}

function taskKey(id: string): string {
  return `CS-${id.slice(-5).toUpperCase()}`;
}

/**
 * GET /api/tasks
 *
 * Full task list with populated assignee/team names.
 * Scoped by role — admin sees all, manager sees team, employee sees assigned.
 *
 * Query params:
 *   status     — filter by status string
 *   priority   — filter by priority string
 *   assignedId — filter by assignee ObjectId
 *   teamId     — filter by team ObjectId
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?._id || !token?.companyId) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const statusFilter   = searchParams.get('status');
  const priorityFilter = searchParams.get('priority');
  const assignedFilter = searchParams.get('assignedId');
  const teamFilter     = searchParams.get('teamId');

  const companyId = new mongoose.Types.ObjectId(String(token.companyId));
  const userId    = new mongoose.Types.ObjectId(String(token._id));

  try {
    // ── Base query scoped to role ──────────────────────────────────────────────
    const base: Record<string, unknown> = { companyId };

    if (token.role === 'employee') {
      base.assignedId = userId;
    } else if (token.role === 'manager') {
      const team = await TeamModel.findOne({
        managerId: userId,
        companyId,
        isDeleted: false,
      }).lean();
      if (team) {
        base.teamId = team._id;
      } else {
        // No team assigned — show tasks they created or are assigned to
        base.$or = [{ creatorId: userId }, { assignedId: userId }];
      }
    }
    // admin: no additional scope filter

    // ── Apply client filters ───────────────────────────────────────────────────
    if (statusFilter && statusFilter !== 'all')
      base.status = statusFilter;
    if (priorityFilter && priorityFilter !== 'all')
      base.priority = priorityFilter;
    if (assignedFilter && mongoose.Types.ObjectId.isValid(assignedFilter))
      base.assignedId = new mongoose.Types.ObjectId(assignedFilter);
    if (teamFilter && mongoose.Types.ObjectId.isValid(teamFilter))
      base.teamId = new mongoose.Types.ObjectId(teamFilter);

    const tasks = await TaskModel.find(base).sort({ createdAt: -1 }).lean();

    // ── Batch populate assignees + teams ───────────────────────────────────────
    const rawUserIds = [
      ...new Set(
        tasks.flatMap((t) => [String(t.assignedId), String(t.creatorId)]).filter(Boolean),
      ),
    ];
    const rawTeamIds = [
      ...new Set(tasks.map((t) => (t.teamId ? String(t.teamId) : null)).filter(Boolean) as string[]),
    ];

    const [users, teams] = await Promise.all([
      UserModel.find({ _id: { $in: rawUserIds } }, 'name avatarUrl').lean(),
      TeamModel.find({ _id: { $in: rawTeamIds } }, 'name').lean(),
    ]);

    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t.name as string]));

    const now = new Date();

    const formatted = tasks.map((t) => {
      const assignee = userMap[String(t.assignedId)];
      const isOverdue =
        t.status !== 'completed' &&
        t.status !== 'cancelled' &&
        new Date(t.dueDate) < now;

      return {
        _id:             String(t._id),
        key:             taskKey(String(t._id)),
        title:           t.title,
        description:     t.description ?? '',
        status:          t.status,
        priority:        t.priority,
        assignedId:      String(t.assignedId),
        assigneeName:    assignee?.name ?? 'Unassigned',
        assigneeInitial: assignee?.name?.charAt(0)?.toUpperCase() ?? '?',
        creatorId:       String(t.creatorId),
        teamId:          t.teamId ? String(t.teamId) : null,
        teamName:        t.teamId ? (teamMap[String(t.teamId)] ?? null) : null,
        dueDate:         t.dueDate,
        startDate:       (t as any).startDate ?? null,
        dueLabel:        formatDueLabel(t.dueDate),
        isOverdue,
        commentCount:    t.comments?.length ?? 0,
        createdAt:       t.createdAt,
      };
    });

    return NextResponse.json({ tasks: formatted, total: formatted.length });
  } catch (error) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
