import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '../../context';
import * as Keychain from 'react-native-keychain';

type AppLockSetupProps = {
  visible: boolean;
  onComplete: (method: 'biometric' | 'pin' | 'pattern', value?: string) => void;
  onCancel: () => void;
};

const AppLockSetup = ({ visible, onComplete, onCancel }: AppLockSetupProps) => {
  const { colors } = useTheme();
  const [step, setStep] = useState<'choose' | 'pin' | 'pattern'>('choose');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [pattern, setPattern] = useState<number[]>([]);

  const handleBiometricSetup = async () => {
    try {
      const isAvailable = await Keychain.getSupportedBiometryType();
      if (!isAvailable) {
        Alert.alert('Not Available', 'Biometric authentication is not available on this device');
        return;
      }
      onComplete('biometric');
    } catch (error) {
      console.error('Biometric setup error:', error);
    }
  };

  const handlePinSetup = () => {
    if (pin.length !== 4) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }
    onComplete('pin', pin);
  };

  const handlePinNext = () => {
    if (!isConfirmingPin) {
      if (pin.length !== 4) {
        Alert.alert('Error', 'PIN must be 4 digits');
        return;
      }
      setIsConfirmingPin(true);
      setConfirmPin('');
      return;
    }

    handlePinSetup();
  };

  const renderPatternGrid = () => {
    const dots = [];
    for (let i = 0; i < 9; i++) {
      const isSelected = pattern.includes(i);
      dots.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.patternDot,
            { backgroundColor: isSelected ? colors.myBubble : 'transparent' },
          ]}
          onPress={() => {
            if (!pattern.includes(i)) {
              setPattern([...pattern, i]);
            }
          }}
        />
      );
    }
    return dots;
  };

  if (step === 'choose') {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.headerText }]}>
              Choose App Lock Method
            </Text>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.background }]}
              onPress={() => handleBiometricSetup()}
            >
              <Text style={[styles.optionEmoji]}>👆</Text>
              <Text style={[styles.optionText, { color: colors.headerText }]}>
                Biometric (Face ID / Touch ID)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.background }]}
              onPress={() => setStep('pin')}
            >
              <Text style={[styles.optionEmoji]}>🔢</Text>
              <Text style={[styles.optionText, { color: colors.headerText }]}>
                PIN Code (4 digits)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: colors.background }]}
              onPress={() => setStep('pattern')}
            >
              <Text style={[styles.optionEmoji]}>✏️</Text>
              <Text style={[styles.optionText, { color: colors.headerText }]}>
                Pattern Lock
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.otherTimestamp }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (step === 'pin') {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.headerText }]}>
              {isConfirmingPin ? 'Confirm PIN' : 'Set PIN Code'}
            </Text>

            <TextInput
              style={[styles.pinInput, { 
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.headerText,
              }]}
              value={isConfirmingPin ? confirmPin : pin}
              onChangeText={isConfirmingPin ? setConfirmPin : setPin}
              placeholder="Enter 4-digit PIN"
              placeholderTextColor={colors.otherTimestamp}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.myBubble }]}
              onPress={handlePinNext}
            >
              <Text style={[styles.nextButtonText, { color: colors.myText }]}>
                {isConfirmingPin ? 'Done' : 'Next'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.otherTimestamp }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (step === 'pattern') {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.headerText }]}>
              Draw Pattern
            </Text>

            <View style={styles.patternGrid}>
              {renderPatternGrid()}
            </View>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.myBubble }]}
              onPress={() => {
                if (pattern.length >= 3) {
                  onComplete('pattern', pattern.join('-'));
                } else {
                  Alert.alert('Error', 'Connect at least 3 dots');
                }
              }}
            >
              <Text style={[styles.nextButtonText, { color: colors.myText }]}>
                Done
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={() => setPattern([])}
            >
              <Text style={[styles.resetText, { color: colors.otherTimestamp }]}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  pinInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  nextButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    fontSize: 14,
  },
  patternGrid: {
    width: 250,
    height: 250,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  patternDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#ccc',
    margin: 10,
  },
  resetButton: {
    padding: 12,
    marginTop: 10,
  },
  resetText: {
    fontSize: 14,
  },
});

export default AppLockSetup;