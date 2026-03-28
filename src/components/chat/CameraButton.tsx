import React from 'react';
import { TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../../context';

type CameraButtonProps = {
  onTakePhoto: (uri: string) => void;
  isConnected: boolean;
};

const CameraButton = ({ onTakePhoto, isConnected }: CameraButtonProps) => {
  const { colors } = useTheme();

  const showOptions = () => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to peer');
      return;
    }

    Alert.alert(
      'Send Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const openCamera = () => {
    launchCamera({ 
      mediaType: 'photo', 
      saveToPhotos: true,
    }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage ?? response.errorCode);
        return;
      }
      if (response.assets?.[0]?.uri) {
        onTakePhoto(response.assets[0].uri);
      }
    });
  };

  const openGallery = () => {
    launchImageLibrary({ 
      mediaType: 'photo', 
      selectionLimit: 1,
    }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage ?? response.errorCode);
        return;
      }
      if (response.assets?.[0]?.uri) {
        onTakePhoto(response.assets[0].uri);
      }
    });
  };

  return (
    <TouchableOpacity 
      style={[styles.cameraButton, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
      onPress={showOptions}
      disabled={!isConnected}>
      <Text style={[styles.iconText, { color: colors.headerText }]}>📷</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cameraButton: {
    marginRight: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconText: {
    fontSize: 18,
  },
});

export default CameraButton;