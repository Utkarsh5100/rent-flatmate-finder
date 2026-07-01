'use client';
import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications');
      if (res.data) {
        setNotifications(res.data.notifications);
        setUnread(res.data.unreadCount);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchNotifications();
    }, 0);
    const interval = setInterval(() => void fetchNotifications(), 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* silent */ }
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open) void fetchNotifications(); }}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unread > 0 && (
                <button onClick={() => void markAllRead()} className="text-xs text-primary hover:underline">Mark all read</button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No notifications</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`border-b border-border/50 p-3 text-sm ${!n.read ? 'bg-primary/5' : ''}`}>
                    <p className="font-medium text-card-foreground">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
