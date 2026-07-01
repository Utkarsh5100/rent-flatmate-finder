'use client';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-primary">
              <Home className="h-5 w-5" /> Rent & Flatmate Finder
            </Link>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <span className="text-sm text-muted-foreground">
                {user?.firstName}
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{user?.role}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-1" /> Logout</Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
