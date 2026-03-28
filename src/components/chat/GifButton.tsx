import React from 'react';
import { TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import { GiphyDialog, GiphySDK } from '@giphy/react-native-sdk';
import { useTheme } from '../../context';

// Initialize Giphy once
GiphySDK.configure({ apiKey: 'NoO6rfGhFQnkcC9vf5GPVtJk8WkDTkgH' });

type GifButtonProps = {
  onSelectGif: (url: string) => void;
  isConnected: boolean;
};

const GifButton = ({ onSelectGif, isConnected }: GifButtonProps) => {
  const { colors } = useTheme();

  React.useEffect(() => {
    const listener = GiphyDialog.addListener('onMediaSelect', (e: any) => {
      onSelectGif(e.media.url);
      GiphyDialog.hide();
    });

    return () => listener.remove();
  }, [onSelectGif]);

  const openGifPicker = () => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to peer');
      return;
    }
    GiphyDialog.show();
  };

  return (
    <TouchableOpacity 
      style={[styles.gifButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
      onPress={openGifPicker}
      disabled={!isConnected}>
      <Text style={[styles.iconText, { color: colors.headerText }]}>GIF</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gifButton: {
    marginRight: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default GifButton;