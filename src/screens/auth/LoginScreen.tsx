import React, { useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { AuthStackParamList } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { rounded } from '@/theme/layout';
type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

interface MessageState {
  title: string;
  body: string;
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

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const login = useAppStore(state => state.login);
  const loginWithPhone = useAppStore(state => state.loginWithPhone);
  const continueAsGuest = useAppStore(state => state.continueAsGuest);
  const requestPasswordResetOtp = useAppStore(
    state => state.requestPasswordResetOtp,
  );
  const resetPasswordWithOtp = useAppStore(
    state => state.resetPasswordWithOtp,
  );
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('phone');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetChannel, setResetChannel] = useState<'email' | 'phone'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<MessageState | null>(null);
  const [message, setMessage] = useState<MessageState | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetCodeReady = /^\d{6}$/.test(resetCode);
  const showNewPasswordRule =
    newPassword.length > 0 && !isMediumPassword(newPassword);

  const showMessage = (nextMessage: MessageState) => {
    if (messageTimer.current) {
      clearTimeout(messageTimer.current);
    }

    setMessage(nextMessage);
    messageTimer.current = setTimeout(() => setMessage(null), 3600);
  };

  const handleLogin = async () => {
    if (loginMethod === 'phone') {
      if (!/^\d{10}$/.test(phone)) {
        showMessage({
          title: 'Missing phone',
          body: 'Please enter your 10 digit phone number.',
        });
        return;
      }

      setLoading(true);
      try {
        await loginWithPhone(`+92${phone}`);
      } catch (error: any) {
        showMessage({
          title: 'Login failed',
          body: error.response?.data?.message || 'Something went wrong',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      showMessage({
        title: 'Missing details',
        body: 'Please enter email and password.',
      });
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      showMessage({
        title: 'Login failed',
        body: error.response?.data?.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    await continueAsGuest();
    navigation.getParent()?.dispatch(CommonActions.navigate({ name: 'Main' }));
  };

  const closeResetModal = () => {
    setResetVisible(false);
    setResetOtpSent(false);
    setResetCode('');
    setNewPassword('');
    setShowNewPassword(false);
    setResetMessage(null);
  };

  const handleRequestPasswordResetOtp = async () => {
    if (resetChannel === 'email' && !resetEmail.trim()) {
      setResetMessage({
        title: 'Email required',
        body: 'Please enter your registered email address.',
      });
      return;
    }

    if (resetChannel === 'phone' && !/^\d{10}$/.test(resetPhone)) {
      setResetMessage({
        title: 'Phone required',
        body: 'Please enter your 10 digit registered phone number.',
      });
      return;
    }

    setResetLoading(true);
    try {
      await requestPasswordResetOtp({
        channel: resetChannel,
        email: resetChannel === 'email' ? resetEmail.trim() : undefined,
        phone: resetChannel === 'phone' ? `+92${resetPhone}` : undefined,
      });
      setResetOtpSent(true);
      setResetMessage({
        title: 'OTP sent',
        body: `Password reset code sent to your ${resetChannel}.`,
      });
    } catch (error: any) {
      setResetMessage({
        title: 'OTP failed',
        body: error.response?.data?.message || 'Could not send OTP.',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!/^\d{6}$/.test(resetCode)) {
      setResetMessage({
        title: 'Invalid OTP',
        body: 'Please enter the 6 digit verification code.',
      });
      return;
    }

    if (!isMediumPassword(newPassword)) {
      setResetMessage({
        title: 'Weak password',
        body: 'Password must be at least 6 characters and include one uppercase letter.',
      });
      return;
    }

    setResetLoading(true);
    try {
      await resetPasswordWithOtp({
        channel: resetChannel,
        email: resetChannel === 'email' ? resetEmail.trim() : undefined,
        phone: resetChannel === 'phone' ? `+92${resetPhone}` : undefined,
        code: resetCode,
        newPassword,
      });
      closeResetModal();
      showMessage({
        title: 'Password updated',
        body: 'You can now login with your new password.',
      });
    } catch (error: any) {
      setResetMessage({
        title: 'Reset failed',
        body: error.response?.data?.message || 'Could not reset password.',
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Modal
        visible={resetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeResetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resetCard}>
            <Text style={styles.resetTitle}>Forgot password</Text>
            <Text style={styles.resetSubtitle}>
              Reset using email OTP or mobile OTP.
            </Text>

            {resetMessage && (
              <View style={styles.messageBanner}>
                <Text style={styles.messageTitle}>{resetMessage.title}</Text>
                <Text style={styles.messageBody}>{resetMessage.body}</Text>
              </View>
            )}

            <View style={styles.methodToggle}>
              {(['email', 'phone'] as const).map(channel => (
                <Pressable
                  key={channel}
                  style={[
                    styles.methodOption,
                    resetChannel === channel && styles.activeMethodOption,
                  ]}
                  onPress={() => {
                    setResetChannel(channel);
                    setResetOtpSent(false);
                    setResetCode('');
                    setNewPassword('');
                    setShowNewPassword(false);
                  }}
                >
                  <Text
                    style={[
                      styles.methodText,
                      resetChannel === channel && styles.activeMethodText,
                    ]}
                  >
                    {channel === 'email' ? 'Email OTP' : 'Phone OTP'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {resetChannel === 'email' ? (
              <View style={styles.inputContainer}>
                <Mail color={colors.muted} size={20} style={styles.inputIcon} />
                <TextInput
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Registered email"
                  placeholderTextColor="#8a8a8a"
                  style={styles.input}
                />
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Phone color={colors.muted} size={20} style={styles.inputIcon} />
                <Text style={styles.countryCode}>+92</Text>
                <TextInput
                  value={resetPhone}
                  onChangeText={value =>
                    setResetPhone(normalizePakistanPhoneInput(value))
                  }
                  keyboardType="phone-pad"
                  placeholder="Phone Number"
                  placeholderTextColor="#8a8a8a"
                  style={styles.input}
                />
              </View>
            )}

            {resetOtpSent && (
              <View style={styles.inputContainer}>
                <ShieldCheck
                  color={colors.muted}
                  size={20}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={resetCode}
                  onChangeText={value =>
                    setResetCode(value.replace(/\D/g, '').slice(0, 6))
                  }
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  importantForAutofill="yes"
                  placeholder="6 digit OTP"
                  placeholderTextColor="#8a8a8a"
                  style={styles.input}
                />
              </View>
            )}

            {resetOtpSent && resetCodeReady && (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    showNewPasswordRule && styles.inputContainerError,
                  ]}
                >
                  <Lock
                    color={colors.muted}
                    size={20}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    placeholder="New password"
                    placeholderTextColor="#8a8a8a"
                    style={styles.input}
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff color={colors.muted} size={20} />
                    ) : (
                      <Eye color={colors.muted} size={20} />
                    )}
                  </Pressable>
                </View>
                {showNewPasswordRule && (
                  <Text style={styles.passwordRequirement}>
                    Password must be at least 6 characters and include one
                    uppercase letter.
                  </Text>
                )}
              </>
            )}

            <Pressable
              style={styles.primaryButton}
              onPress={
                resetOtpSent && resetCodeReady
                  ? handleResetPassword
                  : handleRequestPasswordResetOtp
              }
              disabled={resetLoading || (resetOtpSent && !resetCodeReady)}
            >
              <Text style={styles.primaryButtonText}>
                {resetLoading
                  ? 'Please wait...'
                  : resetOtpSent && resetCodeReady
                    ? 'Reset password'
                    : resetOtpSent
                      ? 'Enter OTP'
                      : 'Send OTP'}
              </Text>
            </Pressable>
            <Pressable style={styles.resetCancelButton} onPress={closeResetModal}>
              <Text style={styles.resetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <ScrollView
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
            onPress={() => {
              void handleContinueAsGuest();
            }}
          >
            <Text style={styles.guestText}>Guest</Text>
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
            <Text style={styles.heroBadgeText}>Trusted home services</Text>
          </View>

          <Text style={styles.title}>Welcome to UstaadPro</Text>
          <Text style={styles.subtitle}>
            {loginMethod === 'phone'
              ? 'Enter your registered phone number to continue'
              : 'Enter your email and password to continue'}
          </Text>

          <View style={styles.methodToggle}>
            <Pressable
              style={[
                styles.methodOption,
                loginMethod === 'phone' && styles.activeMethodOption,
              ]}
              onPress={() => {
                setLoginMethod('phone');
              }}
            >
              <Text
                style={[
                  styles.methodText,
                  loginMethod === 'phone' && styles.activeMethodText,
                ]}
              >
                Phone
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.methodOption,
                loginMethod === 'email' && styles.activeMethodOption,
              ]}
              onPress={() => {
                setLoginMethod('email');
              }}
            >
              <Text
                style={[
                  styles.methodText,
                  loginMethod === 'email' && styles.activeMethodText,
                ]}
              >
                Email
              </Text>
            </Pressable>
          </View>

          {message && (
            <View style={styles.messageBanner}>
              <Text style={styles.messageTitle}>{message.title}</Text>
              <Text style={styles.messageBody}>{message.body}</Text>
            </View>
          )}

          {loginMethod === 'phone' ? (
            <View style={styles.inputContainer}>
              <Phone color={colors.muted} size={20} style={styles.inputIcon} />
              <Text style={styles.countryCode}>+92</Text>
              <TextInput
                value={phone}
                onChangeText={value => setPhone(normalizePakistanPhoneInput(value))}
                keyboardType="phone-pad"
                placeholder="3112234334"
                placeholderTextColor="#8a8a8a"
                style={styles.input}
              />
            </View>
          ) : (
            <>
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
              <View style={styles.inputContainer}>
                <Lock color={colors.muted} size={20} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Password"
                  placeholderTextColor="#8a8a8a"
                  style={styles.input}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff color={colors.muted} size={20} />
                  ) : (
                    <Eye color={colors.muted} size={20} />
                  )}
                </Pressable>
              </View>
            </>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressedButton,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading
                ? 'Please wait...'
                : loginMethod === 'phone'
                  ? 'Continue'
                  : 'Login'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.forgotButton}
            onPress={() => {
              setResetEmail(email);
              setResetPhone(phone);
              setResetChannel(loginMethod === 'phone' ? 'phone' : 'email');
              setResetVisible(true);
            }}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <View style={styles.accountPrompt}>
            <Text style={styles.accountPromptText}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.accountPromptLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.panelIcon}>
            <ShieldCheck color={colors.secondary} size={22} strokeWidth={2.4} />
          </View>
          <View style={styles.panelCopy}>
            <Text style={styles.panelTitle}>Fast bookings, verified pros</Text>
            <Text style={styles.panelText}>
              Manage repairs, cleaning, and home services from one account.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  resetCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetTitle: {
    fontFamily: fontFamily.bold,
    color: colors.authDark,
    fontSize: 22,
  },
  resetSubtitle: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 34,
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
    borderColor: colors.errorContainer,
    backgroundColor: '#fff7f7',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  messageTitle: {
    fontFamily: fontFamily.bold,
    color: colors.onErrorContainer,
    fontSize: 13,
  },
  messageBody: {
    fontFamily: fontFamily.regular,
    color: colors.onErrorContainer,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
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
  forgotButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  forgotText: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 13,
  },
  resetCancelButton: {
    height: 44,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  resetCancelText: {
    fontFamily: fontFamily.bold,
    color: colors.authDark,
    fontSize: 14,
  },
  accountPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  accountPromptText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 14,
  },
  accountPromptLink: {
    fontFamily: fontFamily.bold,
    color: colors.authDark,
    fontSize: 14,
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



