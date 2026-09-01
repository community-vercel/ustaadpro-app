import React, {useRef, useState} from 'react';
import {
  Image,
  KeyboardAvoidingView,
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
import {Eye, EyeOff, ShieldCheck} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {rounded} from '@/theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'SetPin'>;

interface MessageState {
  title: string;
  body: string;
  tone: 'error' | 'success';
}

const pinIcon = require('@/assets/images/password-protection.png');

export function SetPinScreen({navigation}: Props): React.JSX.Element {
  const setPinAction = useAppStore(state => state.setPinAction);
  const completeSignup = useAppStore(state => state.completeSignup);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [inputFocused, setInputFocused] = useState(true);
  const pinRef = useRef<TextInput>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = (nextMessage: MessageState) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(nextMessage);
    messageTimer.current = setTimeout(() => setMessage(null), 4200);
  };

  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      showMessage({title: 'Invalid PIN', body: 'PIN must be exactly 4 digits.', tone: 'error'});
      return;
    }
    setLoading(true);
    try {
      await setPinAction(pin);
      showMessage({title: 'PIN created!', body: 'You can now use your PIN to login quickly.', tone: 'success'});
      // Wait for the success message to show, then mark signup complete.
      // completeSignup() sets isAuthenticated=true which automatically
      // switches the RootNavigator to the Main screen — no manual navigate needed.
      setTimeout(async () => {
        await completeSignup();
      }, 1000);
    } catch (error: any) {
      showMessage({title: 'Failed to set PIN', body: error?.response?.data?.message || error?.message || 'Something went wrong.', tone: 'error'});
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await completeSignup();
    // completeSignup sets isAuthenticated=true — navigator auto-switches to Main
  };

  const focusInput = () => {
    pinRef.current?.focus();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          </View>

          <View style={styles.formCard}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Image source={pinIcon} style={styles.pinIcon} resizeMode="contain" />
              </View>
            </View>

            <Text style={styles.title}>Create your PIN</Text>
            <Text style={styles.subtitle}>
              Set a 4-digit PIN for quick login.{'\n'}You'll enter this instead of your password.
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

            {/* Show/Hide toggle */}
            <View style={styles.pinHeader}>
              <Text style={styles.pinLabel}>Enter 4-digit PIN</Text>
              <Pressable onPress={() => setShowPin(!showPin)} style={styles.eyeToggle}>
                {showPin ? (
                  <EyeOff color={colors.muted} size={18} strokeWidth={2} />
                ) : (
                  <Eye color={colors.muted} size={18} strokeWidth={2} />
                )}
                <Text style={styles.eyeToggleText}>{showPin ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>

            {/* PIN boxes + hidden input wrapped in relative container */}
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

              {/* Hidden TextInput positioned over the pin boxes only */}
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

            <Pressable
              style={({pressed}) => [
                styles.primaryButton,
                (loading || pin.length !== 4) && styles.primaryButtonDisabled,
                pressed && styles.pressedButton,
              ]}
              onPress={handleSetPin}
              disabled={loading || pin.length !== 4}>
              <Text style={styles.primaryButtonText}>
                {loading ? 'Setting PIN...' : 'Create PIN'}
              </Text>
            </Pressable>

            <Pressable style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>

          <View style={styles.bottomCard}>
            <View style={styles.bottomIconRow}>
              <View style={styles.bottomDot} />
              <View style={styles.bottomDot} />
              <View style={styles.bottomDot} />
            </View>
            <Text style={styles.bottomTitle}>Quick & secure</Text>
            <Text style={styles.bottomText}>
              Your PIN is encrypted on our servers.{'\n'}Never share it with anyone.
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
  topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28},
  brandLockup: {flexDirection: 'row', alignItems: 'center', gap: 10},
  brandLogo: {width: 36, height: 36, borderRadius: rounded.default},
  brand: {fontFamily: fontFamily.bold, fontSize: 18, color: colors.authDark},
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
  pinHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14},
  pinLabel: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.authDark},
  eyeToggle: {flexDirection: 'row', alignItems: 'center', gap: 5},
  eyeToggleText: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.muted},
  pinInputRelative: {position: 'relative', marginBottom: 28},
  pinBoxesContainer: {flexDirection: 'row', justifyContent: 'center', gap: 14},
  pinBox: {
    width: 60,
    height: 64,
    borderRadius: rounded.lg,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxFocused: {borderColor: colors.secondary, backgroundColor: '#f0fdf8'},
  pinBoxFilled: {borderColor: colors.secondary, backgroundColor: '#f0fdf8'},
  pinBoxDigit: {fontFamily: fontFamily.bold, fontSize: 26, color: colors.authDark, letterSpacing: 2},
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
  primaryButton: {
    height: 54,
    borderRadius: rounded.default,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {opacity: 0.5},
  pressedButton: {opacity: 0.9},
  primaryButtonText: {fontFamily: fontFamily.bold, color: '#ffffff', fontSize: 16},
  skipButton: {alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 14, marginTop: 8},
  skipText: {fontFamily: fontFamily.bold, color: colors.muted, fontSize: 14},
  bottomCard: {backgroundColor: colors.surfaceContainerLow, borderRadius: rounded.xl, padding: 20, marginTop: 20, alignItems: 'center'},
  bottomIconRow: {flexDirection: 'row', gap: 6, marginBottom: 12},
  bottomDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary},
  bottomTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.authDark, marginBottom: 4},
  bottomText: {fontFamily: fontFamily.regular, color: colors.text, fontSize: 12, lineHeight: 18, textAlign: 'center'},
});
