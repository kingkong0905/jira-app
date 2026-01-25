import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style,
}) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                style,
                {
                    width: width as any,
                    height: height as any,
                    borderRadius,
                    opacity,
                },
            ]}
        />
    );
};

interface SkeletonTextProps {
    lines?: number;
    lineHeight?: number;
    spacing?: number;
    lastLineWidth?: string | number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
    lines = 3,
    lineHeight = 16,
    spacing = 8,
    lastLineWidth = '70%',
}) => {
    return (
        <View>
            {Array.from({ length: lines }).map((_, index) => (
                <SkeletonLoader
                    key={index}
                    height={lineHeight}
                    width={index === lines - 1 ? lastLineWidth : '100%'}
                    style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
                />
            ))}
        </View>
    );
};

interface SkeletonCardProps {
    showAvatar?: boolean;
    showImage?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
    showAvatar = false,
    showImage = false,
}) => {
    return (
        <View style={styles.card}>
            {showAvatar && (
                <View style={styles.avatarRow}>
                    <SkeletonLoader width={40} height={40} borderRadius={20} />
                    <View style={styles.avatarText}>
                        <SkeletonLoader width="60%" height={16} />
                        <SkeletonLoader width="40%" height={12} style={{ marginTop: 4 }} />
                    </View>
                </View>
            )}
            {showImage && (
                <SkeletonLoader width="100%" height={200} style={{ marginBottom: 12 }} />
            )}
            <SkeletonLoader width="80%" height={20} style={{ marginBottom: 8 }} />
            <SkeletonText lines={3} lineHeight={14} spacing={6} lastLineWidth="60%" />
        </View>
    );
};

interface SkeletonIssueCardProps { }

export const SkeletonIssueCard: React.FC<SkeletonIssueCardProps> = () => {
    return (
        <View style={styles.issueCard}>
            <View style={styles.issueHeader}>
                <SkeletonLoader width={80} height={20} borderRadius={4} />
                <SkeletonLoader width={60} height={24} borderRadius={12} />
            </View>
            <SkeletonLoader width="90%" height={18} style={{ marginBottom: 8 }} />
            <SkeletonText lines={2} lineHeight={14} spacing={6} lastLineWidth="70%" />
            <View style={styles.issueFooter}>
                <SkeletonLoader width={32} height={32} borderRadius={16} />
                <SkeletonLoader width={100} height={16} />
            </View>
        </View>
    );
};

interface SkeletonListProps {
    count?: number;
    itemHeight?: number;
    spacing?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
    count = 5,
    itemHeight = 120,
    spacing = 12,
}) => {
    return (
        <View>
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonIssueCard key={index} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#E1E9F0',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        marginLeft: 12,
        flex: 1,
    },
    issueCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    issueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    issueFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
});
