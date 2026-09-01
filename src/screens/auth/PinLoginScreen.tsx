import React, {useEffect, useRef, useState} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CommonActions} from '@react-navigation/native';
import {Eye, EyeOff, Fingerprint, Lock, ShieldCheck} from 'lucide-react-native';
import {AuthStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {rounded} from '@/theme/layout';
import * as Keychain from 'react-native-keychain';

type Props = NativeStackScreenProps<AuthStackParamList, 'PinLogin'>;

interface MessageState {
  title: string;
  body: string;
  tone: 'error' | 'success';
}

const pinIcon = require('@/assets/images/password-protection.png');

export function PinLoginScreen({route, navigation}: Props): React.JSX.Element {
  const {phone} = route.params;
  const verifyPin = useAppStore(state => state.verifyPinAction);
  const requestPinResetOtp = useAppStore(state => state.requestPinResetOtpAction);
  const resetPinWithOtp = useAppStore(state => state.resetPinWithOtpAction);
  const continueAsGuest = useAppStore(state => state.continueAsGuest);
  const biometricEnabled = useAppStore(state => state.biometricEnabled);

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [inputFocused, setInputFocused] = useState(true);
  const pinRef = useRef<TextInput>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-trigger biometric on mount when it's enabled
  useEffect(() => {
    if (!biometricEnabled) return;
    const triggerBiometric = async () => {
      try {
        const credentials = await Keychain.getGenericPassword({
          service: 'com.ustaadpro.biometric',
          authenticationPrompt: {
            title: 'UstaadPro Login',
            subtitle: 'Use your fingerprint or Face ID to log in',
            cancel: 'Use PIN instead',
          },
        });
        if (credentials && credentials.password) {
          setLoading(true);
          try {
            await verifyPin(phone, credentials.password);
            navigation.getParent()?.dispatch(CommonActions.navigate({name: 'Main'}));
          } catch (e: any) {
            const msg = e?.response?.data?.message || 'Biometric login failed. Please enter your PIN.';
            showMessage({title: 'Login failed', body: msg, tone: 'error'});
          } finally {
            setLoading(false);
          }
        }
      } catch (_) {
        // User cancelled biometric or it failed — fall back to manual PIN entry silently
      }
    };
    // Small delay so the screen is fully mounted before the OS prompt appears
    const timer = setTimeout(triggerBiometric, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Forgot PIN modal state
  const [forgotPinVisible, setForgotPinVisible] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<MessageState | null>(null);
  const [resetStep, setResetStep] = useState<'otp' | 'pin'>('otp');

  const showMessage = (nextMessage: MessageState) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(nextMessage);
    messageTimer.current = setTimeout(() => setMessage(null), 4200);
  };

  const handleVerifyPin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      showMessage({title: 'Invalid PIN', body: 'Please enter your 4-digit PIN.', tone: 'error'});
      return;
    }
    setLoading(true);
    try {
      await verifyPin(phone, pin);
      navigation.getParent()?.dispatch(CommonActions.navigate({name: 'Main'}));
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Invalid PIN. Please try again.';
      showMessage({title: 'Login failed', body: msg, tone: 'error'});
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'com.ustaadpro.biometric',
        authenticationPrompt: {
          title: 'UstaadPro Login',
          subtitle: 'Use your fingerprint or Face ID to log in',
          cancel: 'Use PIN instead',
        },
      });
      if (credentials && credentials.password) {
        await verifyPin(phone, credentials.password);
        navigation.getParent()?.dispatch(CommonActions.navigate({name: 'Main'}));
      }
    } catch (_) {
      // User cancelled biometric — silently fall back to PIN
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    setResetLoading(true);
    try {
      await requestPinResetOtp(phone);
      setOtpSent(true);
      setResetMessage({title: 'OTP sent', body: 'A 6-digit code has been sent to your phone.', tone: 'success'});
    } catch (error: any) {
      setResetMessage({title: 'Failed', body: error?.response?.data?.message || 'Could not send OTP.', tone: 'error'});
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOtpAndProceed = () => {
    if (!/^\d{6}$/.test(resetCode)) {
      setResetMessage({title: 'Invalid code', body: 'Please enter the 6-digit verification code.', tone: 'error'});
      return;
    }
    setResetStep('pin');
    setResetMessage(null);
  };

  const handleResetPin = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      setResetMessage({title: 'Invalid PIN', body: 'New PIN must be exactly 4 digits.', tone: 'error'});
      return;
    }
    if (newPin !== newPinConfirm) {
      setResetMessage({title: 'PINs do not match', body: 'Please re-enter your new PIN.', tone: 'error'});
      return;
    }
    setResetLoading(true);
    try {
      await resetPinWithOtp(phone, resetCode, newPin);
      closeForgotPinModal();
      showMessage({title: 'PIN reset!', body: 'Your PIN has been updated. Login with your new PIN.', tone: 'success'});
      setPin('');
    } catch (error: any) {
      setResetMessage({title: 'Reset failed', body: error?.response?.data?.message || 'Could not reset PIN.', tone: 'error'});
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPinModal = () => {
    setForgotPinVisible(false);
    setOtpSent(false);
    setResetCode('');
    setNewPin('');
    setNewPinConfirm('');
    setShowNewPin(false);
    setResetMessage(null);
    setResetStep('otp');
  };

  const handleContinueAsGuest = async () => {
    await continueAsGuest();
    navigation.getParent()?.dispatch(CommonActions.navigate({name: 'Main'}));
  };

  const formatPhone = (p: string) => {
    if (p.length >= 10) return `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}`;
    return p;
  };

  const focusInput = () => {
    pinRef.current?.focus();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Forgot PIN Modal */}
      <Modal visible={forgotPinVisible} transparent animationType="fade" onRequestClose={closeForgotPinModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.resetCard}>
            <View style={styles.resetHeader}>
              <View style={styles.resetIconCircle}>
                <ShieldCheck color="#ffffff" size={22} strokeWidth={2.4} />
              </View>
              <Text style={styles.resetTitle}>Reset PIN</Text>
              <Text style={styles.resetSubtitle}>
                {resetStep === 'otp' ? "We'll send a verification code to your phone." : 'Enter your new 4-digit PIN.'}
              </Text>
            </View>

            {resetMessage && (
              <View style={[styles.resetBanner, resetMessage.tone === 'success' ? styles.resetBannerSuccess : styles.resetBannerError]}>
                <Text style={[styles.resetBannerTitle, resetMessage.tone === 'success' ? styles.resetBannerTextSuccess : styles.resetBannerTextError]}>
                  {resetMessage.title}
                </Text>
                <Text style={[styles.resetBannerBody, resetMessage.tone === 'success' ? styles.resetBannerTextSuccess : styles.resetBannerTextError]}>
                  {resetMessage.body}
                </Text>
              </View>
            )}

            {resetStep === 'otp' ? (
              <>
                <View style={styles.resetInputContainer}>
                  <Lock color={colors.muted} size={20} style={styles.resetInputIcon} />
                  <TextInput
                    value={resetCode}
                    onChangeText={v => setResetCode(v.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#8a8a8a"
                    style={styles.resetInput}
                  />
                </View>
                <Pressable
                  style={[styles.resetPrimaryBtn, (!otpSent || !/^\d{6}$/.test(resetCode)) && styles.resetPrimaryBtnDisabled]}
                  onPress={otpSent ? handleVerifyOtpAndProceed : handleForgotPin}
                  disabled={resetLoading || (otpSent && !/^\d{6}$/.test(resetCode))}>
                  <Text style={styles.resetPrimaryBtnText}>
                    {resetLoading ? 'Please wait...' : otpSent ? 'Verify Code' : 'Send OTP'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.resetPinRow}>
                  <View style={styles.resetPinField}>
                    <Text style={styles.resetPinLabel}>New PIN</Text>
                    <View style={styles.resetPinInputWrap}>
                      <TextInput
                        value={newPin}
                        onChangeText={v => setNewPin(v.replace(/\D/g, '').slice(0, 4))}
                        keyboardType="number-pad"
                        secureTextEntry={!showNewPin}
                        placeholder="• • • •"
                        placeholderTextColor="#c0c0c0"
                        style={styles.resetPinInput}
                        maxLength={4}
                      />
                      <Pressable onPress={() => setShowNewPin(!showNewPin)} style={styles.resetEyeBtn}>
                        {showNewPin ? <EyeOff color={colors.muted} size={16} /> : <Eye color={colors.muted} size={16} />}
                      </Pressable>
                    </View>
                  </View>
                </View>
                <View style={styles.resetPinRow}>
                  <View style={styles.resetPinField}>
                    <Text style={styles.resetPinLabel}>Confirm PIN</Text>
                    <TextInput
                      value={newPinConfirm}
                      onChangeText={v => setNewPinConfirm(v.replace(/\D/g, '').slice(0, 4))}
                      keyboardType="number-pad"
                      secureTextEntry={!showNewPin}
                      placeholder="• • • •"
                      placeholderTextColor="#c0c0c0"
                      style={styles.resetPinInput}
                      maxLength={4}
                    />
                  </View>
                </View>
                {newPin.length === 4 && newPinConfirm.length === 4 && newPin !== newPinConfirm && (
                  <Text style={styles.resetMismatch}>PINs don't match</Text>
                )}
                <Pressable
                  style={[styles.resetPrimaryBtn, (newPin.length !== 4 || newPinConfirm.length !== 4) && styles.resetPrimaryBtnDisabled]}
                  onPress={handleResetPin}
                  disabled={resetLoading || newPin.length !== 4 || newPinConfirm.length !== 4}>
                  <Text style={styles.resetPrimaryBtnText}>
                    {resetLoading ? 'Saving...' : 'Set New PIN'}
                  </Text>
                </Pressable>
              </>
            )}

            <Pressable style={styles.resetCancelBtn} onPress={closeForgotPinModal}>
              <Text style={styles.resetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>

          <View style={styles.topRow}>
            <View style={styles.brandLockup}>
              <Image source={require('@/assets/images/logo.png')} style={styles.brandLogo} />
              <Text style={styles.brand}>UstaadPro</Text>
            </View>
            <Pressable style={styles.guestBtn} onPress={handleContinueAsGuest}>
              <Text style={styles.guestBtnText}>Guest</Text>
            </Pressable>
          </View>

          <View style={styles.formCard}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Image source={pinIcon} style={styles.pinIcon} resizeMode="contain" />
              </View>
            </View>

            <Text style={styles.title}>Enter your PIN</Text>
            <Text style={styles.subtitle}>
              Enter the 4-digit PIN you created for{'\n'}
              <Text style={styles.phoneHighlight}>{formatPhone(phone.replace('+92', ''))}</Text>
            </Text>

            {message && (
              <View style={[styles.messageBanner, message.tone === 'success' ? styles.messageSuccess : styles.messageError]}>
                <View style={[styles.messageIcon, message.tone === 'success' ? styles.messageIconSuccess : styles.messageIconError]}>
                  {message.tone === 'success' ? (
                    <ShieldCheck color="#ffffff" size={16} strokeWidth={2.4} />
                  ) : (
                    <Text style={styles.messageIconText}>!</Text>
                  )}
                </View>
                <View style={styles.messageContent}>
                  <Text style={[styles.messageTitle, message.tone === 'success' ? styles.messageTextSuccess : styles.messageTextError]}>
                    {message.title}
                  </Text>
                  <Text style={[styles.messageBody, message.tone === 'success' ? styles.messageTextSuccess : styles.messageTextError]}>
                    {message.body}
                  </Text>
                </View>
              </View>
            )}

            {/* PIN Boxes */}
            <View style={styles.pinInputWrapper}>
              <View style={styles.pinInputHeader}>
                <Text style={styles.pinInputLabel}>Enter 4-digit PIN</Text>
                <Pressable onPress={() => setShowPin(!showPin)} style={styles.eyeToggle}>
                  {showPin ? (
                    <EyeOff color={colors.muted} size={18} strokeWidth={2} />
                  ) : (
                    <Eye color={colors.muted} size={18} strokeWidth={2} />
                  )}
                  <Text style={styles.eyeToggleText}>{showPin ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              <View style={styles.pinInputRelative}>
                <Pressable style={styles.pinBoxesContainer} onPress={focusInput}>
                  {[0, 1, 2, 3].map(i => (
                    <View
                      key={i}
                      style={[
                        styles.pinBox,
                        inputFocused && styles.pinBoxFocused,
                        Boolean(pin[i]) && styles.pinBoxFilled,
                      ]}>
                      <Text style={[styles.pinBoxDigit, Boolean(pin[i]) && styles.pinBoxDigitFilled]}>
                        {showPin ? (pin[i] || '') : (pin[i] ? '•' : '')}
                      </Text>
                    </View>
                  ))}
                </Pressable>
                {/* Hidden TextInput covering the PIN boxes area only */}
                <TextInput
                  ref={pinRef}
                  value={pin}
                  onChangeText={v => {
                    const digits = v.replace(/\D/g, '').slice(0, 4);
                    setPin(digits);
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  keyboardType="number-pad"
                  maxLength={4}
                  caretHidden
                  autoFocus
                  style={styles.hiddenInput}
                />
              </View>
            </View>

            <Pressable
              style={({pressed}) => [
                styles.primaryButton,
                (loading || pin.length !== 4) && styles.primaryButtonDisabled,
                pressed && styles.pressedButton,
              ]}
              onPress={handleVerifyPin}
              disabled={loading || pin.length !== 4}>
              <Text style={styles.primaryButtonText}>
                {loading ? 'Verifying...' : 'Login'}
              </Text>
            </Pressable>

            <Pressable style={styles.forgotButton} onPress={() => setForgotPinVisible(true)}>
              <Text style={styles.forgotText}>Forgot PIN?</Text>
            </Pressable>

            {biometricEnabled ? (
              <>
                {/* Divider */}
                <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 4}}>
                  <View style={{flex: 1, height: 1, backgroundColor: '#e5e7eb'}} />
                  <Text style={{marginHorizontal: 12, fontFamily: 'System', fontSize: 12, color: '#9ca3af'}}>
                    OR
                  </Text>
                  <View style={{flex: 1, height: 1, backgroundColor: '#e5e7eb'}} />
                </View>

                {/* Fingerprint button */}
                <Pressable
                  style={({pressed}) => [{
                    height: 54,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: '#6545d8',
                    backgroundColor: pressed ? '#ede9fe' : '#f5f2ff',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    marginTop: 4,
                    opacity: loading ? 0.6 : 1,
                  }]}
                  onPress={handleBiometricLogin}
                  disabled={loading}>
                  <Fingerprint color="#6545d8" size={22} strokeWidth={2.2} />
                  <Text style={{fontFamily: fontFamily.bold, color: '#6545d8', fontSize: 15}}>
                    {loading ? 'Verifying...' : 'Login with Fingerprint'}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>

          <View style={styles.bottomCard}>
            <View style={styles.bottomIconRow}>
              <View style={styles.bottomDot} />
              <View style={styles.bottomDot} />
              <View style={styles.bottomDot} />
            </View>
            <Text style={styles.bottomTitle}>Quick & secure login</Text>
            <Text style={styles.bottomText}>
              Your PIN keeps your account secure{'\n'}while making login fast.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  keyboardView: {flex: 1},
  scrollContent: {flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32, justifyContent: 'space-between'},

  // Top row
  topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28},
  brandLockup: {flexDirection: 'row', alignItems: 'center', gap: 10},
  brandLogo: {width: 36, height: 36, borderRadius: rounded.default},
  brand: {fontFamily: fontFamily.bold, fontSize: 18, color: colors.authDark},
  guestBtn: {backgroundColor: colors.authDark, borderRadius: rounded.full, paddingHorizontal: 16, paddingVertical: 8},
  guestBtnText: {color: '#ffffff', fontFamily: fontFamily.bold, fontSize: 13},

  // Form card
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    shadowColor: colors.authDark,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 5,
  },
  iconContainer: {alignItems: 'center', marginBottom: 20},
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#effcf6',
    borderWidth: 2,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIcon: {width: 42, height: 42},
  title: {fontFamily: fontFamily.bold, fontSize: 22, color: colors.authDark, textAlign: 'center', marginBottom: 8},
  subtitle: {fontFamily: fontFamily.regular, fontSize: 14, color: colors.text, textAlign: 'center', lineHeight: 21, marginBottom: 28},
  phoneHighlight: {fontFamily: fontFamily.bold, color: colors.authDark},

  // Message
  messageBanner: {flexDirection: 'row', borderRadius: rounded.default, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20, gap: 10, alignItems: 'flex-start'},
  messageSuccess: {backgroundColor: '#effcf6', borderColor: '#bbf7d0'},
  messageError: {backgroundColor: '#fff7f7', borderColor: colors.errorContainer},
  messageIcon: {width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1},
  messageIconSuccess: {backgroundColor: '#006c49'},
  messageIconError: {backgroundColor: colors.error},
  messageIconText: {color: '#ffffff', fontFamily: fontFamily.bold, fontSize: 14},
  messageContent: {flex: 1},
  messageTitle: {fontFamily: fontFamily.bold, fontSize: 13},
  messageBody: {fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17, marginTop: 2},
  messageTextSuccess: {color: '#006c49'},
  messageTextError: {color: colors.onErrorContainer},

  // PIN input
  pinInputWrapper: {marginBottom: 8},
  pinInputHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  pinInputLabel: {fontFamily: fontFamily.bold, fontSize: 13, color: colors.authDark},
  eyeToggle: {flexDirection: 'row', alignItems: 'center', gap: 5},
  eyeToggleText: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.muted},
  pinInputRelative: {position: 'relative', marginBottom: 8},
  pinBoxesContainer: {flexDirection: 'row', justifyContent: 'center', gap: 12},
  pinBox: {
    width: 58,
    height: 62,
    borderRadius: rounded.lg,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxFocused: {borderColor: colors.secondary, backgroundColor: '#f0fdf8'},
  pinBoxFilled: {borderColor: colors.secondary, backgroundColor: '#f0fdf8'},
  pinBoxDigit: {fontFamily: fontFamily.bold, fontSize: 24, color: colors.authDark, letterSpacing: 2},
  pinBoxDigitFilled: {color: colors.secondary},
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 24,
  },

  // Buttons
  primaryButton: {
    height: 54,
    borderRadius: rounded.default,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryButtonDisabled: {opacity: 0.5},
  pressedButton: {opacity: 0.9},
  primaryButtonText: {fontFamily: fontFamily.bold, color: '#ffffff', fontSize: 16},
  forgotButton: {alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 14, marginTop: 4},
  forgotText: {fontFamily: fontFamily.bold, color: colors.secondary, fontSize: 14},

  // Bottom
  bottomCard: {backgroundColor: colors.surfaceContainerLow, borderRadius: rounded.xl, padding: 20, marginTop: 20, alignItems: 'center'},
  bottomIconRow: {flexDirection: 'row', gap: 6, marginBottom: 12},
  bottomDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary},
  bottomTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.authDark, marginBottom: 4},
  bottomText: {fontFamily: fontFamily.regular, color: colors.text, fontSize: 12, lineHeight: 18, textAlign: 'center'},

  // Forgot PIN Modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(11,28,48,0.45)', justifyContent: 'center', padding: 20},
  resetCard: {backgroundColor: colors.surfaceContainerLowest, borderRadius: rounded.xl, padding: 22, borderWidth: 1, borderColor: colors.border},
  resetHeader: {alignItems: 'center', marginBottom: 20},
  resetIconCircle: {width: 48, height: 48, borderRadius: 24, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 12},
  resetTitle: {fontFamily: fontFamily.bold, color: colors.authDark, fontSize: 20, textAlign: 'center'},
  resetSubtitle: {fontFamily: fontFamily.regular, color: colors.text, fontSize: 13, lineHeight: 18, marginTop: 6, textAlign: 'center'},
  resetBanner: {borderRadius: rounded.default, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16},
  resetBannerSuccess: {backgroundColor: '#effcf6', borderColor: '#bbf7d0'},
  resetBannerError: {backgroundColor: '#fff7f7', borderColor: colors.errorContainer},
  resetBannerTitle: {fontFamily: fontFamily.bold, fontSize: 13},
  resetBannerBody: {fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17, marginTop: 2},
  resetBannerTextSuccess: {color: '#006c49'},
  resetBannerTextError: {color: colors.onErrorContainer},
  resetInputContainer: {flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: rounded.default, backgroundColor: colors.surfaceContainerLowest, paddingHorizontal: 14, marginBottom: 14},
  resetInputIcon: {marginRight: 10},
  resetInput: {flex: 1, color: colors.authDark, fontFamily: fontFamily.regular, fontSize: 16, padding: 0},
  resetPinRow: {marginBottom: 14},
  resetPinField: {},
  resetPinLabel: {fontFamily: fontFamily.bold, fontSize: 12, color: colors.authDark, marginBottom: 7},
  resetPinInputWrap: {flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: rounded.default, backgroundColor: colors.surfaceContainerLowest, paddingHorizontal: 14},
  resetPinInput: {flex: 1, color: colors.authDark, fontFamily: fontFamily.regular, fontSize: 16, padding: 0},
  resetEyeBtn: {padding: 4},
  resetMismatch: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.danger, marginBottom: 10},
  resetPrimaryBtn: {height: 48, borderRadius: rounded.default, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginTop: 4},
  resetPrimaryBtnDisabled: {opacity: 0.5},
  resetPrimaryBtnText: {fontFamily: fontFamily.bold, color: '#ffffff', fontSize: 14},
  resetCancelBtn: {height: 44, borderRadius: rounded.default, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center', marginTop: 10},
  resetCancelText: {fontFamily: fontFamily.bold, color: colors.authDark, fontSize: 14},
});
