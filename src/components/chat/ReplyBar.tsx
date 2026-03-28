import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context';

type ReplyBarProps = {
  replyingTo: { id: string; text?: string; sender: string } | null;
  onCancelReply: () => void;
};

const ReplyBar = ({ replyingTo, onCancelReply }: ReplyBarProps) => {
  const { colors } = useTheme();

  if (!replyingTo) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.otherBubble }]}>
      <View style={styles.content}>
        <Text style={[styles.replyingTo, { color: colors.myBubble }]}>
          Replying to {replyingTo.sender === 'me' ? 'yourself' : 'other'}
        </Text>
        <Text style={[styles.message, { color: colors.headerText }]} numberOfLines={1}>
          {replyingTo.text || 'Photo/GIF'}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancelReply} style={styles.closeButton}>
        <Text style={[styles.closeText, { color: colors.otherTimestamp }]}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    marginHorizontal: 10,
    marginBottom: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  replyingTo: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReplyBar;