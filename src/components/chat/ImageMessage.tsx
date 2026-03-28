import React, { useState } from 'react';
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  View,
  Text,
  Alert,
} from 'react-native';
import FullscreenImage from './FullscreenImage';

type ImageMessageProps = {
  url: string;
  messageId: string;
  onDelete?: (photoUrl: string, messageId: string) => void;
};

const ImageMessage = ({ url, messageId, onDelete }: ImageMessageProps) => {
  const [fullscreen, setFullscreen] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Remove this photo from chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(url, messageId)
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity onPress={() => setFullscreen(true)} onLongPress={handleDelete}>
        <Image 
          source={{ uri: url }} 
          style={styles.photoImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <FullscreenImage
        visible={fullscreen}
        url={url}
        onClose={() => setFullscreen(false)}
        onDelete={() => {
          setFullscreen(false);
          handleDelete();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  photoImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
});

export default ImageMessage;