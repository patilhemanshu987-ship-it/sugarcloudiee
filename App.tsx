import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { ThemeProvider, useTheme } from './src/context';
import { useAuth } from './src/hooks/useAuth';

// Import your screens
import HomeScreen from './src/screens/HomeScreen';
import TalkJSChatScreen from './src/screens/TalkJSChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import BiometricPrompt from './src/components/auth/BiometricPrompt';
import AppLockSetup from './src/components/auth/AppLockSetup';

// Define navigation types
export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Chat: { connectionId?: string; isInitiator?: boolean; friendId?: string; friendUsername?: string; friendAvatarUrl?: string };
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function AppContent() {
  const { colors, theme } = useTheme();
  const { user, loading } = useAuth();
  const isDarkMode = theme === 'dark';
  
  // App lock states
  const [appLocked, setAppLocked] = useState(true);
  const [checkingLock, setCheckingLock] = useState(true);
  const [lockMethod, setLockMethod] = useState<string | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showLockSetup, setShowLockSetup] = useState(false);
  const [lockInput, setLockInput] = useState('');
  const [unlockPattern, setUnlockPattern] = useState<number[]>([]);
  const [lockError, setLockError] = useState('');

  // Check app lock status on mount and when user changes
  useEffect(() => {
    // Only check app lock if user is authenticated and not loading
    if (!loading && user) {
      checkAppLock();
    } else if (!loading && !user) {
      // If not authenticated, skip the lock screen
      setAppLocked(false);
      setCheckingLock(false);
    }
  }, [user, loading]);

  console.log('🟡 App State:', { loading, checkingLock, user: !!user });

  const checkAppLock = async () => {
    try {
      const enabled = await AsyncStorage.getItem('appLockEnabled');
      const method = await AsyncStorage.getItem('lockMethod');
      
      console.log('🔒 App lock check - enabled:', enabled, 'method:', method);
      
      // Only show lock if explicitly enabled by user
      if (enabled === 'true' && method) {
        setLockMethod(method);
        setLockInput('');
        setUnlockPattern([]);
        setLockError('');
        
        // If biometric, show prompt
        if (method === 'biometric') {
          console.log('🔐 Showing biometric prompt');
          setShowBiometricPrompt(true);
        } else {
          // For PIN/pattern, show input screen
          setAppLocked(true);
        }
      } else {
        // App lock is not enabled - skip it
        console.log('ℹ️ App lock not enabled, skipping');
        setAppLocked(false);
      }
    } catch (error) {
      console.error('Error checking app lock:', error);
      setAppLocked(false);
    } finally {
      setCheckingLock(false);
    }
  };

  const verifyPin = async (enteredPin: string) => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials && credentials.password === enteredPin) {
        setAppLocked(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  };

  const verifyPattern = async (enteredPattern: string) => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials && credentials.password === enteredPattern) {
        setAppLocked(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verifying pattern:', error);
      return false;
    }
  };

  const handleBiometricSuccess = () => {
    console.log('✅ Biometric authentication successful');
    setAppLocked(false);
    setShowBiometricPrompt(false);
  };

  const handleBiometricCancel = () => {
    console.log('⚠️ User cancelled biometric authentication');
    // If user cancels biometric, ask for fallback or keep locked
    if (lockMethod === 'biometric') {
      // Could fallback to PIN if set
      setShowBiometricPrompt(false);
      // For now, keep locked and let user try again
    }
  };

  const handleUnlock = async () => {
    if (!lockMethod || (lockMethod !== 'pin' && lockMethod !== 'pattern')) return;

    if (lockMethod === 'pin' && !lockInput.trim()) {
      setLockError('Please enter your pin');
      return;
    }

    if (lockMethod === 'pattern' && unlockPattern.length < 3) {
      setLockError('Connect at least 3 dots');
      return;
    }

    setLockError('');
    const isValid = lockMethod === 'pin'
      ? await verifyPin(lockInput.trim())
      : await verifyPattern(unlockPattern.join('-'));

    if (!isValid) {
      setLockError(`Invalid ${lockMethod}. Please try again.`);
      if (lockMethod === 'pattern') {
        setUnlockPattern([]);
      }
    }
  };

  const handlePatternDotPress = (index: number) => {
    if (unlockPattern.includes(index)) return;
    setUnlockPattern(prev => [...prev, index]);
    if (lockError) setLockError('');
  };

  // Show loading while checking auth and lock
  if (loading || checkingLock) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.headerText }}>Loading...</Text>
      </View>
    );
  }

  // If app is locked, show lock screen
  if (appLocked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.lockTitle, { color: colors.headerText }]}>App Locked</Text>
        
        {lockMethod === 'biometric' && (
          <BiometricPrompt
            visible={showBiometricPrompt}
            onSuccess={handleBiometricSuccess}
            onCancel={handleBiometricCancel}
            onError={(error) => console.log('Biometric error:', error)}
          />
        )}
        
        {(lockMethod === 'pin' || lockMethod === 'pattern') && (
          <View style={styles.lockContainer}>
            <Text style={[styles.lockSubtitle, { color: colors.otherTimestamp }]}>
              Enter your {lockMethod}
            </Text>

            {lockMethod === 'pin' && (
              <TextInput
                style={[
                  styles.lockInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: lockError ? '#FF3B30' : colors.inputBorder,
                    color: colors.headerText,
                  },
                ]}
                value={lockInput}
                onChangeText={(value) => {
                  setLockInput(value);
                  if (lockError) setLockError('');
                }}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor={colors.otherTimestamp}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
              />
            )}

            {lockMethod === 'pattern' && (
              <>
                <View style={styles.patternGrid}>
                  {Array.from({ length: 9 }).map((_, i) => {
                    const selected = unlockPattern.includes(i);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.patternDot,
                          {
                            borderColor: colors.inputBorder,
                            backgroundColor: selected ? colors.myBubble : 'transparent',
                          },
                        ]}
                        onPress={() => handlePatternDotPress(i)}
                      />
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={styles.patternResetButton}
                  onPress={() => {
                    setUnlockPattern([]);
                    if (lockError) setLockError('');
                  }}
                >
                  <Text style={[styles.patternResetText, { color: colors.otherTimestamp }]}>Reset Pattern</Text>
                </TouchableOpacity>
              </>
            )}

            {lockError ? (
              <Text style={styles.lockError}>{lockError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.unlockButton, { backgroundColor: colors.myBubble }]}
              onPress={handleUnlock}
            >
              <Text style={[styles.unlockButtonText, { color: colors.myText }]}>Unlock</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Normal app flow
  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <Stack.Navigator 
          key={user ? 'authenticated' : 'unauthenticated'}
          initialRouteName={user ? "Home" : "Login"}
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.headerBg,
            },
            headerTintColor: colors.headerText,
            headerBackImage: ({ tintColor }) => (
              <Text
                style={{
                  color: tintColor ?? colors.headerText,
                  fontSize: 24,
                  marginLeft: 8,
                  fontWeight: '700',
                }}
              >
                {'<'}
              </Text>
            ),
          }}
        >
          {user ? (
            // Authenticated screens
            <>
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{ title: 'Connect' }}
              />
              <Stack.Screen 
                name="Chat" 
                component={TalkJSChatScreen} 
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
              />
            </>
          ) : (
            // Auth screens
            <>
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Signup" 
                component={SignupScreen} 
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  lockSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  lockContainer: {
    alignItems: 'center',
    width: '80%',
  },
  lockInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  patternGrid: {
    width: 210,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  patternDot: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    marginBottom: 18,
  },
  patternResetButton: {
    marginTop: 4,
    paddingVertical: 6,
  },
  patternResetText: {
    fontSize: 13,
  },
  patternHint: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
  },
  lockError: {
    marginTop: 10,
    color: '#FF3B30',
    fontSize: 13,
    textAlign: 'center',
  },
  unlockButton: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});