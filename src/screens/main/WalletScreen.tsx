import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  ArrowDownLeft,
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Smartphone,
  WalletCards,
  XCircle,
} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {CenterPopup} from '@/components/CenterPopup';
import {apiClient} from '@/api/client';
import {useAppStore} from '@/store/useAppStore';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {rounded} from '@/theme/layout';
import {formatPkr} from '@/utils/currency';

type WithdrawalMethod = 'easypaisa' | 'jazzcash' | 'bank';

interface Withdrawal {
  id: number;
  amount: number;
  method: WithdrawalMethod;
  accountNumber: string;
  bankName?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string | null;
  createdAt: string;
}

interface WalletOverview {
  walletBalance: number;
  minWithdrawalAmount: number;
  withdrawals: Withdrawal[];
}

const METHOD_OPTIONS: Array<{
  id: WithdrawalMethod;
  label: string;
  hint: string;
  Icon: typeof Smartphone;
}> = [
  {id: 'easypaisa', label: 'Easypaisa', hint: 'Mobile account', Icon: Smartphone},
  {id: 'jazzcash', label: 'JazzCash', hint: 'Mobile account', Icon: Smartphone},
  {id: 'bank', label: 'Bank Transfer', hint: 'Bank account', Icon: Building2},
];

const methodLabel = (method: Withdrawal['method']) =>
  METHOD_OPTIONS.find(option => option.id === method)?.label || method;

function statusMeta(status: Withdrawal['status']) {
  if (status === 'approved') {
    return {label: 'Approved', color: '#087a5c', Icon: CheckCircle2};
  }
  if (status === 'rejected') {
    return {label: 'Rejected', color: '#ba1a1a', Icon: XCircle};
  }
  return {label: 'Pending review', color: '#b26a00', Icon: Clock3};
}

