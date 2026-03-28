import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../context';
import CameraButton from './CameraButton';
import GifButton from './GifButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getChatTheme } from '../../utils/chatThemes';

type InputBarProps = {
  onSendText: (text: string) => void;
  onSendGif: (url: string) => void;
  onSendPhoto: (uri: string) => void;
  onSendVoice?: () => void;
  onTyping?: () => void;
  isConnected: boolean;
};

const InputBar = ({ onSendText, onSendGif, onSendPhoto, onSendVoice, onTyping, isConnected }: InputBarProps) => {
  const { colors } = useTheme();
  const [inputText, setInputText] = useState('');
  const [chatThemeKey, setChatThemeKey] = useState('classic');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatTheme = getChatTheme(chatThemeKey);

  useEffect(() => {
    const loadTheme = async () => {
      const key = await AsyncStorage.getItem('chatThemePreset');
      setChatThemeKey(key || 'classic');
    };
    loadTheme();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTextChange = (text: string) => {
    setInputText(text);
    
    if (text.length > 0 && isConnected && onTyping) {
      onTyping();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        // Stop typing indicator
      }, 2000);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendText(inputText);
    setInputText('');
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  return (
    <View style={[styles.inputContainer, { backgroundColor: chatTheme.headerBg, borderTopColor: chatTheme.inputBorder }]}> 
      <CameraButton onTakePhoto={onSendPhoto} isConnected={isConnected} />
      <GifButton onSelectGif={onSendGif} isConnected={isConnected} />

      <TouchableOpacity
        style={[styles.micButton, { backgroundColor: chatTheme.otherBubble, borderColor: chatTheme.inputBorder }]}
        onPress={onSendVoice}
        disabled={!isConnected}
      >
        <Text style={[styles.micIconText, { color: chatTheme.headerText }]}>🎙</Text>
      </TouchableOpacity>
      
      <TextInput
        style={[styles.input, { 
          backgroundColor: chatTheme.inputBg,
          borderColor: chatTheme.inputBorder,
          color: chatTheme.headerText,
        }]}
        value={inputText}
        onChangeText={handleTextChange}
        placeholder="Type a message..."
        placeholderTextColor={colors.otherTimestamp}
        multiline
        editable={isConnected}
      />
      <TouchableOpacity 
        style={[
          styles.sendButton, 
          { backgroundColor: chatTheme.sendButton },
          (!inputText.trim() || !isConnected) && styles.sendButtonDisabled
        ]}
        onPress={handleSend}
        disabled={!inputText.trim() || !isConnected}>
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginLeft: 2,
    borderWidth: 1,
  },
  micIconText: {
    fontSize: 18,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default InputBar;