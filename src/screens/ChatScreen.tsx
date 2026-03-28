import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useTheme } from '../context';
import { supabase } from '../services/supabase';
import RNFetchBlob from 'react-native-blob-util';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getChatTheme } from '../utils/chatThemes';

// Custom hooks
import { useMessages } from '../hooks/useMessages';

// Components
import MessageList from '../components/chat/MessageList';
import InputBar from '../components/chat/InputBar';
import ReplyBar from '../components/chat/ReplyBar';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { typography } from '../utils/typography';

type ChatScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

const ChatScreen = ({ navigation, route }: ChatScreenProps) => {
  const { colors } = useTheme();
  const { connectionId, friendUsername, friendAvatarUrl } = route.params || {};
  const flatListRef = React.useRef<FlatList>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [chatWallpaperUri, setChatWallpaperUri] = useState<string | null>(null);
  const [chatThemeKey, setChatThemeKey] = useState<string>('classic');

  React.useEffect(() => {
    const loadVisualPrefs = async () => {
      const wallpaper = await AsyncStorage.getItem('chatWallpaper');
      const theme = await AsyncStorage.getItem('chatThemePreset');
      setChatThemeKey(theme || 'classic');
      if (!wallpaper || wallpaper === 'none') {
        setChatWallpaperUri(null);
        return;
      }

      const map: Record<string, string> = {
        paper: 'https://picsum.photos/id/1018/720/1280',
        city: 'https://picsum.photos/id/1031/720/1280',
        forest: 'https://picsum.photos/id/1040/720/1280',
        night: 'https://picsum.photos/id/1011/720/1280',
      };
      setChatWallpaperUri(map[wallpaper] || null);
    };

    loadVisualPrefs();
  }, []);

  const chatTheme = getChatTheme(chatThemeKey);

  if (!connectionId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
          <Text style={[styles.headerText, { color: colors.headerText }]}>Invalid connection</Text>
          <Text style={[styles.subHeaderText, { color: colors.otherTimestamp }]}>Missing code</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const {
    messages, 
    typingUser,
    setTypingUser,
    addTextMessage, 
    addGifMessage, 
    addPhotoMessage,
    addReaction,
    initError,
  } = useMessages(connectionId);

  const uploadPhoto = async (uri: string) => {
    try {
      setUploading(true);
      const fileName = `${Date.now()}.jpg`;
      const base64 = await RNFetchBlob.fs.readFile(uri, 'base64');
      const decoded = RNFetchBlob.base64.decode(base64);
      const arrayBuffer = new Uint8Array(
        decoded.split('').map(char => char.charCodeAt(0))
      );

      const { error } = await supabase.storage
        .from('chat-storage')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-storage')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.warn('Failed to upload photo', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSendText = async (text: string) => {
    if (initError) return;
    try {
      await addTextMessage(text, 'me', replyingTo);
      setReplyingTo(null);
    } catch (error) {
      console.warn('Failed to send text message', error);
    }
  };

  const handleSendGif = async (url: string) => {
    if (initError) return;
    try {
      await addGifMessage(url, 'me', replyingTo);
      setReplyingTo(null);
    } catch (error) {
      console.warn('Failed to send GIF message', error);
    }
  };

  const handleSendPhoto = async (uri: string) => {
    if (initError) return;
    const publicUrl = await uploadPhoto(uri);
    if (publicUrl) {
      await addPhotoMessage(publicUrl, 'me', replyingTo);
      setReplyingTo(null);
    }
  };

  const handleTyping = () => {};

  const handleReaction = (id: string, emoji: string) => {
    addReaction(id, emoji);
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
  };

  const handleVoiceMessage = () => {
    Alert.alert('Voice Message', 'Voice recording button is added. Next step is wiring native audio recording + upload.');
  };

  if (uploading) {
    return (
      <LoadingIndicator 
        message={'Uploading photo...'} 
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: chatTheme.headerBg, borderBottomColor: chatTheme.inputBorder }]}> 
        <View style={styles.headerIdentity}>
          {friendAvatarUrl ? (
            <Image source={{ uri: friendAvatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarFallback, { backgroundColor: chatTheme.inputBorder }]}> 
              <Text style={[styles.headerAvatarText, { color: colors.headerText }]}> 
                {(friendUsername?.[0] || '?').toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={[styles.headerText, typography.body, { color: chatTheme.headerText }]}> 
              @{friendUsername || 'Chat'}
            </Text>
            <Text style={[styles.subHeaderText, { color: chatTheme.headerText, opacity: 0.7 }]}>Secure chat</Text>
          </View>
        </View>
      </View>

      {initError ? (
        <View style={[styles.errorBanner, { backgroundColor: '#FDECEC' }]}> 
          <Text style={styles.errorText}>Chat backend is blocked by RLS policy: {initError}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={[styles.chatBody, { backgroundColor: colors.background }]}> 
          {chatWallpaperUri ? (
            <ImageBackground source={{ uri: chatWallpaperUri }} style={styles.chatBackground} imageStyle={styles.chatBackgroundImage}>
              <View style={[styles.chatBackgroundOverlay, { backgroundColor: chatTheme.key === 'neon' ? 'rgba(8,16,12,0.45)' : 'rgba(255,255,255,0.12)' }]}>
                <MessageList 
                  messages={messages}
                  flatListRef={flatListRef}
                  typingUser={typingUser}
                  onDeletePhoto={(url, id) => console.log('Delete', url, id)}
                  onReaction={handleReaction}
                  onReply={handleReply}
                />
              </View>
            </ImageBackground>
          ) : (
            <MessageList 
              messages={messages}
              flatListRef={flatListRef}
              typingUser={typingUser}
              onDeletePhoto={(url, id) => console.log('Delete', url, id)}
              onReaction={handleReaction}
              onReply={handleReply}
            />
          )}
        </View>

        <ReplyBar 
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />

        <InputBar 
          onSendText={handleSendText}
          onSendGif={handleSendGif}
          onSendPhoto={handleSendPhoto}
          onSendVoice={handleVoiceMessage}
          onTyping={handleTyping}
          isConnected={!initError}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'flex-start',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerText: {
    fontSize: 15,
  },
  subHeaderText: {
    fontSize: 12,
    marginTop: 1,
  },
  errorBanner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: '#8A1F1F',
    fontSize: 12,
  },
  chatBody: {
    flex: 1,
  },
  chatBackground: {
    flex: 1,
  },
  chatBackgroundImage: {
    opacity: 0.82,
  },
  chatBackgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});

export default ChatScreen;