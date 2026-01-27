import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    duration?: number;
    onDismiss: () => void;
}

const TOAST_COLORS = {
    success: {
        gradient: ['#10B981', '#059669', '#047857'] as const,
        icon: '✓',
        iconBg: '#ECFDF5',
        iconColor: '#059669',
        shadowColor: '#10B981',
    },
    error: {
        gradient: ['#EF4444', '#DC2626', '#B91C1C'] as const,
        icon: '✕',
        iconBg: '#FEF2F2',
        iconColor: '#DC2626',
        shadowColor: '#EF4444',
    },
    warning: {
        gradient: ['#F59E0B', '#D97706', '#B45309'] as const,
        icon: '⚠',
        iconBg: '#FFFBEB',
        iconColor: '#D97706',
        shadowColor: '#F59E0B',
    },
    info: {
        gradient: ['#3B82F6', '#2563EB', '#1D4ED8'] as const,
        icon: 'ℹ',
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
        shadowColor: '#3B82F6',
    },
};

const { width } = Dimensions.get('window');

export const Toast: React.FC<ToastProps> = ({
    message,
    type,
    duration = 3000,
    onDismiss,
}) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Slide in animation
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss after duration
        const timer = setTimeout(() => {
            dismissToast();
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    const dismissToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss();
        });
    };

    const colors = TOAST_COLORS[type];

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={dismissToast}
                style={styles.touchable}
            >
                <LinearGradient
                    colors={colors.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.toast,
                        {
                            shadowColor: colors.shadowColor,
                        },
                    ]}
                >
                    <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
                        <Text style={[styles.icon, { color: colors.iconColor }]}>{colors.icon}</Text>
                    </View>
                    <Text style={styles.message} numberOfLines={3}>
                        {message}
                    </Text>
                    <TouchableOpacity onPress={dismissToast} style={styles.closeButton}>
                        <Text style={styles.closeIcon}>×</Text>
                    </TouchableOpacity>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 10,
    },
    touchable: {
        borderRadius: 16,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 16,
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
        minHeight: 64,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    icon: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    message: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        lineHeight: 21,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    closeButton: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 14,
    },
    closeIcon: {
        fontSize: 22,
        fontWeight: '400',
        color: '#FFFFFF',
        lineHeight: 22,
    },
});
