import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck,
  Headphones,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Star,
} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {rounded} from '@/theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

const serviceSteps = [
  'Choose a service category such as AC repair, electrician, plumbing, cleaning, or maintenance.',
  'Open the service, select the specific work, add issue details or photos, and add it to cart.',
  'Pick a date, time, saved address, and cash payment method before confirming.',
  'Track the booking status from My Bookings and review the service after completion.',
];

const storeSteps = [
  'Explore products related to home services from the Store tab.',
  'Open a product to view details, price, image, and stock availability.',
  'Add products to cart, select a delivery address, and complete shopping with cash on delivery.',
  'Track store order status from My Store Orders.',
];

export function AboutScreen({navigation}: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.ink} size={20} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.headerTitle}>About Ustaad Pro</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Expert service every time</Text>
          <Text style={styles.heroText}>
            Ustaad Pro is a home services and service-products app made for
            customers who want fast booking, clear pricing, saved addresses,
            order tracking, and simple support in one place.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you can do</Text>
          <View style={styles.grid}>
            <View style={styles.featureCard}>
              <CalendarCheck
                color={colors.secondary}
                size={22}
                strokeWidth={2.4}
              />
              <Text style={styles.featureTitle}>Book services</Text>
              <Text style={styles.featureText}>
                Schedule home repair and maintenance services with preferred
                time, address, and service details.
              </Text>
            </View>
            <View style={styles.featureCard}>
              <ShoppingBag
                color={colors.secondary}
                size={22}
                strokeWidth={2.4}
              />
              <Text style={styles.featureTitle}>Shop products</Text>
              <Text style={styles.featureText}>
                Buy service-related products from the in-app store and track
                delivery status.
              </Text>
            </View>
            <View style={styles.featureCard}>
              <MapPin color={colors.secondary} size={22} strokeWidth={2.4} />
              <Text style={styles.featureTitle}>Save addresses</Text>
              <Text style={styles.featureText}>
                Save and edit addresses for future bookings and shopping
                deliveries.
              </Text>
            </View>
            <View style={styles.featureCard}>
              <Star color={colors.secondary} size={22} strokeWidth={2.4} />
              <Text style={styles.featureTitle}>Review services</Text>
              <Text style={styles.featureText}>
                Customers can review services after a confirmed booking is
                completed.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How service booking works</Text>
          <View style={styles.stepBox}>
            {serviceSteps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How shopping works</Text>
          <View style={styles.stepBox}>
            {storeSteps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconBox}>
            <BadgeCheck color={colors.secondary} size={22} strokeWidth={2.4} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Verified service flow</Text>
            <Text style={styles.infoText}>
              Book services, choose saved addresses, track order status, and
              review completed services.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconBox}>
            <PackageCheck
              color={colors.secondary}
              size={22}
              strokeWidth={2.4}
            />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Order tracking</Text>
            <Text style={styles.infoText}>
              Service bookings and store purchases have separate tracking
              screens so customers can quickly check status updates.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconBox}>
            <ShieldCheck color={colors.secondary} size={22} strokeWidth={2.4} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Secure account details</Text>
            <Text style={styles.infoText}>
              Phone and email are verified during account setup and used for
              booking confirmations and account recovery.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconBox}>
            <Headphones color={colors.secondary} size={22} strokeWidth={2.4} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Customer support</Text>
            <Text style={styles.infoText}>
              Support details are managed by the admin team so customers can
              reach the right help from service pages.
            </Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Built for simple daily use</Text>
          <Text style={styles.noteText}>
            Ustaad Pro keeps the important actions close: search services,
            filter results, book with saved details, receive notifications, and
            return later without logging in again during the active session.
          </Text>
        </View>
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
    backgroundColor: colors.primaryContainer,
    padding: 20,
  },
  heroTitle: {
    fontFamily: fontFamily.extraBold,
    color: '#ffffff',
    fontSize: 22,
  },
  heroText: {
    fontFamily: fontFamily.regular,
    color: colors.inversePrimary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 17,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    width: '48%',
    minHeight: 148,
    borderRadius: rounded.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  featureTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
    marginTop: 10,
  },
  featureText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  stepBox: {
    borderRadius: rounded.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  infoCard: {
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
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {flex: 1},
  infoTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 14,
  },
  infoText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  noteCard: {
    borderRadius: rounded.lg,
    backgroundColor: '#effcf6',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 16,
  },
  noteTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 15,
  },
  noteText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
  },
});
