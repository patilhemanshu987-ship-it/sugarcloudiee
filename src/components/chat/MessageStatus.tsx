import React from 'react';
import { Text, StyleSheet } from 'react-native';

type MessageStatusProps = {
  status?: 'sent' | 'delivered' | 'read';
};

const MessageStatus = ({ status }: MessageStatusProps) => {
  const getIcon = () => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return null;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'read':
        return '#007AFF';
      case 'delivered':
        return '#7A8A9A';
      case 'sent':
        return '#999';
      default:
        return '#999';
    }
  };

  if (!status) return null;

  return (
    <Text style={[styles.status, { color: getColor() }]}>
      {getIcon()}
    </Text>
  );
};

const styles = StyleSheet.create({
  status: {
    fontSize: 10,
    marginLeft: 4,
  },
});

export default MessageStatus;