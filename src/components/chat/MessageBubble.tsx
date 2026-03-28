import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getChatTheme } from '../../utils/chatThemes';
import TextMessage from './TextMessage';
import GifMessage from './GifMessage';
import ImageMessage from './ImageMessage';
import MessageStatus from './MessageStatus';
import { typography } from '../../utils/typography';

type MessageBubbleProps = {
  message: any;
  onDeletePhoto?: (photoUrl: string, messageId: string) => void;
  onReaction?: (id: string, emoji: string) => void;
  onReply?: (message: any) => void;
};

const MessageBubble = ({ message, onDeletePhoto, onReaction, onReply }: MessageBubbleProps) => {
  const { colors } = useTheme();
  const [showReactions, setShowReactions] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [chatThemeKey, setChatThemeKey] = useState('classic');
  const isMe = message.sender === 'me';

  const reactions = ['❤️', '😂', '👍', '😮', '😢', '😡'];

  const handleReaction = (emoji: string) => {
    setShowReactions(false);
    onReaction?.(message.id, emoji);
  };

  useEffect(() => {
    const loadPreference = async () => {
      const mode = await AsyncStorage.getItem('chatCompactMode');
      const theme = await AsyncStorage.getItem('chatThemePreset');
      setCompactMode(mode === 'true');
      setChatThemeKey(theme || 'classic');
    };
    loadPreference();
  }, []);

  const chatTheme = getChatTheme(chatThemeKey);

  return (
    <TouchableOpacity 
      onLongPress={() => setShowReactions(true)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.messageRow,
        isMe ? styles.myMessageRow : styles.otherMessageRow
      ]}>
        <View
          style={[
            styles.messageBubble,
            compactMode && styles.messageBubbleCompact,
            {
              backgroundColor: isMe ? chatTheme.myBubble : chatTheme.otherBubble,
              borderBottomRightRadius: isMe ? 8 : 20,
              borderBottomLeftRadius: isMe ? 20 : 8,
            },
          ]}
        >
          {message.replyTo && (
            <View style={[styles.replyContainer, { borderLeftColor: chatTheme.sendButton }]}> 
              <Text style={[styles.replySender, { color: chatTheme.sendButton }]}> 
                Replying to {message.replyTo.sender === 'me' ? 'yourself' : 'other'}
              </Text>
              <Text style={[styles.replyText, { color: isMe ? colors.timestamp : colors.otherTimestamp }]} numberOfLines={1}>
                {message.replyTo.text || 'Photo/GIF'}
              </Text>
            </View>
          )}

          {message.text && <TextMessage text={message.text} isMe={isMe} />}
          {message.gifUrl && <GifMessage url={message.gifUrl} />}
          {message.photoUrl && (
            <ImageMessage 
              url={message.photoUrl} 
              messageId={message.id}
              onDelete={onDeletePhoto}
            />
          )}
          
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => onReply?.(message)}>
              <Text style={[styles.replyIcon, { color: isMe ? colors.timestamp : colors.otherTimestamp }]}> 
                {'\u21a9\ufe0f'}
              </Text>
            </TouchableOpacity>
            
            <Text
              style={[
                styles.timestamp,
                typography.caption,
                { color: isMe ? colors.timestamp : colors.otherTimestamp },
              ]}
            >
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            
            {isMe && <MessageStatus status={message.status} />}
          </View>

          {message.reaction && (
            <View style={[styles.reactionBadge, { backgroundColor: colors.card }]}> 
              <Text style={styles.reactionEmoji}>{message.reaction}</Text>
            </View>
          )}
        </View>
      </View>

      {showReactions && (
        <View style={[styles.reactionsContainer, { backgroundColor: colors.card }]}> 
          {reactions.map(emoji => (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleReaction(emoji)}
              style={styles.reactionButton}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageRow: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageBubbleCompact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxWidth: '86%',
  },
  replyContainer: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 8,
  },
  replySender: {
    fontSize: 11,
    marginBottom: 2,
    ...typography.caption,
  },
  replyText: {
    fontSize: 12,
    ...typography.caption,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 8,
  },
  timestamp: {
    fontSize: 10,
  },
  replyIcon: {
    fontSize: 12,
  },
  reactionsContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  reactionButton: {
    padding: 8,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  reactionBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
});

export default MessageBubble;