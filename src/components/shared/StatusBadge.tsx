import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';

interface StatusBadgeProps {
    status: string;
    color?: string;
    onPress?: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

/**
 * Get color for different status categories
 */
export function getStatusColor(statusKey: string): string {
    switch (statusKey.toLowerCase()) {
        case 'new':
        case 'indeterminate':
            return '#8777D9';
        case 'done':
        case 'complete':
            return '#00875A';
        default:
            return '#0052CC';
    }
}

export default function StatusBadge({
    status,
    color,
    onPress,
    style,
    textStyle,
}: StatusBadgeProps) {
    const badgeStyle = [
        styles.badge,
        { backgroundColor: color || '#0052CC' },
        style,
    ];

    const badgeTextStyle = [styles.badgeText, textStyle];

    if (onPress) {
        return (
            <TouchableOpacity style={badgeStyle} onPress={onPress} activeOpacity={0.7}>
                <Text style={badgeTextStyle}>{status}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={badgeStyle}>
            <Text style={badgeTextStyle}>{status}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
});
