'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Users,
  Home,
  CheckCircle,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  Trash2,
  Loader2,
  PieChart as ChartIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StatsData {
  stats: {
    totalUsers: number;
    totalListings: number;
    totalAcceptedMatches: number;
    totalChats: number;
  };
  usersByRole: { role: string; count: number }[];
  listingsByStatus: { status: string; count: number }[];
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'TENANT' | 'OWNER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Listing {
  id: string;
  title: string;
  location: string;
  rent: number;
  status: 'ACTIVE' | 'FILLED';
  createdAt: string;
  owner: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'listings'>('stats');
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  // Search & Pagination States
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);

  const [listingSearch, setListingSearch] = useState('');
  const [listingPage, setListingPage] = useState(1);
  const [listingTotalPages, setListingTotalPages] = useState(1);

  // Loading States
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Load Stats ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await api.get<StatsData>('/admin/stats');
      if (res.data) {
        setStatsData(res.data);
      }
    } catch {
      toast.error('Failed to load platform stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ── Load Users ────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get<{
        users: User[];
        pagination: { totalPages: number };
      }>(`/admin/users?search=${encodeURIComponent(userSearch)}&page=${userPage}&limit=10`);
      if (res.data) {
        setUsers(res.data.users);
        setUserTotalPages(res.data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch, userPage]);

  // ── Load Listings ──────────────────────────────────────────────────────────
  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await api.get<{
        listings: Listing[];
        pagination: { totalPages: number };
      }>(`/admin/listings?search=${encodeURIComponent(listingSearch)}&page=${listingPage}&limit=10`);
      if (res.data) {
        setListings(res.data.listings);
        setListingTotalPages(res.data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load listings');
    } finally {
      setLoadingListings(false);
    }
  }, [listingSearch, listingPage]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadStats();
    }, 0);
    return () => clearTimeout(t);
  }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === 'users') void loadUsers();
      if (activeTab === 'listings') void loadListings();
    }, 0);
    return () => clearTimeout(t);
  }, [activeTab, loadUsers, loadListings]);

  // ── Action: Toggle User Active Status ──────────────────────────────────────
  const handleToggleUser = async (userId: string) => {
    setActionLoading(userId);
    // Optimistic toggle
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    );

    try {
      await api.patch<{ user: User }>(`/admin/users/${userId}/toggle-active`);
      toast.success('User status updated');
      void loadStats(); // refresh counts
    } catch (err: unknown) {
      // Revert
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
      );
      const error = err as { message?: string };
      toast.error(error.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Action: Remove Listing ─────────────────────────────────────────────────
  const handleRemoveListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to permanently delete this listing?')) return;
    setActionLoading(listingId);

    try {
      await api.delete(`/admin/listings/${listingId}`);
      toast.success('Listing permanently removed');
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      void loadStats(); // refresh counts
    } catch {
      toast.error('Failed to remove listing');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage users, monitor listings, and view real-time platform metrics.
          </p>
        </div>

        <div className="flex gap-1.5 rounded-lg bg-secondary p-1">
          <button
            onClick={() => setActiveTab('stats')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'stats'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'listings'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Listings
          </button>
        </div>
      </div>

      {/* ─── TAB: OVERVIEW ────────────────────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : statsData ? (
            <>
              {/* Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Total Users</span>
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-2.5">
                    <span className="text-3xl font-bold text-card-foreground">
                      {statsData.stats.totalUsers.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Total Listings</span>
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-2.5">
                    <span className="text-3xl font-bold text-card-foreground">
                      {statsData.stats.totalListings.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Accepted Matches</span>
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-2.5">
                    <span className="text-3xl font-bold text-card-foreground">
                      {statsData.stats.totalAcceptedMatches.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Active Chats</span>
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-2.5">
                    <span className="text-3xl font-bold text-card-foreground">
                      {statsData.stats.totalChats.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom SVG Charts */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Users by Role Chart */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-card-foreground flex items-center gap-1.5 mb-6">
                    <ChartIcon className="h-4 w-4 text-primary" /> Users by Role
                  </h3>
                  <div className="flex flex-col gap-5">
                    {statsData.usersByRole.map((item, idx) => {
                      const percentage =
                        statsData.stats.totalUsers > 0
                          ? (item.count / statsData.stats.totalUsers) * 100
                          : 0;
                      const colors = [
                        'bg-primary',
                        'bg-amber-500',
                        'bg-slate-500',
                      ];
                      const colorClass = colors[idx % colors.length] || 'bg-primary';

                      return (
                        <div key={item.role} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">{item.role}</span>
                            <span className="text-card-foreground">
                              {item.count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colorClass} transition-all duration-1000`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Listings by Status Chart */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-card-foreground flex items-center gap-1.5 mb-6">
                    <ChartIcon className="h-4 w-4 text-primary" /> Listings by Status
                  </h3>
                  <div className="flex flex-col gap-5">
                    {statsData.listingsByStatus.map((item, idx) => {
                      const percentage =
                        statsData.stats.totalListings > 0
                          ? (item.count / statsData.stats.totalListings) * 100
                          : 0;
                      const colors = ['bg-emerald-500', 'bg-slate-400'];
                      const colorClass = colors[idx % colors.length] || 'bg-primary';

                      return (
                        <div key={item.status} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">{item.status}</span>
                            <span className="text-card-foreground">
                              {item.count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colorClass} transition-all duration-1000`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground">No data available.</p>
          )}
        </div>
      )}

      {/* ─── TAB: USERS ───────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setUserPage(1);
              }}
              placeholder="Search users by name or email..."
              className="pl-9"
            />
          </div>

          {loadingUsers ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Registered</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 font-medium text-card-foreground">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="p-4 text-muted-foreground">{u.email}</td>
                        <td className="p-4">
                          <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant={u.isActive ? 'destructive' : 'default'}
                            size="sm"
                            disabled={actionLoading === u.id}
                            onClick={() => void handleToggleUser(u.id)}
                            className="h-8 gap-1.5"
                          >
                            {actionLoading === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : u.isActive ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                            {u.isActive ? 'Suspend' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {userTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border p-4 bg-muted/10">
                  <span className="text-xs text-muted-foreground">
                    Page {userPage} of {userTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userPage === 1}
                      onClick={() => setUserPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userPage === userTotalPages}
                      onClick={() => setUserPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: LISTINGS ────────────────────────────────────────────────────── */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={listingSearch}
              onChange={(e) => {
                setListingSearch(e.target.value);
                setListingPage(1);
              }}
              placeholder="Search listings by title or location..."
              className="pl-9"
            />
          </div>

          {loadingListings ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
              <p className="text-muted-foreground">No listings found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                      <th className="p-4">Listing Title</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Owner</th>
                      <th className="p-4">Rent</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {listings.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 font-medium text-card-foreground">
                          {l.title}
                        </td>
                        <td className="p-4 text-muted-foreground">{l.location}</td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-card-foreground">
                              {l.owner.firstName} {l.owner.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {l.owner.email}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-card-foreground">
                          ₹{l.rent.toLocaleString()}/mo
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              l.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={actionLoading === l.id}
                            onClick={() => void handleRemoveListing(l.id)}
                            className="h-8 gap-1.5"
                          >
                            {actionLoading === l.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {listingTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border p-4 bg-muted/10">
                  <span className="text-xs text-muted-foreground">
                    Page {listingPage} of {listingTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={listingPage === 1}
                      onClick={() => setListingPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={listingPage === listingTotalPages}
                      onClick={() => setListingPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
