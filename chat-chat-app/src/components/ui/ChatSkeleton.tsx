import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

// ── Single shimmer bar ──────────────────────────────────────────────────────
const ShimmerBar = ({
  width,
  height = 14,
  borderRadius = 7,
  delay = 0,
  shimmerAnim,
}: {
  width: number | string;
  height?: number;
  borderRadius?: number;
  delay?: number;
  shimmerAnim: Animated.Value;
}) => {
  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.8, 0.3],
  });
  return (
    <Animated.View
      style={[
        styles.shimmerBar,
        { width: width as any, height, borderRadius, opacity },
      ]}
    />
  );
};

// ── Single skeleton chat row ────────────────────────────────────────────────
const SkeletonChatRow = ({ shimmerAnim }: { shimmerAnim: Animated.Value }) => (
  <View style={styles.row}>
    {/* Avatar circle */}
    <Animated.View
      style={[
        styles.avatarCircle,
        {
          opacity: shimmerAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.3, 0.8, 0.3],
          }),
        },
      ]}
    />
    <View style={styles.rowContent}>
      <View style={styles.rowTop}>
        {/* Name */}
        <ShimmerBar width="55%" height={14} shimmerAnim={shimmerAnim} />
        {/* Time */}
        <ShimmerBar width={38} height={11} shimmerAnim={shimmerAnim} />
      </View>
      {/* Last message */}
      <ShimmerBar width="80%" height={11} shimmerAnim={shimmerAnim} />
    </View>
  </View>
);

// ── Single skeleton story bubble ────────────────────────────────────────────
const SkeletonStoryBubble = ({ shimmerAnim }: { shimmerAnim: Animated.Value }) => (
  <View style={styles.storyBubble}>
    <Animated.View
      style={[
        styles.storyCircle,
        {
          opacity: shimmerAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.3, 0.8, 0.3],
          }),
        },
      ]}
    />
    <ShimmerBar width={44} height={10} shimmerAnim={shimmerAnim} />
  </View>
);

// ── Main export ─────────────────────────────────────────────────────────────
interface ChatSkeletonProps {
  rowCount?: number;
  storyCount?: number;
  showStories?: boolean;
}

export default function ChatSkeleton({
  rowCount = 8,
  storyCount = 5,
  showStories = true,
}: ChatSkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
    return () => shimmerAnim.stopAnimation();
  }, [shimmerAnim]);

  return (
    <View style={styles.container}>
      {/* Stories row skeleton */}
      {showStories && (
        <View style={styles.storiesRow}>
          {Array.from({ length: storyCount }).map((_, i) => (
            <SkeletonStoryBubble key={i} shimmerAnim={shimmerAnim} />
          ))}
        </View>
      )}

      {/* Chat rows skeleton */}
      {Array.from({ length: rowCount }).map((_, i) => (
        <SkeletonChatRow key={i} shimmerAnim={shimmerAnim} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  // Stories
  storiesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  storyBubble: {
    alignItems: 'center',
    gap: 6,
    width: 65,
  },
  storyCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E0E0E0',
  },
  // Chat rows
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0E0E0',
    marginRight: 16,
  },
  rowContent: {
    flex: 1,
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shimmerBar: {
    backgroundColor: '#E0E0E0',
  },
});