export function WalletScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useAppStore(state => state.user);

  const [overview, setOverview] = useState<WalletOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [popup, setPopup] = useState<{
    title: string;
    message: string;
    tone: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');

  const walletBalance = Math.max(0, Number(overview?.walletBalance ?? user?.walletBalance ?? 0));
  const minAmount = Number(overview?.minWithdrawalAmount ?? 100);

  const loadOverview = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      }
      try {
        const response = await apiClient.get('/wallet');
        setOverview(response.data);
      } catch (error) {
        console.error('Wallet overview error:', error);
        if (!isRefresh) {
          setPopup({
            title: 'Something went wrong',
            message: 'Could not load your wallet. Please try again.',
            tone: 'error',
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const resetForm = () => {
    setAmount('');
    setMethod(null);
    setAccountNumber('');
    setBankName('');
    setAccountName('');
  };

  const submitWithdrawal = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setPopup({
        title: 'Enter amount',
        message: 'Please enter a valid withdrawal amount.',
        tone: 'warning',
      });
      return;
    }
    if (numericAmount < minAmount) {
      setPopup({
        title: 'Amount too low',
        message: `Minimum withdrawal amount is ${formatPkr(minAmount)}.`,
        tone: 'warning',
      });
      return;
    }
    if (numericAmount > walletBalance) {
      setPopup({
        title: 'Insufficient balance',
        message: 'You cannot withdraw more than your available wallet balance.',
        tone: 'warning',
      });
      return;
    }
    if (!method) {
      setPopup({
        title: 'Select method',
        message: 'Choose Easypaisa, JazzCash or Bank transfer.',
        tone: 'warning',
      });
      return;
    }
    if (!accountNumber.trim()) {
      setPopup({
        title: 'Account required',
        message:
          method === 'bank'
            ? 'Please enter your bank account number.'
            : 'Please enter your account number.',
        tone: 'warning',
      });
      return;
    }
    if (method === 'bank' && !bankName.trim()) {
      setPopup({
        title: 'Bank name required',
        message: 'Please enter your bank name.',
        tone: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiClient.post('/wallet/withdrawals', {
        amount: numericAmount,
        method,
        accountNumber: accountNumber.trim(),
        bankName: method === 'bank' ? bankName.trim() : undefined,
        accountName: accountName.trim() || undefined,
      });
      setPopup({
        title: 'Request submitted',
        message: `Your withdrawal of ${formatPkr(
          numericAmount,
        )} has been sent to the UstaadPro team. You will be notified once it is processed.`,
        tone: 'success',
      });
      resetForm();
      setShowForm(false);
      await loadOverview();
      // Keep the profile/store wallet balance in sync with the new balance.
      const freshBalance = Number(response?.data?.walletBalance);
      if (Number.isFinite(freshBalance)) {
        const currentUser = useAppStore.getState().user;
        if (currentUser) {
          useAppStore.setState({
            user: {...currentUser, walletBalance: freshBalance},
          });
        }
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Could not submit your request. Please try again.';
      setPopup({
        title: 'Withdrawal failed',
        message,
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderWithdrawal = (withdrawal: Withdrawal) => {
    const meta = statusMeta(withdrawal.status);
    return (
      <View key={withdrawal.id} style={styles.historyCard}>
        <View style={styles.historyIconWrap}>
          <ArrowDownLeft color="#006c49" size={18} strokeWidth={2.2} />
        </View>
        <View style={styles.historyBody}>
          <Text style={styles.historyTitle}>
            Withdrawal to {methodLabel(withdrawal.method)}
          </Text>
          <Text style={styles.historyMeta} numberOfLines={1}>
            {withdrawal.method === 'bank' && withdrawal.bankName
              ? `${withdrawal.bankName} · `
              : ''}
            {withdrawal.accountNumber}
          </Text>
          {withdrawal.status === 'rejected' && withdrawal.adminNote ? (
            <Text style={styles.historyNote} numberOfLines={2}>
              Note: {withdrawal.adminNote}
            </Text>
          ) : null}
        </View>
        <View style={styles.historyRight}>
          <Text style={styles.historyAmount}>
            {formatPkr(Number(withdrawal.amount))}
          </Text>
          <View
            style={[
              styles.statusPill,
              {backgroundColor: `${meta.color}14`},
            ]}>
            <meta.Icon color={meta.color} size={12} strokeWidth={2.4} />
            <Text style={[styles.statusText, {color: meta.color}]}>
              {meta.label}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}>
          <ArrowLeft color="#0b1c30" size={22} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>UstaadPro Wallet</Text>
        <Pressable
          style={styles.backButton}
          onPress={() => void loadOverview(true)}
          hitSlop={10}>
          <RefreshCw color="#0b1c30" size={18} strokeWidth={2.2} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#006c49" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadOverview(true)}
              tintColor="#006c49"
            />
          }>
          <View style={styles.balanceCard}>
            <View style={styles.balanceIconWrap}>
              <WalletCards color="#ffffff" size={24} strokeWidth={2.2} />
            </View>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceAmount}>{formatPkr(walletBalance)}</Text>
            <Text style={styles.balanceNote}>
              Withdraw to Easypaisa, JazzCash or your bank account, or use it
              for future bookings.
            </Text>
            <Pressable
              style={[
                styles.withdrawButton,
                walletBalance < minAmount && styles.withdrawButtonDisabled,
              ]}
              disabled={walletBalance < minAmount}
              onPress={() => setShowForm(value => !value)}>
              <Banknote color="#ffffff" size={18} strokeWidth={2.2} />
              <Text style={styles.withdrawButtonText}>
                {showForm ? 'Close withdrawal form' : 'Withdraw'}
              </Text>
            </Pressable>
          </View>

          {showForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Request a withdrawal</Text>

              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder={`Min ${formatPkr(minAmount)}`}
                placeholderTextColor="#9aa3b2"
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Withdraw to</Text>
              <View style={styles.methodRow}>
                {METHOD_OPTIONS.map(option => {
                  const selected = method === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.methodChip, selected && styles.methodChipActive]}
                      onPress={() => {
                        setMethod(option.id);
                        if (option.id !== 'bank') {
                          setBankName('');
                        }
                      }}>
                      <option.Icon
                        color={selected ? '#ffffff' : '#006c49'}
                        size={17}
                        strokeWidth={2.2}
                      />
                      <Text
                        style={[
                          styles.methodLabel,
                          selected && styles.methodLabelActive,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {method === 'bank' ? (
                <>
                  <Text style={styles.inputLabel}>Bank name</Text>
                  <TextInput
                    style={styles.input}
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="e.g. Meezan Bank"
                    placeholderTextColor="#9aa3b2"
                  />
                </>
              ) : null}

              <Text style={styles.inputLabel}>
                {method === 'bank' ? 'Account number (IBAN)' : 'Account number'}
              </Text>
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder={
                  method === 'bank'
                    ? 'PK00XXXX0000000000000000'
                    : method === 'easypaisa' || method === 'jazzcash'
                    ? '03XXXXXXXXX'
                    : 'Enter account number'
                }
                placeholderTextColor="#9aa3b2"
                autoCapitalize="none"
                keyboardType={
                  method === 'easypaisa' || method === 'jazzcash'
                    ? 'phone-pad'
                    : 'default'
                }
              />

              <Text style={styles.inputLabel}>Account holder name (optional)</Text>
              <TextInput
                style={styles.input}
                value={accountName}
                onChangeText={setAccountName}
                placeholder="As registered on the account"
                placeholderTextColor="#9aa3b2"
                autoCapitalize="words"
              />

              <Pressable
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                disabled={submitting}
                onPress={() => void submitWithdrawal()}>
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit request</Text>
                )}
              </Pressable>
              <Text style={styles.formNote}>
                The amount is deducted from your wallet immediately and held
                until the UstaadPro team processes your request.
              </Text>
            </View>
          ) : null}

          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Withdrawal history</Text>
            {overview?.withdrawals?.length
              ? overview.withdrawals.map(renderWithdrawal)
              : (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>
                    No withdrawal requests yet.
                  </Text>
                </View>
              )}
          </View>
        </ScrollView>
      )}
      {popup ? (
        <CenterPopup
          visible
          title={popup.title}
          message={popup.message}
          tone={popup.tone}
          onDismiss={() => setPopup(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: '#0b1c30',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    borderRadius: rounded.xl ?? 22,
    backgroundColor: '#006c49',
    padding: 22,
    alignItems: 'center',
  },
  balanceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    marginBottom: 10,
  },
  balanceLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#d9f5e8',
  },
  balanceAmount: {
    fontFamily: fontFamily.extraBold,
    fontSize: 32,
    color: '#ffffff',
    marginTop: 4,
  },
  balanceNote: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#c9ecdc',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#087a5c',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 26,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  withdrawButtonDisabled: {
    opacity: 0.55,
  },
  withdrawButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl ?? 22,
    padding: 18,
    marginTop: 14,
  },
  formTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: '#0b1c30',
    marginBottom: 4,
  },
  inputLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#45464d',
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6ef',
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: '#0b1c30',
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#dfe6ef',
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  methodChipActive: {
    backgroundColor: '#006c49',
    borderColor: '#006c49',
  },
  methodLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: '#0b1c30',
  },
  methodLabelActive: {
    color: '#ffffff',
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006c49',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 18,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: '#ffffff',
  },
  formNote: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#76777d',
    marginTop: 10,
    lineHeight: 16,
  },
  historySection: {
    marginTop: 22,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: '#0b1c30',
    marginBottom: 10,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  historyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dff8ea',
  },
  historyBody: {
    flex: 1,
  },
  historyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13.5,
    color: '#0b1c30',
  },
  historyMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#76777d',
    marginTop: 2,
  },
  historyNote: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#b26a00',
    marginTop: 3,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  historyAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#0b1c30',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: fontFamily.medium,
    fontSize: 10.5,
  },
  emptyHistory: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#76777d',
  },
});
