import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Keychain from 'react-native-keychain';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ArrowLeft, Eye, EyeOff, Fingerprint, KeyRound, ShieldCheck, X} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {rounded} from '@/theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({navigation}: Props): React.JSX.Element {
  const user = useAppStore(state => state.user);
  const userHasPin = useAppStore(state => state.user?.hasPin ?? false);
  
  // PIN Modal State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinStep, setPinStep] = useState<'create' | 'verify' | 'newpin'>('create');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<{title: string; body: string; tone: 'error' | 'success'} | null>(null);
  const [pinInputFocused, setPinInputFocused] = useState(false);
  const setPinAction = useAppStore(state => state.setPinAction);
  const checkPinAction = useAppStore(state => state.checkPinAction);
  
  // Biometric State
  const biometricEnabled = useAppStore(state => state.biometricEnabled);
  const enableBiometric = useAppStore(state => state.enableBiometric);
  const disableBiometric = useAppStore(state => state.disableBiometric);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricPendingEnable, setBiometricPendingEnable] = useState(false);
  const [biometricConfirmVisible, setBiometricConfirmVisible] = useState(false);

  useEffect(() => {
    Keychain.getSupportedBiometryType().then(type => {
      setBiometricSupported(type !== null);
    }).catch(() => setBiometricSupported(false));
  }, []);

  const openPinModal = () => {
    setPinStep(userHasPin ? 'verify' : 'create');
    setCurrentPin('');
    setNewPin('');
    setPinMessage(null);
    setBiometricPendingEnable(false);
    setPinModalVisible(true);
  };

  const closePinModal = () => {
    setPinModalVisible(false);
    setCurrentPin('');
    setNewPin('');
    setPinMessage(null);
    setBiometricPendingEnable(false);
  };

  const handleVerifyCurrentPin = async () => {
    if (!/^\d{4}$/.test(currentPin)) {
      setPinMessage({title: 'Invalid PIN', body: 'Please enter your 4-digit PIN.', tone: 'error'});
      return;
    }
    setPinLoading(true);
    try {
      const isValid = await checkPinAction(currentPin);
      if (isValid) {
        if (biometricPendingEnable) {
          // Success: verification for biometric
          await enableBiometric(currentPin);
          setBiometricPendingEnable(false);
          setPinMessage({title: 'Success', body: 'Biometric login is now enabled.', tone: 'success'});
          setTimeout(() => {
            closePinModal();
          }, 1200);
        } else {
          // Success: proceed to change PIN
          setPinStep('newpin');
          setPinMessage(null);
        }
      } else {
        setPinMessage({title: 'Verification failed', body: 'Incorrect PIN. Please try again.', tone: 'error'});
        setCurrentPin('');
      }
    } catch (e: any) {
      setPinMessage({title: 'Error', body: 'Could not verify PIN.', tone: 'error'});
    } finally {
      setPinLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      setPinMessage({title: 'Invalid PIN', body: 'Please enter a 4-digit PIN.', tone: 'error'});
      return;
    }
    setPinLoading(true);
    try {
      await setPinAction(newPin);
      setPinMessage({title: 'Success!', body: 'Your PIN has been updated successfully.', tone: 'success'});
      
      // If biometrics were enabled, update the stored PIN in the keychain
      if (biometricEnabled) {
        await enableBiometric(newPin);
      }
      
      setTimeout(() => {
        closePinModal();
      }, 1500);
    } catch (e: any) {
      setPinMessage({title: 'Error', body: 'Could not update PIN.', tone: 'error'});
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft color={colors.ink} size={20} strokeWidth={2.3} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Security and preferences
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Security</Text>

        <Pressable
          style={({pressed}) => [
            styles.settingsCard,
            pressed && styles.settingsCardPressed,
          ]}
          onPress={openPinModal}
        >
          <View style={styles.settingsIcon}>
            <KeyRound color="#6545d8" size={21} strokeWidth={2.2} />
          </View>
          <View style={styles.settingsCopy}>
            <Text style={styles.settingsTitle}>{userHasPin ? 'Change PIN' : 'App PIN'}</Text>
            <Text style={styles.settingsText}>
              {userHasPin ? 'Change your 4-digit login PIN.' : 'Set or change your 4-digit login PIN for quick access.'}
            </Text>
          </View>
        </Pressable>

        {userHasPin && biometricSupported ? (
          <View style={[styles.settingsCard, {flexDirection: 'row', alignItems: 'center'}]}>
            <View style={styles.settingsIcon}>
              <Fingerprint color="#6545d8" size={21} strokeWidth={2.2} />
            </View>
            <View style={[styles.settingsCopy, {flex: 1}]}>
              <Text style={styles.settingsTitle}>Fingerprint Login</Text>
              <Text style={styles.settingsText}>
                {biometricEnabled ? 'Biometric login is enabled.' : 'Log in with fingerprint or Face ID.'}
              </Text>
            </View>
            {biometricLoading ? (
              <ActivityIndicator size="small" color="#6545d8" style={{marginRight: 4}} />
            ) : (
              <Switch
                value={biometricEnabled}
                onValueChange={async (value) => {
                  if (value) {
                    setBiometricConfirmVisible(true);
                  } else {
                    setBiometricLoading(true);
                    try {
                      await disableBiometric();
                    } catch (e) {
                      // silently fail
                    } finally {
                      setBiometricLoading(false);
                    }
                  }
                }}
                trackColor={{false: colors.outlineVariant, true: '#6545d8'}}
                thumbColor="#fff"
              />
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Biometric Enable Confirmation Modal */}
      {biometricConfirmVisible ? (
        <View style={[StyleSheet.absoluteFill, {zIndex: 9998, elevation: 9998}]}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setBiometricConfirmVisible(false)}>
            <Pressable
              style={styles.modalCard}
              onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: '#6545d8',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Fingerprint color="#ffffff" size={20} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.modalTitle}>Enable Fingerprint Login</Text>
                </View>
                <Pressable
                  style={styles.modalClose}
                  onPress={() => setBiometricConfirmVisible(false)}>
                  <X color={colors.ink} size={18} strokeWidth={2.2} />
                </Pressable>
              </View>

              <Text
                style={{
                  fontFamily: fontFamily.regular,
                  fontSize: 14,
                  color: colors.text,
                  lineHeight: 21,
                  marginBottom: 6,
                }}>
                You'll be asked to verify your current PIN once to confirm it's you. After that, you can log in instantly with your fingerprint.
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#f0fdf8',
                  borderWidth: 1,
                  borderColor: '#bbf7d0',
                  borderRadius: rounded.default,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginTop: 8,
                  marginBottom: 22,
                }}>
                <ShieldCheck color="#006c49" size={18} strokeWidth={2.2} />
                <Text
                  style={{
                    fontFamily: fontFamily.medium,
                    fontSize: 12,
                    color: '#006c49',
                    flex: 1,
                    lineHeight: 18,
                  }}>
                  Your PIN is stored securely using your device's hardware encryption. We never store your biometric data.
                </Text>
              </View>

              <View style={{flexDirection: 'row', gap: 10}}>
                <Pressable
                  style={({pressed}) => [{
                    flex: 1,
                    height: 48,
                    borderRadius: rounded.default,
                    borderWidth: 1.5,
                    borderColor: colors.outlineVariant,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  }]}
                  onPress={() => setBiometricConfirmVisible(false)}>
                  <Text
                    style={{
                      fontFamily: fontFamily.bold,
                      fontSize: 14,
                      color: colors.muted,
                    }}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={({pressed}) => [{
                    flex: 1,
                    height: 48,
                    borderRadius: rounded.default,
                    backgroundColor: '#6545d8',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  }]}
                  onPress={() => {
                    setBiometricConfirmVisible(false);
                    setBiometricPendingEnable(true);
                    setPinStep('verify');
                    setCurrentPin('');
                    setNewPin('');
                    setPinMessage(null);
                    setPinModalVisible(true);
                  }}>
                  <Text
                    style={{
                      fontFamily: fontFamily.bold,
                      fontSize: 14,
                      color: '#ffffff',
                    }}>
                    Verify PIN
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </View>
      ) : null}

      {/* PIN Modal */}
      {pinModalVisible ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <Pressable style={styles.modalOverlay} onPress={closePinModal}>
            <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                  <View style={{width: 36, height: 36, borderRadius: 18, backgroundColor: '#6545d8', alignItems: 'center', justifyContent: 'center'}}>
                    <KeyRound color="#ffffff" size={18} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.modalTitle}>{pinStep === 'verify' ? 'Verify Current PIN' : pinStep === 'newpin' ? 'Set New PIN' : 'Set App PIN'}</Text>
                </View>
                <Pressable style={styles.modalClose} onPress={closePinModal}>
                  <X color={colors.ink} size={18} strokeWidth={2.2} />
                </Pressable>
              </View>

              <Text style={[styles.settingsText, {marginBottom: 18, marginTop: 0, lineHeight: 20}]}>
                {pinStep === 'verify' ? 'Enter your current 4-digit PIN to continue.' : pinStep === 'newpin' ? 'Enter your new 4-digit PIN for quick login.' : 'Create a 4-digit PIN for quick login next time.'}
              </Text>

              {pinMessage && (
                <View style={{borderRadius: rounded.default, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, backgroundColor: pinMessage.tone === 'success' ? '#effcf6' : '#fff7f7', borderColor: pinMessage.tone === 'success' ? '#bbf7d0' : colors.errorContainer}}>
                  <Text style={{fontFamily: fontFamily.bold, fontSize: 13, color: pinMessage.tone === 'success' ? '#006c49' : colors.onErrorContainer}}>{pinMessage.title}</Text>
                  <Text style={{fontFamily: fontFamily.regular, fontSize: 12, color: pinMessage.tone === 'success' ? '#006c49' : colors.onErrorContainer, marginTop: 3}}>{pinMessage.body}</Text>
                </View>
              )}

              <View style={{marginBottom: 18}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                  <Text style={{fontFamily: fontFamily.bold, fontSize: 13, color: colors.authDark}}>{pinStep === 'verify' ? 'Current PIN' : 'Enter 4-digit PIN'}</Text>
                  <Pressable onPress={() => setShowPin(!showPin)} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    {showPin ? <EyeOff color={colors.muted} size={16} /> : <Eye color={colors.muted} size={16} />}
                    <Text style={{fontFamily: fontFamily.medium, fontSize: 12, color: colors.muted}}>{showPin ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </View>
                <View style={{position: 'relative'}}>
                  <View style={{flexDirection: 'row', justifyContent: 'center', gap: 12}}>
                    {[0, 1, 2, 3].map(i => {
                      const activeValue = pinStep === 'verify' ? currentPin : newPin;
                      return (
                        <View
                          key={i}
                          style={{width: 54, height: 58, borderRadius: rounded.lg, borderWidth: 2, borderColor: (pinInputFocused || activeValue[i]) ? '#006c49' : colors.outlineVariant, backgroundColor: activeValue[i] ? '#f0fdf8' : colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center'}}>
                          <Text style={{fontFamily: fontFamily.bold, fontSize: 24, color: activeValue[i] ? '#006c49' : colors.authDark, letterSpacing: 2}}>
                            {showPin ? (activeValue[i] || '') : (activeValue[i] ? '•' : '')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <TextInput
                    value={pinStep === 'verify' ? currentPin : newPin}
                    onChangeText={value => {
                      const digits = value.replace(/\D/g, '').slice(0, 4);
                      if (pinStep === 'verify') {
                        setCurrentPin(digits);
                      } else {
                        setNewPin(digits);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    caretHidden
                    autoFocus
                    onFocus={() => setPinInputFocused(true)}
                    onBlur={() => setPinInputFocused(false)}
                    onSubmitEditing={pinStep === 'verify' ? handleVerifyCurrentPin : handleSetPin}
                    returnKeyType="done"
                    style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, fontSize: 24}}
                  />
                </View>
              </View>

              {pinStep === 'newpin' ? (
                <Pressable
                  onPress={() => { setPinStep('verify'); setCurrentPin(''); setNewPin(''); setPinMessage(null); }}
                  style={{alignSelf: 'flex-start', marginBottom: 14}}
                >
                  <Text style={{fontFamily: fontFamily.bold, fontSize: 12, color: colors.secondary, textDecorationLine: 'underline'}}>← Back to verify PIN</Text>
                </Pressable>
              ) : null}

              <Pressable
                style={({pressed}) => [
                  styles.saveButton,
                  (pinLoading || ((pinStep === 'verify' ? currentPin : newPin).length !== 4)) && {opacity: 0.5},
                  pressed && {opacity: 0.9},
                ]}
                onPress={pinStep === 'verify' ? handleVerifyCurrentPin : handleSetPin}
                disabled={pinLoading || ((pinStep === 'verify' ? currentPin : newPin).length !== 4)}
              >
                <Text style={styles.saveButtonText}>
                  {pinLoading ? 'Please wait...' : pinStep === 'verify' ? 'Verify PIN' : 'Save PIN'}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fcfcfd'},
  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#fcfcfd',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f2',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerCopy: {flex: 1},
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f1f2',
    elevation: 2,
    shadowColor: '#111827',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
  },
  settingsCardPressed: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  settingsIcon: {
    width: 44,
    height: 44,
    borderRadius: rounded.lg,
    backgroundColor: '#f5f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingsCopy: {
    flex: 1,
    paddingRight: 16,
  },
  settingsTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  settingsText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded['2xl'],
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.ink,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    height: 52,
    backgroundColor: '#6545d8',
    borderRadius: rounded.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#ffffff',
  },
});
