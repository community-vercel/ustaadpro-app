import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Bell, CircleAlert, Megaphone, PackageCheck, ShoppingBag, X} from 'lucide-react-native';
import {useAppStore} from '@/store/useAppStore';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {rounded} from '@/theme/layout';

type NotificationKind = 'broadcast' | 'service' | 'shop';

function getNotificationMeta(title: string, body: string, orderId?: string) {
  const text = `${title} ${body} ${orderId || ''}`.toLowerCase();
  const kind: NotificationKind = text.includes('shop') || text.includes('shopping') || text.includes('store')
    ? 'shop'
    : text.includes('order') || text.includes('booking') || text.includes('service')
      ? 'service'
      : 'broadcast';

  if (kind === 'shop') {
    return {accent: '#db2777', surface: '#fff1f7', Icon: ShoppingBag};
  }
  if (kind === 'service') {
    return {accent: colors.secondary, surface: '#effcf6', Icon: PackageCheck};
  }
  return {accent: '#4f46e5', surface: '#eef2ff', Icon: Megaphone};
}
export function NotificationCenter({
  onPaymentNotificationPress,
}: {
  onPaymentNotificationPress?: (orderId?: string) => void;
} = {}): React.JSX.Element {
  const notifications = useAppStore(state => state.notifications);
  const hydrateNotifications = useAppStore(state => state.hydrateNotifications);
  const markAllNotificationsRead = useAppStore(
    state => state.markAllNotificationsRead,
  );
  const markNotificationRead = useAppStore(state => state.markNotificationRead);
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const unreadCount = useMemo(
    () => notifications.filter(item => !item.read).length,
    [notifications],
  );

  const openInbox = async () => {
    setVisible(true);
    await hydrateNotifications();
    await markAllNotificationsRead();
  };

  const refreshNotifications = async () => {
    setRefreshing(true);
    try {
      await hydrateNotifications();
      await markAllNotificationsRead();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Pressable
        style={styles.button}
        onPress={() => void openInbox()}
        accessibilityLabel="Open notifications"
      >
        <Bell color={colors.ink} size={19} strokeWidth={2.2} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={styles.screen} edges={['bottom']}>
          <View style={styles.page}>
            <View style={[styles.sheetHeader, {paddingTop: insets.top + 18}]}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={styles.sheetTitle} numberOfLines={1} adjustsFontSizeToFit>Notifications</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {notifications.length
                    ? `${notifications.length} push notification${notifications.length === 1 ? '' : 's'}`
                    : 'No notifications yet'}
                </Text>
              </View>
              <Pressable
                onPress={() => setVisible(false)}
                hitSlop={10}
                accessibilityLabel="Close notifications"
              >
                <X color={colors.muted} size={20} strokeWidth={2.2} />
              </Pressable>
            </View>

            <FlatList
              data={notifications}
              keyExtractor={item => item.id}
              contentContainerStyle={[
                styles.list,
                !notifications.length && styles.listEmpty,
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refreshNotifications}
                  tintColor={colors.authDark}
                  colors={[colors.authDark]}
                />
              }
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <CircleAlert color={colors.secondary} size={28} strokeWidth={2.2} />
                </View>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyBody}>
                  Order updates and app messages will appear here.
                </Text>
              </View>
              }
              renderItem={({item}) => {
                const meta = getNotificationMeta(item.title, item.body, item.orderId);
                const AccentIcon = meta.Icon;

                return (
                  <Pressable
                    style={[styles.item, !item.read && styles.itemUnread]}
                    onPress={async () => {
                      await markNotificationRead(item.id);
                    }}
                  >
                    <View style={[styles.itemIcon, {backgroundColor: meta.surface}]}>
                      <Image
                        source={require('@/assets/images/logo.png')}
                        style={styles.itemLogo}
                        resizeMode="contain"
                      />
                      <View style={[styles.itemIconBadge, {backgroundColor: meta.accent}]}>
                        <AccentIcon color="#ffffff" size={10} strokeWidth={2.7} />
                      </View>
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemBody} numberOfLines={3}>
                        {item.body}
                      </Text>
                    </View>
                    <Text style={styles.itemTime}>
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: rounded.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 10,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eff4ff',
  },
  sheetTitle: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 20,
  },
  sheetSubtitle: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 34,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: rounded.lg,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#e5eeff',
  },
  itemUnread: {
    backgroundColor: '#effcf6',
    borderColor: '#bfe9d4',
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#0b1c30',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  itemLogo: {
    width: 25,
    height: 25,
    borderRadius: 7,
  },
  itemIconBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  itemCopy: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 14,
  },
  itemBody: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  itemTime: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 11,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: rounded.full,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 18,
  },
  emptyBody: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});

