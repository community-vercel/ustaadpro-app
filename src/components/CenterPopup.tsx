import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react-native';
import {fontFamily} from '@/theme/typography';

export type CenterPopupTone = 'success' | 'error' | 'warning' | 'info';

export interface CenterPopupAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

interface CenterPopupProps {
  visible: boolean;
  title: string;
  message: string;
  tone?: CenterPopupTone;
  actions?: CenterPopupAction[];
  onDismiss?: () => void;
}

const TONE_META: Record<
  CenterPopupTone,
  {color: string; bg: string; Icon: typeof CheckCircle2}
> = {
  success: {color: '#087a5c', bg: '#dff8ea', Icon: CheckCircle2},
  error: {color: '#ba1a1a', bg: '#fee2e2', Icon: XCircle},
  warning: {color: '#b45309', bg: '#fef3c7', Icon: AlertTriangle},
  info: {color: '#1d4ed8', bg: '#dbeafe', Icon: Info},
};

export function CenterPopup({
  visible,
  title,
  message,
  tone = 'info',
  actions,
  onDismiss,
}: CenterPopupProps): React.JSX.Element {
  const meta = TONE_META[tone] || TONE_META.info;

  const close = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.card} onPress={event => event.stopPropagation()}>
          <View style={[styles.iconWrap, {backgroundColor: meta.bg}]}>
            <meta.Icon color={meta.color} size={30} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actionsRow}>
            {(actions && actions.length
              ? actions
              : [{label: 'OK', onPress: close, variant: 'primary' as const}]
            ).map((action, index) => (
              <Pressable
                key={`${action.label}-${index}`}
                style={[
                  styles.actionButton,
                  action.variant === 'secondary'
                    ? styles.actionSecondary
                    : styles.actionPrimary,
                ]}
                onPress={action.onPress}>
                <Text
                  style={
                    action.variant === 'secondary'
                      ? styles.actionSecondaryText
                      : styles.actionPrimaryText
                  }>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    elevation: 24,
    shadowColor: '#0b1c30',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 12},
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: '#0b1c30',
    textAlign: 'center',
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    color: '#45464d',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 13,
  },
  actionPrimary: {
    backgroundColor: '#006c49',
  },
  actionSecondary: {
    backgroundColor: '#f1f5f9',
  },
  actionPrimaryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  actionSecondaryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: '#0b1c30',
  },
});
