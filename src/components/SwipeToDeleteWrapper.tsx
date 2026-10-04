import React, {useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';
import {Trash2} from 'lucide-react-native';
import {rounded} from '@/theme/layout';

interface SwipeToDeleteWrapperProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}

/**
 * Wraps a list row so swiping it to the left reveals a delete action.
 * Tapping the revealed area (or completing a full swipe) triggers onDelete.
 */
export function SwipeToDeleteWrapper({
  children,
  onDelete,
  deleteLabel = 'Delete',
}: SwipeToDeleteWrapperProps): React.JSX.Element {
  const swipeableRef = useRef<Swipeable>(null);

  const close = () => swipeableRef.current?.close();

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-80, 0],
    });

    return (
      <View style={styles.actionContainer}>
        <Animated.View style={[styles.actionBox, {transform: [{translateX}]}]}>
          <Trash2 color="#ffffff" size={17} strokeWidth={2.3} />
          <Text style={styles.actionText}>{deleteLabel}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        leftThreshold={40}
        friction={2}
        overshootLeft={false}
        onSwipeableOpen={direction => {
          if (direction === 'left') {
            close();
            onDelete();
          }
        }}>
        {children}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Clip the revealed delete action to the same rounded shape as list rows.
    borderRadius: rounded.lg,
    overflow: 'hidden',
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: '100%',
  },
  actionBox: {
    height: '100%',
    minWidth: 80,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
