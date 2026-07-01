'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, X, Loader2, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Interest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  message: string | null;
  createdAt: string;
  tenant: { id: string; firstName: string; lastName: string; email: string };
  listing: { id: string; title: string };
}

interface TenantInterest {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  listing: { id: string; title: string; location: string; rent: number; status: string };
}

interface Conversation {
  id: string;
  otherUser: { id: string; firstName: string; lastName: string };
  listing: { id: string; title: string };
  lastMessage: { content: string; createdAt: string } | null;
}

const statusConfig = {
  PENDING: { icon: Clock, color: 'text-amber-600 bg-amber-50', label: 'Pending' },
  ACCEPTED: { icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50', label: 'Accepted' },
  DECLINED: { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Declined' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'OWNER' ? <OwnerDashboard /> : <TenantDashboard />;
}

function ConversationsList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ conversations: Conversation[] }>('/chat/conversations');
        if (res.data) setConversations(res.data.conversations);
      } catch { /* silent */ }
    };
    void load();
  }, []);

  if (conversations.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <MessageCircle className="h-5 w-5" /> Conversations
      </h2>
      <div className="mt-3 space-y-2">
        {conversations.map(c => (
          <button key={c.id} onClick={() => router.push(`/chat/${c.id}`)}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-accent/50 transition-colors text-left">
            <div>
              <p className="font-medium text-card-foreground">{c.otherUser.firstName} {c.otherUser.lastName}</p>
              <p className="text-xs text-muted-foreground">{c.listing.title}</p>
              {c.lastMessage && <p className="mt-1 text-xs text-muted-foreground truncate max-w-xs">{c.lastMessage.content}</p>}
            </div>
            <MessageCircle className="h-4 w-4 text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}

function OwnerDashboard() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ interests: Interest[] }>('/interests/received');
      if (res.data) setInterests(res.data.interests);
    } catch { toast.error('Failed to load interests'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchData();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleAction = async (id: string, status: 'ACCEPTED' | 'DECLINED') => {
    setActionLoading(id);
    setInterests(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    try {
      await api.patch(`/interests/${id}`, { status });
      toast.success(`Interest ${status.toLowerCase()}`);
    } catch {
      setInterests(prev => prev.map(i => i.id === id ? { ...i, status: 'PENDING' } : i));
      toast.error('Action failed');
    }
    setActionLoading(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Interest Requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage tenant interest in your listings</p>
      {interests.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No interest requests yet</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {interests.map(i => {
            const cfg = statusConfig[i.status];
            const Icon = cfg.icon;
            return (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex-1">
                  <p className="font-medium text-card-foreground">{i.tenant.firstName} {i.tenant.lastName}</p>
                  <p className="text-xs text-muted-foreground">Interested in: {i.listing.title}</p>
                  {i.message && <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{i.message}&rdquo;</p>}
                </div>
                <div className="flex items-center gap-2">
                  {i.status === 'PENDING' ? (
                    <>
                      <Button size="sm" variant="outline" disabled={actionLoading === i.id}
                        onClick={() => void handleAction(i.id, 'DECLINED')} className="text-red-600 hover:bg-red-50">
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" disabled={actionLoading === i.id}
                        onClick={() => void handleAction(i.id, 'ACCEPTED')} className="bg-emerald-600 hover:bg-emerald-700">
                        <Check className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.color}`}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConversationsList />
    </div>
  );
}

function TenantDashboard() {
  const [interests, setInterests] = useState<TenantInterest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ interests: TenantInterest[] }>('/interests/mine');
        if (res.data) setInterests(res.data.interests);
      } catch { toast.error('Failed to load interests'); }
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">My Interests</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track your interest requests</p>
      {interests.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No interest requests sent yet</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {interests.map(i => {
            const cfg = statusConfig[i.status];
            const Icon = cfg.icon;
            return (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
                <div>
                  <p className="font-medium text-card-foreground">{i.listing.title}</p>
                  <p className="text-xs text-muted-foreground">{i.listing.location} · ₹{i.listing.rent.toLocaleString()}/mo</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.color}`}>
                  <Icon className="h-3 w-3" /> {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <ConversationsList />
    </div>
  );
}
