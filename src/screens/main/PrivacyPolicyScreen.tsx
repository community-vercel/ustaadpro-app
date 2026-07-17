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
    title: 'Data protection',
    body:
      'We keep account data linked to the signed-in user. Profile photos, addresses, orders, and reviews are not shared across different users.',
    Icon: LockKeyhole,
  },
  {
    title: 'Deleting your account',
    body:
      'To request account deletion, contact us from your registered email or include your registered phone number so we can verify the request.',
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

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Your privacy matters</Text>
          <Text style={styles.heroText}>
            This page explains how Ustaad Pro uses the information needed to run
            bookings, shopping orders, account recovery, and notifications.
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
