import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WebView } from 'react-native-webview';
import { supabase } from '../services/supabase';
import { useTheme } from '../context';
import { RootStackParamList } from '../../App';
import { TALKJS_APP_ID } from '@env';

type TalkJSChatScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

type AuthUser = {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
};

const escapeForHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const TalkJSChatScreen = ({ route }: TalkJSChatScreenProps) => {
  const { colors } = useTheme();
  const { friendId, friendUsername, friendAvatarUrl, connectionId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<AuthUser | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setError(null);

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (!authData.user?.id) {
          throw new Error('User session missing');
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, email, avatar_url')
          .eq('id', authData.user.id)
          .maybeSingle();

        setMe({
          id: authData.user.id,
          email: profile?.email || authData.user.email || '',
          username: profile?.username || authData.user.email?.split('@')[0] || 'User',
          avatarUrl: profile?.avatar_url || null,
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to initialize TalkJS');
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const missingTalkConfig = !TALKJS_APP_ID || TALKJS_APP_ID === 'YOUR_TALKJS_APP_ID';
  const missingFriend = !friendId;

  const html = useMemo(() => {
    if (!me || !friendId) return '';

    const meId = escapeForHtml(me.id);
    const meName = escapeForHtml(me.username || 'Me');
    const meEmail = escapeForHtml(me.email || '');
    const mePhoto = escapeForHtml(me.avatarUrl || '');

    const peerId = escapeForHtml(friendId);
    const peerName = escapeForHtml(friendUsername || 'Friend');
    const peerPhoto = escapeForHtml(friendAvatarUrl || '');

    const conversationKey = escapeForHtml(connectionId || [me.id, friendId].sort().join('_'));
    const appId = escapeForHtml(TALKJS_APP_ID || '');

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.talkjs.com/talk.js"></script>
    <style>
      html, body, #talkjs-container {
        margin: 0;
        width: 100%;
        height: 100%;
        background: ${colors.background};
      }
    </style>
  </head>
  <body>
    <div id="talkjs-container"></div>
    <script>
      (function () {
        if (!window.Talk) {
          document.body.innerHTML = '<p style="font-family:sans-serif;padding:16px;">TalkJS failed to load.</p>';
          return;
        }

        Talk.ready.then(function () {
          const me = new Talk.User({
            id: '${meId}',
            name: '${meName}',
            email: '${meEmail}',
            photoUrl: '${mePhoto}' || undefined,
            role: 'default'
          });

          const other = new Talk.User({
            id: '${peerId}',
            name: '${peerName}',
            photoUrl: '${peerPhoto}' || undefined,
            role: 'default'
          });

          const session = new Talk.Session({ appId: '${appId}', me: me });
          const conversation = session.getOrCreateConversation('${conversationKey}');
          conversation.setParticipant(me);
          conversation.setParticipant(other);

          const inbox = session.createInbox({ selected: conversation });
          inbox.mount(document.getElementById('talkjs-container'));
        });
      })();
    </script>
  </body>
</html>`;
  }, [me, friendId, friendUsername, friendAvatarUrl, connectionId, colors.background]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.myBubble} />
      </SafeAreaView>
    );
  }

  if (missingTalkConfig) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.noticeCard}>
          <Text style={[styles.noticeTitle, { color: colors.headerText }]}>TalkJS not configured</Text>
          <Text style={[styles.noticeText, { color: colors.otherTimestamp }]}>Set TALKJS_APP_ID in .env to open TalkJS chat.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (missingFriend) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.noticeCard}>
          <Text style={[styles.noticeTitle, { color: colors.headerText }]}>Missing friend info</Text>
          <Text style={[styles.noticeText, { color: colors.otherTimestamp }]}>Open chat from Friends so TalkJS can target the correct user.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !me) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.noticeCard}>
          <Text style={[styles.noticeTitle, { color: colors.headerText }]}>Unable to open chat</Text>
          <Text style={[styles.noticeText, { color: colors.otherTimestamp }]}>{error || 'Unknown error'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <WebView
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        mixedContentMode="always"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeCard: {
    width: '88%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default TalkJSChatScreen;
