import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

export type Message = {
  id: string;
  text?: string;
  gifUrl?: string;
  photoUrl?: string;
  sender: 'me' | 'other';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  reaction?: string;
  replyTo?: {
    id: string;
    text?: string;
    sender: string;
  };
};

type DbMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: 'text' | 'gif' | 'photo';
  text: string | null;
  media_url: string | null;
  reply_to: string | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
};

const toUiMessage = (row: DbMessage, currentUserId: string): Message => ({
  id: row.id,
  text: row.kind === 'text' ? row.text ?? '' : undefined,
  gifUrl: row.kind === 'gif' ? row.media_url ?? undefined : undefined,
  photoUrl: row.kind === 'photo' ? row.media_url ?? undefined : undefined,
  sender: row.sender_id === currentUserId ? 'me' : 'other',
  timestamp: new Date(row.created_at),
  status: row.status,
  replyTo: row.reply_to ? { id: row.reply_to, sender: 'other' } : undefined,
});

export const useMessages = (connectionId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);

  const markConversationRead = useCallback(async () => {
    const conversationId = conversationIdRef.current;
    const userId = currentUserIdRef.current;
    if (!conversationId || !userId) return;

    const { error } = await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .neq('status', 'read');

    if (error) {
      console.warn('Failed to mark messages as read', error);
    }
  }, []);

  useEffect(() => {
    const initConversation = async () => {
      try {
        setInitError(null);
        const { data: authData } = await supabase.auth.getUser();
        let user = authData.user;

        if (!user) {
          const { data: anonymousData, error: anonymousError } = await supabase.auth.signInAnonymously();
          if (anonymousError) throw anonymousError;
          user = anonymousData.user;
        }

        if (!user?.id) throw new Error('Unable to establish user session');
        currentUserIdRef.current = user.id;

        const { data: rpcData, error: rpcError } = await supabase.rpc('get_or_create_conversation_by_code', {
          p_code: connectionId,
        });
        if (rpcError) throw rpcError;

        const conversationId = typeof rpcData === 'string' ? rpcData : (rpcData?.id ?? null);
        if (!conversationId) throw new Error('Invalid conversation id');
        conversationIdRef.current = conversationId;

        const { data: rows, error: rowsError } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, kind, text, media_url, reply_to, status, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(300);

        if (rowsError) throw rowsError;

        const mapped = ((rows ?? []) as DbMessage[]).map(row => toUiMessage(row, user.id));
        setMessages(mapped);
        await markConversationRead();

        const channel = supabase
          .channel(`messages:${conversationId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload: any) => {
              const me = currentUserIdRef.current;
              if (!me) return;
              const incoming = toUiMessage(payload.new as DbMessage, me);
              setMessages(prev => (prev.some(msg => msg.id === incoming.id) ? prev : [...prev, incoming]));

              if (incoming.sender === 'other') {
                void markConversationRead();
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload: any) => {
              const updated = payload.new as DbMessage;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === updated.id
                    ? { ...msg, status: updated.status }
                    : msg
                )
              );
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (error) {
        console.warn('Failed to initialize conversation', error);
        const err = error as any;
        const code = err?.code ? ` (${err.code})` : '';
        const details = err?.details ? ` Details: ${err.details}` : '';
        const hint = err?.hint ? ` Hint: ${err.hint}` : '';
        const message = `${err?.message || 'Unknown error'}${code}${details}${hint}`;
        setInitError(message);
      }
    };

    initConversation();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [connectionId, markConversationRead]);

  const insertMessage = useCallback(
    async (payload: { kind: 'text' | 'gif' | 'photo'; text?: string; mediaUrl?: string; replyToId?: string }) => {
      const conversationId = conversationIdRef.current;
      const userId = currentUserIdRef.current;
      if (!conversationId || !userId) {
        throw new Error('Conversation not ready');
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: userId,
            kind: payload.kind,
            text: payload.text ?? null,
            media_url: payload.mediaUrl ?? null,
            reply_to: payload.replyToId ?? null,
            status: 'sent',
          },
        ])
        .select('id, conversation_id, sender_id, kind, text, media_url, reply_to, status, created_at')
        .single();

      if (error) throw error;

      const inserted = toUiMessage(data as DbMessage, userId);
      setMessages(prev => (prev.some(msg => msg.id === inserted.id) ? prev : [...prev, inserted]));
      return inserted.id;
    },
    []
  );

  const addTextMessage = useCallback((text: string, sender: 'me' | 'other', replyTo?: any) => {
    if (sender === 'me') {
      return insertMessage({
        kind: 'text',
        text,
        replyToId: replyTo?.id,
      });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fallback: Message = {
      id,
      text,
      sender,
      timestamp: new Date(),
      status: undefined,
      replyTo,
    };
    setMessages(prev => [...prev, fallback]);
    return Promise.resolve(id);
  }, [insertMessage]);

  const addGifMessage = useCallback((gifUrl: string, sender: 'me' | 'other', replyTo?: any) => {
    if (sender === 'me') {
      return insertMessage({
        kind: 'gif',
        mediaUrl: gifUrl,
        replyToId: replyTo?.id,
      });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fallback: Message = {
      id,
      gifUrl,
      sender,
      timestamp: new Date(),
      status: undefined,
      replyTo,
    };
    setMessages(prev => [...prev, fallback]);
    return Promise.resolve(id);
  }, [insertMessage]);

  const addPhotoMessage = useCallback((photoUrl: string, sender: 'me' | 'other', replyTo?: any) => {
    if (sender === 'me') {
      return insertMessage({
        kind: 'photo',
        mediaUrl: photoUrl,
        replyToId: replyTo?.id,
      });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fallback: Message = {
      id,
      photoUrl,
      sender,
      timestamp: new Date(),
      status: undefined,
      replyTo,
    };
    setMessages(prev => [...prev, fallback]);
    return Promise.resolve(id);
  }, [insertMessage]);

  const addSystemMessage = useCallback((text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      sender: 'other',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessageStatus = useCallback((id: string, status: 'delivered' | 'read') => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, status } : msg
    ));
  }, []);

  const addReaction = useCallback((id: string, reaction: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, reaction } : msg
    ));
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  return {
    messages,
    typingUser,
    setTypingUser,
    initError,
    addTextMessage,
    addGifMessage,
    addPhotoMessage,
    addSystemMessage,
    updateMessageStatus,
    addReaction,
    removeMessage,
  };
};