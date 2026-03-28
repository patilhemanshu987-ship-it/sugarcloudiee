import React, { RefObject } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../context';
import MessageBubble from './MessageBubble';
import { Message } from '../../hooks/useMessages';

type MessageListProps = {
  messages: Message[];
  flatListRef: RefObject<FlatList<any> | null>;
  typingUser?: string | null;
  onDeletePhoto?: (photoUrl: string, messageId: string) => void;
  onReaction?: (id: string, emoji: string) => void;
  onReply?: (message: any) => void;
};

const MessageList = ({ 
  messages, 
  flatListRef, 
  typingUser,
  onDeletePhoto,
  onReaction,
  onReply 
}: MessageListProps) => {
  const { colors } = useTheme();

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => (
          <MessageBubble 
            message={item} 
            onDeletePhoto={onDeletePhoto}
            onReaction={onReaction}
            onReply={onReply}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.otherTimestamp }]}>No messages yet. Say hi 👋</Text>
          </View>
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      {typingUser && (
        <View style={[styles.typingContainer, { backgroundColor: colors.otherBubble }]}>
          <Text style={[styles.typingText, { color: colors.otherTimestamp }]}>
            Someone is typing...
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  typingContainer: {
    padding: 10,
    paddingLeft: 20,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    maxWidth: '60%',
  },
  typingText: {
    fontStyle: 'italic',
    fontSize: 12,
  },
});

export default MessageList;