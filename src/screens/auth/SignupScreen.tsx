import React, { useRef, useState } from 'react';
import {
  Image,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react-native';
import { AuthStackParamList } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { rounded } from '@/theme/layout';
type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

interface MessageState {
  title: string;
  body: string;
  tone: 'error' | 'success';
}

function normalizePakistanPhoneInput(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('92')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

function isMediumPassword(value: string) {
  return value.length >= 6 && /[A-Z]/.test(value);
}

export function SignupScreen({ navigation }: Props): React.JSX.Element {
  const signup = useAppStore(state => state.signup);
  const verifySignupOtp = useAppStore(state => state.verifySignupOtp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationChannel, setVerificationChannel] = useState<
    'phone' | 'email'
  >('phone');
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showPasswordRule = password.length > 0 && !isMediumPassword(password);

  const scrollToPasswordInput = () => {
    InteractionManager.runAfterInteractions(() => {
      scrollRef.current?.scrollTo({
        y: Platform.OS === 'android' ? 220 : 180,
        animated: true,
      });
    });
  };

  const showMessage = (nextMessage: MessageState) => {
    if (messageTimer.current) {
      clearTimeout(messageTimer.current);
    }

    setMessage(nextMessage);
    messageTimer.current = setTimeout(() => setMessage(null), 4200);
  };

  const handleSignup = async () => {
    if (awaitingOtp) {
      if (!/^\d{6}$/.test(otpCode)) {
        showMessage({
          title: 'Invalid code',
          body: 'Please enter the 6 digit verification code.',
          tone: 'error',
        });
        return;
      }

      setLoading(true);
      try {
        await verifySignupOtp({
          email,
          phone: `+92${phone}`,
          code: otpCode,
          verificationChannel,
        });
      } catch (error: any) {
        showMessage({
          title: 'Verification failed',
          body: error.response?.data?.message || 'Something went wrong',
          tone: 'error',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!name || !email || !phone || !password) {
      showMessage({
        title: 'Missing details',
        body: 'Please fill all fields before creating your account.',
        tone: 'error',
      });
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      showMessage({
        title: 'Invalid phone',
        body: 'Please enter a 10 digit phone number.',
        tone: 'error',
      });
      return;
    }

    if (!isMediumPassword(password)) {
      showMessage({
        title: 'Weak password',
        body: 'Password must be at least 6 characters and include one uppercase letter.',
        tone: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await signup({
        name,
        email,
        phone: `+92${phone}`,
        password,
        verificationChannel,
      });
      setAwaitingOtp(true);
      showMessage({
        title:
          verificationChannel === 'phone'
            ? 'Check your phone'
            : 'Check your email',
        body: `We sent a 6 digit verification code to your ${verificationChannel}.`,
        tone: 'success',
      });
    } catch (error: any) {
      showMessage({
        title: 'Signup failed',
        body: error.response?.data?.message || 'Something went wrong',
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.topRow}>
            <View style={styles.brandLockup}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.brandLogo}
              />
              <Text style={styles.brand}>UstaadPro</Text>
            </View>
            <Pressable
              style={styles.guestButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.guestText}>Login</Text>
            </Pressable>
          </View>

          <View style={styles.formCard}>
            <View style={styles.authLogoWrap}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.authLogo}
              />
            </View>

            <View style={styles.heroBadge}>
              <Sparkles color={colors.secondary} size={15} strokeWidth={2.4} />
              <Text style={styles.heroBadgeText}>Create service account</Text>
            </View>

            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              {awaitingOtp
                ? `Enter the code sent to your ${verificationChannel}`
                : 'Use phone or email verification to sign up'}
            </Text>

            {!awaitingOtp && (
              <View style={styles.methodToggle}>
                <Pressable
                  style={[
                    styles.methodOption,
                    verificationChannel === 'phone' && styles.activeMethodOption,
                  ]}
                  onPress={() => setVerificationChannel('phone')}
                >
                  <Text
                    style={[
                      styles.methodText,
                      verificationChannel === 'phone' && styles.activeMethodText,
                    ]}
                  >
                    Phone OTP
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.methodOption,
                    verificationChannel === 'email' && styles.activeMethodOption,
                  ]}
                  onPress={() => setVerificationChannel('email')}
                >
                  <Text
                    style={[
                      styles.methodText,
                      verificationChannel === 'email' && styles.activeMethodText,
                    ]}
                  >
                    Email OTP
                  </Text>
                </Pressable>
              </View>
            )}

            {message && (
              <View
                style={[
                  styles.messageBanner,
                  message.tone === 'success'
                    ? styles.messageBannerSuccess
                    : styles.messageBannerError,
                ]}
              >
                <Text
                  style={[
                    styles.messageTitle,
                    message.tone === 'success'
                      ? styles.messageTextSuccess
                      : styles.messageTextError,
                  ]}
                >
                  {message.title}
                </Text>
                <Text
                  style={[
                    styles.messageBody,
                    message.tone === 'success'
                      ? styles.messageTextSuccess
                      : styles.messageTextError,
                  ]}
                >
                  {message.body}
                </Text>
              </View>
            )}

            {!awaitingOtp ? (
              <>
                <View style={styles.inputContainer}>
                  <User color={colors.muted} size={20} style={styles.inputIcon} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Full Name"
                    placeholderTextColor="#8a8a8a"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Phone color={colors.muted} size={20} style={styles.inputIcon} />
                  <Text style={styles.countryCode}>+92</Text>
                  <TextInput
                    value={phone}
                    onChangeText={value =>
                      setPhone(normalizePakistanPhoneInput(value))
                    }
                    keyboardType="phone-pad"
                    placeholder="3112234334"
                    placeholderTextColor="#8a8a8a"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Mail color={colors.muted} size={20} style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Email Address"
                    placeholderTextColor="#8a8a8a"
                    style={styles.input}
                  />
                </View>

                <View
                  style={[
                    styles.inputContainer,
                    showPasswordRule && styles.inputContainerError,
                  ]}
                >
                  <Lock color={colors.muted} size={20} style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={scrollToPasswordInput}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Password"
                    placeholderTextColor="#8a8a8a"
                    returnKeyType="done"
                    style={styles.input}
                    textContentType="newPassword"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff color={colors.muted} size={20} />
                    ) : (
                      <Eye color={colors.muted} size={20} />
                    )}
                  </Pressable>
                </View>
                {showPasswordRule && (
                  <Text style={styles.passwordRequirement}>
                    Password must be at least 6 characters and include one
                    uppercase letter.
                  </Text>
                )}
              </>
            ) : (
              <View style={styles.inputContainer}>
                <KeyRound color={colors.muted} size={20} style={styles.inputIcon} />
                <TextInput
                  value={otpCode}
                  onChangeText={value =>
                    setOtpCode(value.replace(/\D/g, '').slice(0, 6))
                  }
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  importantForAutofill="yes"
                  placeholder="Verification code"
                  placeholderTextColor="#8a8a8a"
                  style={styles.input}
                  maxLength={6}
                />
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressedButton,
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading
                  ? awaitingOtp
                    ? 'Verifying...'
                    : 'Sending code...'
                  : awaitingOtp
                    ? 'Verify Code'
                    : 'Create Account'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.bottomPanel}>
            <View style={styles.panelIcon}>
              <ShieldCheck color={colors.secondary} size={22} strokeWidth={2.4} />
            </View>
            <View style={styles.panelCopy}>
              <Text style={styles.panelTitle}>One account for every booking</Text>
              <Text style={styles.panelText}>
                Save your details, track orders, and manage home services easily.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.select({ ios: 80, android: 120, default: 96 }),
    justifyContent: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 38,
    height: 38,
    borderRadius: rounded.default,
  },
  brand: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.authDark,
  },
  authLogoWrap: {
    alignSelf: 'center',
    width: 94,
    height: 94,
    borderRadius: 28,
    backgroundColor: '#effcf6',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  authLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  guestButton: {
    backgroundColor: colors.authDark,
    borderRadius: rounded.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guestText: {
    color: '#ffffff',
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: colors.authDark,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#effcf6',
    borderRadius: rounded.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 22,
  },
  heroBadgeText: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 12,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 23,
    color: colors.authDark,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text,
    marginBottom: 24,
  },
  methodToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  methodOption: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.default,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  activeMethodOption: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  methodText: {
    fontFamily: fontFamily.bold,
    color: colors.text,
    fontSize: 14,
  },
  activeMethodText: {
    color: '#ffffff',
  },
  messageBanner: {
    borderRadius: rounded.default,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  messageBannerError: {
    backgroundColor: '#fff7f7',
    borderColor: colors.errorContainer,
  },
  messageBannerSuccess: {
    backgroundColor: '#effcf6',
    borderColor: '#bbf7d0',
  },
  messageTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  messageBody: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  messageTextError: {
    color: colors.onErrorContainer,
  },
  messageTextSuccess: {
    color: '#006c49',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.xl,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputContainerError: {
    borderColor: colors.danger,
    backgroundColor: '#fff7f7',
  },
  inputIcon: {
    marginRight: 10,
  },
  countryCode: {
    fontFamily: fontFamily.bold,
    color: colors.authDark,
    fontSize: 14,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    color: colors.authDark,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    padding: 0,
  },
  passwordRequirement: {
    color: colors.danger,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -8,
    marginBottom: 14,
  },
  primaryButton: {
    height: 54,
    borderRadius: rounded.default,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  pressedButton: {
    opacity: 0.9,
  },
  primaryButtonText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 16,
  },
  bottomPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: rounded.xl,
    padding: 18,
    marginTop: 26,
    minHeight: 96,
  },
  panelIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  panelCopy: {
    flex: 1,
  },
  panelTitle: {
    fontFamily: fontFamily.bold,
    color: colors.onPrimary,
    fontSize: 15,
    marginBottom: 4,
  },
  panelText: {
    fontFamily: fontFamily.regular,
    color: colors.inversePrimary,
    fontSize: 12,
    lineHeight: 18,
  },
});



