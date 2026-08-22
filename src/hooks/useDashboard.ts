'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  role: 'admin' | 'manager' | 'employee';
  // admin
  totalMembers?: number;
  teamsCount?: number;
  onlineMembersCount?: number;
  activeTasks?: number;
  // manager
  teamId?: string | null;
  teamName?: string | null;
  teamSize?: number;
  tasksAssigned?: number;
  tasksCompletedThisWeek?: number;
  overdueCount?: number;
  // employee
  dueToday?: number;
  overdue?: number;
  completedThisWeek?: number;
  inProgress?: number;
}

export interface ActivityItem {
  _id: string;
  action: string;
  actorName: string;
  targetType: string;
  note: string;
  time: string;
}

export interface TeamHealth {
  _id: string;
  name: string;
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
}

export interface TeamMember {
  _id: string;
  name: string;
  designation: string;
  isOnline: boolean;
  activeTasks: number;
}

export interface TaskItem {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueLabel: string;
  dueDate: string;
  isOverdue: boolean;
}

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  time: string;
}

export interface DashboardData {
  stats: DashboardStats | null;
  activity: ActivityItem[];
  teams: TeamHealth[];
  members: TeamMember[];
  tasks: TaskItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboard(): DashboardData {
  const { data: session, status } = useSession();

  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [activity, setActivity]         = useState<ActivityItem[]>([]);
  const [teams, setTeams]               = useState<TeamHealth[]>([]);
  const [members, setMembers]           = useState<TeamMember[]>([]);
  const [tasks, setTasks]               = useState<TaskItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const role = session?.user?.role ?? 'employee';

  const fetchAll = useCallback(async () => {
    if (status !== 'authenticated') return;

    setIsLoading(true);
    setError(null);

    try {
      // Build the list of endpoints to hit based on role
      const endpoints: string[] = ['/api/dashboard/stats'];

      if (role === 'admin') {
        endpoints.push('/api/dashboard/activity', '/api/dashboard/teams');
      } else if (role === 'manager') {
        endpoints.push('/api/dashboard/teams', '/api/dashboard/tasks');
      } else {
        endpoints.push('/api/dashboard/tasks', '/api/dashboard/notifications');
      }

      const responses = await Promise.all(endpoints.map((url) => fetch(url)));
      const data = await Promise.all(responses.map((r) => r.json()));

      // Map results back by index
      let idx = 0;

      // stats is always first
      setStats(data[idx++] as DashboardStats);

      if (role === 'admin') {
        const activityData = data[idx++];
        const teamsData    = data[idx++];
        setActivity(activityData.activity ?? []);
        setTeams(teamsData.teams ?? []);
      } else if (role === 'manager') {
        const teamsData = data[idx++];
        const tasksData = data[idx++];
        setTeams(teamsData.teams ?? []);
        setMembers(teamsData.members ?? []);
        setTasks(tasksData.tasks ?? []);
      } else {
        const tasksData         = data[idx++];
        const notificationsData = data[idx++];
        setTasks(tasksData.tasks ?? []);
        setNotifications(notificationsData.notifications ?? []);
        setUnreadCount(notificationsData.unreadCount ?? 0);
      }
    } catch (err) {
      console.error('[useDashboard]', err);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, [status, role]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    stats,
    activity,
    teams,
    members,
    tasks,
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch: fetchAll,
  };
}
