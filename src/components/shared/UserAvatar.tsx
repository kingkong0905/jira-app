import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { getUserInitials, getAvatarColor } from '../../utils/fieldFormatters';

interface UserAvatarProps {
    user?: {
        displayName: string;
        accountId: string;
        avatarUrls?: {
            '48x48'?: string;
            '32x32'?: string;
            '24x24'?: string;
            '16x16'?: string;
        };
    };
    size?: number;
    style?: ViewStyle | ImageStyle;
    textStyle?: TextStyle;
}

export default function UserAvatar({
    user,
    size = 32,
    style,
    textStyle
}: UserAvatarProps) {
    if (!user) {
        return (
            <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, styles.unassignedAvatar, style]}>
                <Text style={[styles.avatarText, { fontSize: size * 0.4 }, textStyle]}>?</Text>
            </View>
        );
    }

    const avatarUrl = user.avatarUrls?.['48x48'] || user.avatarUrls?.['32x32'] || user.avatarUrls?.['24x24'];
    const backgroundColor = getAvatarColor(user.accountId);
    const initials = getUserInitials(user.displayName);

    if (avatarUrl) {
        return (
            <Image
                source={{ uri: avatarUrl }}
                style={[
                    styles.avatarImage,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2
                    },
                    style as ImageStyle
                ]}
            />
        );
    }

    return (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor }, style]}>
            <Text style={[styles.avatarText, { fontSize: size * 0.4 }, textStyle]}>
                {initials}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    avatar: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        backgroundColor: '#F4F5F7',
    },
    unassignedAvatar: {
        backgroundColor: '#DFE1E6',
    },
    avatarText: {
        color: '#fff',
        fontWeight: '600',
    },
});
