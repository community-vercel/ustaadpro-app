import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  LockKeyhole,
  MapPin,
  ReceiptText,
  Trash2,
  UserCheck,
  WalletCards,
  Gift,
} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {rounded} from '@/theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

const supportEmail = 'ustaadpro.official26@gmail.com';

const sections = [
  {
    title: 'Account information',
    body:
      'We use your name, phone number, and email to create your account, verify access, process bookings, and contact you about service or shopping orders.',
    Icon: UserCheck,
  },
  {
    title: 'Addresses and location',
    body:
      'Saved addresses are used for service visits and store deliveries. Current location is used only when you choose to locate your address.',
    Icon: MapPin,
  },
  {
    title: 'Notifications',
    body:
      'Push notifications are used for booking updates, shopping order status changes, and important service alerts from Ustaad Pro.',
    Icon: Bell,
  },
  {
    title: 'Pricing model',
    body:
      'By booking a service, you agree with the displayed pricing model, including service charges, inspection fees, platform charges, taxes, delivery fees, and any payment method shown before confirmation.',
    Icon: ReceiptText,
  },
  {
    title: 'UstaadPro Wallet',
    body:
      'Your wallet balance is shown in Profile and may contain refunds or account credits. When a booking is marked Cancelled, UstaadPro credits the verified EasyPaisa amount paid for that booking back to your wallet. Pending or rejected payment receipts are not credited, and the same cancellation is credited only once. To use the balance, select Use wallet balance on the booking screen. The app applies up to the final booking total; that amount is deducted when checkout is accepted. If the wallet is smaller than the total, only the remaining amount is payable through the selected method. If it covers the total, no EasyPaisa receipt is required. If booking creation fails, the deduction is restored. Wallet credit is linked to your account and is not transferable cash.',
    Icon: WalletCards,
  },
  {
    title: 'Reward points',
    body:
      'When rewards are enabled, the number of points configured by UstaadPro is added once when an eligible service booking is marked Completed. The booking screen shows your points, the current rupee value of each point, the minimum value required to redeem, and the maximum percentage allowed for that service. Select Use reward points before confirming. The app uses only whole redeemable points, limits the discount to the configured percentage of the service subtotal, and deducts those points when checkout is accepted. Wallet funds are applied after the reward discount, inspection fee, platform charges, and tax are calculated. If an order is cancelled, redeemed points are restored and points earned from that order are removed. Points are promotional and cannot be transferred, withdrawn, or exchanged for cash.',
    Icon: Gift,
  },
  {
    title: 'Wallet, reward, and payment records',
    body:
      'For each booking, we keep the original total, reward discount and points redeemed or earned, wallet amount used, remaining payable total, payment receipt amount and verification status, cancellation reason, and any cancellation refund entry. These records prevent duplicate refunds or redemptions and support payment reconciliation, complaints, and account assistance. UstaadPro does not ask for or store your EasyPaisa PIN in the app.',
    Icon: LockKeyhole,
  },
  {
    title: 'Data protection',
    body:
      'We keep account data linked to the signed-in user. Profile photos, addresses, orders, and reviews are not shared across different users.',
    Icon: LockKeyhole,
  },
  {
    title: 'Deleting your account',
    body:
      'Signed-in users can permanently delete their account from the Home burger menu by selecting Delete Account and confirming the warning. Account deletion removes account access and associated app records and cannot be undone. Contact support if you cannot access your account.',
    Icon: Trash2,
  },
];

export function PrivacyPolicyScreen({
  navigation,
}: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.ink} size={20} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={{flex: 1}} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Your privacy matters</Text>
          <Text style={styles.heroText}>
            This page explains how Ustaad Pro uses the information needed to run
            bookings, wallet funds, reward points, shopping orders, account recovery, and notifications.
          </Text>
        </View>

        {sections.map(section => {
          const Icon = section.Icon;
          return (
            <View key={section.title} style={styles.sectionCard}>
              <View style={styles.iconBox}>
                <Icon color={colors.secondary} size={21} strokeWidth={2.4} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionText}>
                  {section.body}
                  {section.title === 'Deleting your account' ? (
                    <>
                      {' '}
                      Email:{' '}
                      <Text style={styles.highlightEmail}>{supportEmail}</Text>
                    </>
                  ) : null}
                </Text>
              </View>
            </View>
          );
        })}

        <Text style={styles.footerText}>
          For privacy, pricing, support, or account deletion questions, contact
          Ustaad Pro at{' '}
          <Text style={styles.highlightEmail}>{supportEmail}</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 17,
  },
  headerSpacer: {width: 40},
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    borderRadius: rounded.xl,
    backgroundColor: '#effcf6',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 20,
  },
  heroTitle: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 22,
  },
  heroText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  sectionCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: rounded.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: rounded.default,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCopy: {flex: 1},
  sectionTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 14,
  },
  sectionText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  footerText: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  highlightEmail: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    backgroundColor: '#fef08a',
  },
});
