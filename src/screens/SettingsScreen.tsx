import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, Image, ScrollView, NativeModules, ImageBackground } from 'react-native';
import { useTheme } from '../context';
import { useAuth } from '../hooks/useAuth';
import { typography } from '../utils/typography';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFetchBlob from 'react-native-blob-util';
import { supabase } from '../services/supabase';
import BiometricPrompt from '../components/auth/BiometricPrompt';
import AppLockSetup from '../components/auth/AppLockSetup';
import { chatThemePresets } from '../utils/chatThemes';

const themes = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'gradient', label: 'Gradient' },
];

const chatWallpapers = [
  { key: 'none', label: 'None', uri: '' },
  { key: 'paper', label: 'Paper', uri: 'https://picsum.photos/id/1018/720/1280' },
  { key: 'city', label: 'City', uri: 'https://picsum.photos/id/1031/720/1280' },
  { key: 'forest', label: 'Forest', uri: 'https://picsum.photos/id/1040/720/1280' },
  { key: 'night', label: 'Night', uri: 'https://picsum.photos/id/1011/720/1280' },
];

const SettingsScreen = () => {
  const { theme, setTheme, colors } = useTheme();
  const { user, logout } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [lockMethod, setLockMethod] = useState<'biometric' | 'pin' | 'pattern' | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showLockSetup, setShowLockSetup] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [chatCompactMode, setChatCompactMode] = useState(false);
  const [chatWallpaper, setChatWallpaper] = useState('none');
  const [chatTheme, setChatTheme] = useState('classic');

  // Load saved app lock settings
  useEffect(() => {
    loadLockSettings();
    loadProfileSettings();
    loadChatSettings();
  }, []);

  useEffect(() => {
    setDisplayName(user?.username || '');
  }, [user?.username]);

  const loadLockSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('appLockEnabled');
      const method = await AsyncStorage.getItem('lockMethod');
      
      if (enabled === 'true') {
        setAppLockEnabled(true);
        setLockMethod(method as 'biometric' | 'pin' | 'pattern');
        if (method === 'biometric') {
          setBiometricEnabled(true);
        }
      }
    } catch (error) {
      console.error('Error loading lock settings:', error);
    }
  };

  const saveLockSettings = async (enabled: boolean, method?: string) => {
    try {
      await AsyncStorage.setItem('appLockEnabled', String(enabled));
      if (method) {
        await AsyncStorage.setItem('lockMethod', method);
      } else {
        await AsyncStorage.removeItem('lockMethod');
      }
    } catch (error) {
      console.error('Error saving lock settings:', error);
    }
  };

  const loadProfileSettings = async () => {
    try {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.username) setDisplayName(data.username);
      if (data?.avatar_url) setProfilePhoto(data.avatar_url);
    } catch (error) {
      console.warn('Failed to load profile settings', error);
    }
  };

  const loadChatSettings = async () => {
    const compact = await AsyncStorage.getItem('chatCompactMode');
    setChatCompactMode(compact === 'true');
    const wallpaper = await AsyncStorage.getItem('chatWallpaper');
    setChatWallpaper(wallpaper || 'none');
    const themePreset = await AsyncStorage.getItem('chatThemePreset');
    setChatTheme(themePreset || 'classic');
  };

  const saveDisplayName = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: name })
        .eq('id', user?.id);
      if (error) throw error;
      Alert.alert('Success', 'Display name updated');
    } catch (error) {
      console.warn('Failed to update display name', error);
      Alert.alert('Error', 'Failed to update display name');
    }
  };

  const uploadProfilePhoto = async () => {
    try {
      if (!user?.id) return;
      let pickedPath: string | undefined;

      const hasNativeCropper = Boolean((NativeModules as any)?.RNCImageCropPicker);

      if (hasNativeCropper) {
        try {
          const cropperModule = require('react-native-image-crop-picker');
          const imageCropPicker = cropperModule?.default ?? cropperModule;
          const picked = await imageCropPicker.openPicker({
            mediaType: 'photo',
            width: 600,
            height: 600,
            cropping: true,
            cropperCircleOverlay: false,
            compressImageQuality: 0.85,
            forceJpg: true,
          });
          pickedPath = picked?.path;
        } catch (cropperError: any) {
          if (cropperError?.code === 'E_PICKER_CANCELLED') return;
          console.warn('Cropper failed, falling back to gallery picker', cropperError?.message || cropperError);
        }
      }

      if (!pickedPath) {
        if (!hasNativeCropper) {
          console.warn('Native cropper not in current Android binary. Using gallery fallback. Rebuild app to enable cropper UI.');
        }
        const result = await launchImageLibrary({
          mediaType: 'photo',
          selectionLimit: 1,
        });
        if (result.didCancel || !result.assets?.[0]?.uri) return;
        pickedPath = result.assets[0].uri;
      }

      if (!pickedPath) return;
      const normalizedPath = pickedPath.replace('file://', '');
      const base64 = await RNFetchBlob.fs.readFile(normalizedPath, 'base64');
      const decoded = RNFetchBlob.base64.decode(base64);
      const arrayBuffer = new Uint8Array(decoded.split('').map(char => char.charCodeAt(0)));
      const fileName = `profile-${user.id}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('chat-storage')
        .upload(`profile-photos/${fileName}`, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-storage')
        .getPublicUrl(`profile-photos/${fileName}`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setProfilePhoto(publicUrl);
      Alert.alert('Success', 'Profile photo updated');
    } catch (error) {
      const err = error as any;
      if (err?.code === 'E_PICKER_CANCELLED') return;
      console.warn('Failed to update profile photo', error);
      Alert.alert('Error', 'Failed to update profile photo');
    }
  };

  const toggleChatCompactMode = async (value: boolean) => {
    setChatCompactMode(value);
    await AsyncStorage.setItem('chatCompactMode', String(value));
  };

  const setWallpaper = async (wallpaperKey: string) => {
    setChatWallpaper(wallpaperKey);
    await AsyncStorage.setItem('chatWallpaper', wallpaperKey);
  };

  const setChatThemePreset = async (themeKey: string) => {
    setChatTheme(themeKey);
    await AsyncStorage.setItem('chatThemePreset', themeKey);
  };

  const toggleAppLock = async (value: boolean) => {
    if (value) {
      // Turning ON - show setup
      setShowLockSetup(true);
    } else {
      // Turning OFF - disable all
      setAppLockEnabled(false);
      setBiometricEnabled(false);
      setLockMethod(null);
      await saveLockSettings(false);
    }
  };

  const toggleBiometric = async () => {
    if (!biometricEnabled) {
      // Check if biometric is available
      const isAvailable = await Keychain.getSupportedBiometryType();
      if (!isAvailable) {
        Alert.alert('Not Available', 'Biometric authentication is not available on this device');
        return;
      }
      // Store a credential protected by biometrics.
      console.log('💾 Storing biometric-protected credential...');
      await Keychain.setGenericPassword('appLock', 'biometric_enabled', {
        service: 'app-lock',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      
      // Now show biometric prompt to verify immediately.
      setShowBiometricPrompt(true);
    } else {
      // Disable biometric
      setBiometricEnabled(false);
      setLockMethod('pin'); // Fallback to PIN
      await saveLockSettings(true, 'pin');
    }
  };

  const handleLockSetupComplete = async (method: 'biometric' | 'pin' | 'pattern', value?: string) => {
    setLockMethod(method);
    setAppLockEnabled(true);
    
    if (method === 'biometric') {
      setBiometricEnabled(true);
      await Keychain.setGenericPassword('appLock', 'biometric_enabled', {
        service: 'app-lock',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else if (method === 'pin' && value) {
      // Save PIN securely
      await Keychain.setGenericPassword('appLock', value);
    } else if (method === 'pattern' && value) {
      // Save pattern securely
      await Keychain.setGenericPassword('appLock', value);
    }
    
    await saveLockSettings(true, method);
    setShowLockSetup(false);
    Alert.alert('Success', `${method} lock enabled`);
  };

  const handleBiometricSuccess = async () => {
    setBiometricEnabled(true);
    setLockMethod('biometric');
    setAppLockEnabled(true);
    await Keychain.setGenericPassword('appLock', 'biometric_enabled', {
      service: 'app-lock',
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await saveLockSettings(true, 'biometric');
    setShowBiometricPrompt(false);
    Alert.alert('Success', 'Biometric lock enabled');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => logout()
        }
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
    >
      <Text style={[styles.sectionTitle, typography.title, { color: colors.headerText }]}>
        Appearance
      </Text>
      {themes.map(t => (
        <TouchableOpacity
          key={t.key}
          style={[
            styles.themeButton,
            { backgroundColor: colors.card, borderColor: colors.inputBorder },
            theme === t.key && [styles.selectedTheme, { borderColor: colors.accent }],
          ]}
          onPress={() => setTheme(t.key as 'light' | 'dark' | 'gradient')}
        >
          <Text style={[styles.themeButtonText, typography.body, { color: colors.headerText }]}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={[styles.sectionTitle, typography.title, { color: colors.headerText, marginTop: 30 }]}>
        Security
      </Text>

      <Text style={[styles.sectionTitle, typography.title, { color: colors.headerText, marginTop: 30 }]}> 
        Chat Appearance
      </Text>

      <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}> 
        <Text style={[styles.settingLabel, { color: colors.headerText }]}>Compact message bubbles</Text>
        <Switch
          value={chatCompactMode}
          onValueChange={toggleChatCompactMode}
          trackColor={{ false: colors.inputBorder, true: colors.myBubble }}
        />
      </View>

      <Text style={[styles.settingSubTitle, { color: colors.headerText }]}>Chat Theme</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
        {chatThemePresets.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.chatThemeCard,
              {
                borderColor: chatTheme === item.key ? colors.accent : colors.inputBorder,
                backgroundColor: colors.card,
              },
            ]}
            onPress={() => setChatThemePreset(item.key)}
          >
            <View style={styles.themePreviewRow}>
              <View style={[styles.themePreviewBubble, { backgroundColor: item.otherBubble }]} />
              <View style={[styles.themePreviewBubble, { backgroundColor: item.myBubble }]} />
            </View>
            <Text style={[styles.chatThemeLabel, { color: colors.headerText }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.settingSubTitle, { color: colors.headerText }]}>Chat Wallpaper</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wallpaperRow}>
        {chatWallpapers.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.wallpaperCard,
              {
                borderColor: chatWallpaper === item.key ? colors.accent : colors.inputBorder,
                backgroundColor: colors.card,
              },
            ]}
            onPress={() => setWallpaper(item.key)}
          >
            {item.key === 'none' ? (
              <View style={[styles.wallpaperPreview, { backgroundColor: colors.background, borderColor: colors.inputBorder }]}> 
                <Text style={[styles.noneText, { color: colors.otherTimestamp }]}>No wallpaper</Text>
              </View>
            ) : (
              <ImageBackground source={{ uri: item.uri }} style={styles.wallpaperPreview} imageStyle={styles.wallpaperImage}>
                <View style={styles.wallpaperOverlay} />
              </ImageBackground>
            )}
            <Text style={[styles.wallpaperLabel, { color: colors.headerText }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* App Lock Toggle */}
      <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.settingLabel, { color: colors.headerText }]}>App Lock</Text>
        <Switch
          value={appLockEnabled}
          onValueChange={toggleAppLock}
          trackColor={{ false: colors.inputBorder, true: colors.myBubble }}
        />
      </View>

      {/* Biometric Option */}
      {appLockEnabled && (
        <View style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.settingLabel, { color: colors.headerText }]}>Use Biometric</Text>
          <Switch
            value={biometricEnabled}
            onValueChange={toggleBiometric}
            trackColor={{ false: colors.inputBorder, true: colors.myBubble }}
          />
        </View>
      )}

      {/* PIN/Pattern Options */}
      {appLockEnabled && !biometricEnabled && (
        <>
          <TouchableOpacity 
            style={[styles.optionButton, { backgroundColor: colors.card }]}
            onPress={() => {
              setLockMethod('pin');
              setShowLockSetup(true);
            }}
          >
            <Text style={[styles.optionText, { color: colors.headerText }]}>
              {lockMethod === 'pin' ? 'Change PIN Code' : 'Set PIN Code'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.optionButton, { backgroundColor: colors.card }]}
            onPress={() => {
              setLockMethod('pattern');
              setShowLockSetup(true);
            }}
          >
            <Text style={[styles.optionText, { color: colors.headerText }]}>
              {lockMethod === 'pattern' ? 'Change Pattern Lock' : 'Set Pattern Lock'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Show current lock method */}
      {appLockEnabled && lockMethod && (
        <Text style={[styles.lockStatus, { color: colors.statusOnline }]}>
          ✓ {lockMethod} lock enabled
        </Text>
      )}

      <Text style={[styles.sectionTitle, typography.title, { color: colors.headerText, marginTop: 30 }]}>
        Account
      </Text>

      <View style={[styles.profilePhotoWrap, { backgroundColor: colors.card }]}> 
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
        ) : (
          <View style={[styles.profilePhotoFallback, { backgroundColor: colors.inputBorder }]}> 
            <Text style={[styles.profilePhotoFallbackText, { color: colors.headerText }]}> 
              {(displayName?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
        )}
        <TouchableOpacity style={[styles.photoButton, { backgroundColor: colors.myBubble }]} onPress={uploadProfilePhoto}>
          <Text style={[styles.photoButtonText, { color: colors.myText }]}>Change Profile Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.accountInfo, { backgroundColor: colors.card }]}> 
        <Text style={[styles.accountLabel, { color: colors.otherTimestamp }]}>Display Name</Text>
        <TextInput
          style={[styles.nameInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.headerText }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter display name"
          placeholderTextColor={colors.otherTimestamp}
          autoCapitalize="none"
        />
        <TouchableOpacity style={[styles.saveNameButton, { backgroundColor: colors.myBubble }]} onPress={saveDisplayName}>
          <Text style={[styles.photoButtonText, { color: colors.myText }]}>Save Display Name</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.accountInfo, { backgroundColor: colors.card }]}>
        <Text style={[styles.accountLabel, { color: colors.otherTimestamp }]}>Username</Text>
        <Text style={[styles.accountValue, { color: colors.headerText }]}>@{user?.username}</Text>
        
        <Text style={[styles.accountLabel, { color: colors.otherTimestamp, marginTop: 10 }]}>Email</Text>
        <Text style={[styles.accountValue, { color: colors.headerText }]}>{user?.email}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: colors.card }]}
        onPress={handleLogout}
      >
        <Text style={[styles.logoutText, { color: '#FF3B30' }]}>Logout</Text>
      </TouchableOpacity>

      {/* Debug: Clear App Lock if Stuck */}
      <TouchableOpacity 
        style={[styles.debugButton, { backgroundColor: colors.card, borderColor: colors.otherTimestamp }]}
        onPress={() => {
          Alert.alert(
            'Reset App Lock',
            'This will clear all app lock settings. Use this if you are stuck.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Reset', 
                style: 'destructive',
                onPress: async () => {
                  await AsyncStorage.removeItem('appLockEnabled');
                  await AsyncStorage.removeItem('lockMethod');
                  await Keychain.resetGenericPassword();
                  setAppLockEnabled(false);
                  setBiometricEnabled(false);
                  setLockMethod(null);
                  Alert.alert('Success', 'App lock settings cleared');
                }
              }
            ]
          );
        }}
      >
        <Text style={[styles.debugText, { color: colors.otherTimestamp }]}>🔧 Reset App Lock (If Stuck)</Text>
      </TouchableOpacity>

      <Text style={[styles.currentTheme, typography.caption, { color: colors.otherTimestamp }]}>
        Current Theme: {theme}
      </Text>

      {/* Modals */}
      <BiometricPrompt
        visible={showBiometricPrompt}
        onSuccess={handleBiometricSuccess}
        onCancel={() => setShowBiometricPrompt(false)}
        onError={(error) => Alert.alert('Error', error)}
      />

      <AppLockSetup
        visible={showLockSetup}
        onComplete={handleLockSetupComplete}
        onCancel={() => setShowLockSetup(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  themeButton: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedTheme: {
    borderWidth: 2,
  },
  themeButtonText: {
    fontSize: 18,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingSubTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 10,
  },
  themeRow: {
    paddingBottom: 6,
  },
  chatThemeCard: {
    width: 118,
    borderWidth: 2,
    borderRadius: 12,
    padding: 8,
    marginRight: 10,
  },
  themePreviewRow: {
    height: 42,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F1F3F5',
  },
  themePreviewBubble: {
    width: 34,
    height: 16,
    borderRadius: 8,
  },
  chatThemeLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  wallpaperRow: {
    paddingBottom: 8,
  },
  wallpaperCard: {
    width: 120,
    borderWidth: 2,
    borderRadius: 12,
    padding: 8,
    marginRight: 10,
  },
  wallpaperPreview: {
    width: '100%',
    height: 82,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  wallpaperImage: {
    borderRadius: 8,
  },
  wallpaperOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  wallpaperLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  noneText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 30,
  },
  optionButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
  },
  lockStatus: {
    fontSize: 14,
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'center',
  },
  accountInfo: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  profilePhotoWrap: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
  },
  profilePhoto: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginBottom: 12,
  },
  profilePhotoFallback: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoFallbackText: {
    fontSize: 26,
    fontWeight: '700',
  },
  photoButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  saveNameButton: {
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
  },
  accountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  debugButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  debugText: {
    fontSize: 14,
    fontWeight: '500',
  },
  currentTheme: {
    marginTop: 30,
    fontSize: 14,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});

export default SettingsScreen;