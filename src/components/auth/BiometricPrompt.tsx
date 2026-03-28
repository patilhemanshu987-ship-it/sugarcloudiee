import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../context';
import * as Keychain from 'react-native-keychain';

type BiometricPromptProps = {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  onError?: (error: string) => void;
};

const BiometricPrompt = ({ visible, onSuccess, onCancel, onError }: BiometricPromptProps) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('');
  const autoTriggeredRef = useRef(false);

  React.useEffect(() => {
    if (visible) {
      checkBiometrics();
      // Auto-trigger sensor prompt when lock screen opens.
      if (!autoTriggeredRef.current) {
        autoTriggeredRef.current = true;
        authenticate();
      }
    } else {
      autoTriggeredRef.current = false;
    }
  }, [visible]);

  const checkBiometrics = async () => {
    try {
      const type = await Keychain.getSupportedBiometryType();
      if (type) {
          const displayType = type === 'TouchID' ? 'Fingerprint' : (type === 'FaceID' ? 'Face ID' : type);
          console.log('🔐 Biometric type detected:', type, '→', displayType);
          setBiometryType(displayType);
        } else {
          console.warn('⚠️ No biometric type detected on this device');
      }
    } catch (error) {
      console.error('Error checking biometrics:', error);
    }
  };

  const authenticate = async () => {
    setLoading(true);
    try {
      console.log('🔐 Starting biometric authentication...');
      
      // Read a biometric-protected keychain item. OS will require sensor verification.
      const credentials = await Keychain.getGenericPassword({
        service: 'app-lock',
        authenticationPrompt: {
          title: 'Authenticate',
          subtitle: 'Use your biometrics to unlock the app',
          description: biometryType ? `Scan your ${biometryType}` : 'Authenticate to continue',
          cancel: 'Cancel',
        },
      });

      if (!credentials) {
        console.log('⚠️ No biometric credential is configured for app lock');
        setLoading(false);
        onError?.('Biometric lock is not configured. Enable it again in Settings.');
        return;
      }

      console.log('✅ Biometric authentication successful');
      setLoading(false);
      onSuccess();
    } catch (error: any) {
      console.error('❌ Biometric authentication error:', error.message);
      setLoading(false);
      
      // User cancelled or error occurred
      if (error.message?.includes('Cancel') || error.message?.includes('cancelled') || error.message?.includes('User cancelled')) {
        console.log('⚠️ User cancelled biometric authentication');
        onCancel();
      } else {
        console.error('Full error:', error);
        onError?.('Biometric authentication failed: ' + error.message);
        onCancel();
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.headerText }]}>
            Unlock App
          </Text>
          
          <Text style={[styles.subtitle, { color: colors.otherTimestamp }]}>
            {biometryType ? `Use ${biometryType} to continue` : 'Authenticate to continue'}
          </Text>

          <View style={styles.iconContainer}>
            <Text style={styles.biometricIcon}>
                {biometryType.includes('Face') ? '👤' : '👆'}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.myBubble} />
          ) : (
            <TouchableOpacity
              style={[styles.authenticateButton, { backgroundColor: colors.myBubble }]}
              onPress={authenticate}
            >
              <Text style={[styles.authenticateText, { color: colors.myText }]}>
                Authenticate
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={[styles.cancelText, { color: colors.otherTimestamp }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  biometricIcon: {
    fontSize: 40,
  },
  authenticateButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  authenticateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    fontSize: 14,
  },
});

export default BiometricPrompt;