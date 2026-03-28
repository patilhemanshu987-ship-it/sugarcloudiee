import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context';
import { typography } from '../../utils/typography';

type TextMessageProps = {
  text: string;
  isMe: boolean;
};

const TextMessage = ({ text, isMe }: TextMessageProps) => {
  const { colors } = useTheme();

  return (
    <Text style={[
      styles.messageText,
      typography.body,
      { color: isMe ? colors.myText : colors.otherText },
    ]}>
      {text}
    </Text>
  );
};

const styles = StyleSheet.create({
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
});

export default TextMessage;