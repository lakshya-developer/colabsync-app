import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/dbConnect';
import NotificationModel from '@/models/Notification';
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

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?._id) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(String(token._id));

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const before = searchParams.get('before'); // cursor-based pagination

  try {
    const notifQuery: Record<string, unknown> = { recipientId: userId };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      notifQuery._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const [notifications, unreadCount] = await Promise.all([
      NotificationModel.find(notifQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments({ recipientId: userId, isRead: false }),
    ]);

    const formatted = notifications.map((n) => ({
      _id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body ?? '',
      isRead: n.isRead,
      time: timeAgo(new Date(n.createdAt)),
      createdAt: n.createdAt,
    }));

    return NextResponse.json({ notifications: formatted, unreadCount, hasMore: notifications.length === limit });
  } catch (error) {
    console.error('[dashboard/notifications]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// Mark all as read (or a single one if notificationId is provided)
export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token?._id) {
    return NextResponse.json({ message: 'Unauthorised' }, { status: 401 });
  }

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(String(token._id));

  // Try to parse optional body
  let notificationId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    notificationId = body?.notificationId ?? null;
  } catch { /* no body */ }

  if (notificationId && mongoose.Types.ObjectId.isValid(notificationId)) {
    // Mark single notification as read
    await NotificationModel.updateOne(
      { _id: new mongoose.Types.ObjectId(notificationId), recipientId: userId },
      { $set: { isRead: true, readAt: new Date() } },
    );
  } else {
    // Mark all as read
    await NotificationModel.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  return NextResponse.json({ success: true });
}
