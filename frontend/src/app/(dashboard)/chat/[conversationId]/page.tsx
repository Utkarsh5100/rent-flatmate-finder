'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, ArrowLeft, Loader2, WifiOff, Wifi } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Socket } from 'socket.io-client';

interface Message {
  id: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  tempId?: string;
  pending?: boolean;
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load message history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get<{ messages: Message[] }>(`/chat/${conversationId}/messages`);
        if (res.data) setMessages(res.data.messages);
      } catch { /* silent */ }
      setLoading(false);
    };
    void loadHistory();
  }, [conversationId]);

  // Socket connection
  useEffect(() => {
    if (!user) return;
    let socket: Socket;
    try {
      socket = getSocket();
      socketRef.current = socket;
    } catch {
      return;
    }

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:conversation', conversationId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('message:new', (msg: Message) => {
      setMessages(prev => {
        // Reconcile optimistic message
        if (msg.tempId) {
          const exists = prev.find(m => m.tempId === msg.tempId);
          if (exists) return prev.map(m => m.tempId === msg.tempId ? { ...msg, pending: false } : m);
        }
        // Deduplicate by id
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('typing:start', () => setTyping(true));
    socket.on('typing:stop', () => setTyping(false));

    socket.on('messages:read', () => {
      setMessages(prev => prev.map(m => m.senderId === user.id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m));
    });

    if (socket.connected) {
      setTimeout(() => setConnected(true), 0);
      socket.emit('join:conversation', conversationId);
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('messages:read');
      disconnectSocket();
    };
  }, [conversationId, user]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = () => {
    if (!input.trim() || !socketRef.current) return;
    const tempId = `temp-${Date.now()}`;

    // Optimistic add
    setMessages(prev => [...prev, {
      id: tempId, senderId: user!.id, content: input.trim(),
      readAt: null, createdAt: new Date().toISOString(), tempId, pending: true,
    }]);

    socketRef.current.emit('message:send', { conversationId, content: input.trim(), tempId });
    setInput('');
  };

  const handleTyping = () => {
    socketRef.current?.emit('typing:start', conversationId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', conversationId);
    }, 2000);
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="flex-1 text-sm font-semibold">Conversation</h2>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {connected ? <><Wifi className="h-3 w-3 text-emerald-500" /> Connected</> : <><WifiOff className="h-3 w-3 text-red-500" /> Disconnected</>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isMine = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                isMine
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-secondary text-secondary-foreground rounded-bl-md'
              } ${msg.pending ? 'opacity-60' : ''}`}>
                <p>{msg.content}</p>
                <div className={`mt-1 flex items-center gap-1 text-[10px] ${isMine ? 'text-primary-foreground/60 justify-end' : 'text-muted-foreground'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMine && msg.readAt && <span>✓✓</span>}
                  {msg.pending && <span>⏳</span>}
                </div>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-secondary px-4 py-2 text-sm text-muted-foreground italic">typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => { setInput(e.target.value); handleTyping(); }}
            placeholder="Type a message..."
            className="flex-1"
            disabled={!connected}
          />
          <Button type="submit" size="icon" disabled={!connected || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
