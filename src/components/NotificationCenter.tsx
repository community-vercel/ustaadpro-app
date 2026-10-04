import React, {useMemo, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Bell, CircleAlert, Megaphone, PackageCheck, ShoppingBag, Trash2, X} from 'lucide-react-native';
import {SwipeToDeleteWrapper} from '@/components/SwipeToDeleteWrapper';
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
  const deleteNotification = useAppStore(state => state.deleteNotification);
  const clearAllNotifications = useAppStore(state => state.clearAllNotifications);
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
        statusBarTranslucent={Platform.OS === 'android'}
        onRequestClose={() => setVisible(false)}
      >
        <GestureHandlerRootView style={styles.gestureRoot}>
        <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.page}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  Notifications
                </Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {notifications.length
                    ? `${notifications.length} push notification${notifications.length === 1 ? '' : 's'}`
                    : 'No notifications yet'}
                </Text>
              </View>
              <View style={styles.sheetHeaderActions}>
                {notifications.length ? (
                  <Pressable
                    onPress={() => void clearAllNotifications()}
                    hitSlop={8}
                    style={styles.clearAllButton}
                    accessibilityLabel="Clear all notifications"
                  >
                    <Trash2 color="#ba1a1a" size={16} strokeWidth={2.2} />
                    <Text style={styles.clearAllText}>Clear all</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setVisible(false)}
                  hitSlop={16}
                  style={styles.closeButton}
                  accessibilityLabel="Close notifications"
                >
                  <X color={colors.muted} size={20} strokeWidth={2.2} />
                </Pressable>
              </View>
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
                  <SwipeToDeleteWrapper onDelete={() => void deleteNotification(item.id)}>
                  <Pressable
                    style={[styles.item, !item.read && styles.itemUnread]}
                    onPress={async () => {
                      await markNotificationRead(item.id);
                      if (item.orderId && onPaymentNotificationPress) {
                        onPaymentNotificationPress(item.orderId);
                      }
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
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemBody} numberOfLines={4}>
                        {item.body}
                      </Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemTime} numberOfLines={1}>
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Pressable
                        style={styles.itemDelete}
                        hitSlop={8}
                        onPress={() => void deleteNotification(item.id)}
                        accessibilityLabel="Delete notification"
                      >
                        <Trash2 color="#ba1a1a" size={15} strokeWidth={2.2} />
                      </Pressable>
                    </View>
                  </Pressable>
                </SwipeToDeleteWrapper>
                );
              }}
            />
          </View>
        </SafeAreaView>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
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
    lineHeight: 12,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gestureRoot: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eff4ff',
  },
  sheetHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  sheetTitle: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
  },
  sheetSubtitle: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: rounded.full,
    backgroundColor: '#fee2e2',
  },
  clearAllText: {
    fontFamily: fontFamily.semiBold,
    color: '#ba1a1a',
    fontSize: 12,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  itemDelete: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
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
    minWidth: 0,
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
    flexShrink: 0,
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
    minWidth: 0,
  },
  itemTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
  },
  itemBody: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    flexShrink: 1,
  },
  itemTime: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    flexShrink: 0,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: rounded.full,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
  },
  emptyBody: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});
