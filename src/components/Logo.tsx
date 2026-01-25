import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LogoProps {
    size?: 'small' | 'medium' | 'large';
    showText?: boolean;
}

export default function Logo({ size = 'medium', showText = true }: LogoProps) {
    const dimensions = {
        small: { icon: 40, text: 16 },
        medium: { icon: 60, text: 24 },
        large: { icon: 80, text: 32 },
    };

    const iconSize = dimensions[size].icon;
    const textSize = dimensions[size].text;

    return (
        <View style={styles.container}>
            <View style={[styles.logoContainer, { width: iconSize, height: iconSize }]}>
                {/* Outer glow effect */}
                <View style={[styles.outerGlow, { width: iconSize * 1.2, height: iconSize * 1.2 }]} />

                {/* Main gradient circle */}
                <LinearGradient
                    colors={['#0065FF', '#0052CC', '#003D99']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradientCircle, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]}
                >
                    {/* Inner white circle with subtle gradient */}
                    <LinearGradient
                        colors={['#FFFFFF', '#F4F5F7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.innerCircle, {
                            width: iconSize * 0.72,
                            height: iconSize * 0.72,
                            borderRadius: (iconSize * 0.72) / 2
                        }]}
                    >
                        {/* Checkmark with gradient */}
                        <LinearGradient
                            colors={['#0065FF', '#0052CC']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.checkmarkGradient}
                        >
                            <Text style={[styles.checkmark, { fontSize: iconSize * 0.45 }]}>✓</Text>
                        </LinearGradient>
                    </LinearGradient>

                    {/* Decorative accent dots */}
                    <View style={[styles.accentDot, styles.accentDot1, {
                        width: iconSize * 0.08,
                        height: iconSize * 0.08,
                        top: iconSize * 0.15,
                        right: iconSize * 0.15
                    }]} />
                    <View style={[styles.accentDot, styles.accentDot2, {
                        width: iconSize * 0.06,
                        height: iconSize * 0.06,
                        bottom: iconSize * 0.2,
                        left: iconSize * 0.18
                    }]} />
                </LinearGradient>
            </View>

            {showText && (
                <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { fontSize: textSize }]}>Jira</Text>
                        <LinearGradient
                            colors={['#0065FF', '#0052CC']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.titleAccentGradient}
                        >
                            <Text style={[styles.titleAccent, { fontSize: textSize }]}>Management</Text>
                        </LinearGradient>
                    </View>
                    <Text style={[styles.subtitle, { fontSize: textSize * 0.4 }]}>
                        Manage Tasks Seamlessly
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    outerGlow: {
        position: 'absolute',
        borderRadius: 1000,
        backgroundColor: 'rgba(0, 82, 204, 0.15)',
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 0,
    },
    gradientCircle: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    innerCircle: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    checkmarkGradient: {
        borderRadius: 4,
        paddingHorizontal: 2,
    },
    checkmark: {
        color: 'transparent',
        fontWeight: '900',
        textShadowColor: '#0052CC',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    accentDot: {
        position: 'absolute',
        borderRadius: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 3,
    },
    accentDot1: {
        opacity: 0.9,
    },
    accentDot2: {
        opacity: 0.7,
    },
    textContainer: {
        marginTop: 16,
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    title: {
        fontWeight: '800',
        color: '#172B4D',
        letterSpacing: 0.8,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    titleAccentGradient: {
        borderRadius: 4,
        paddingHorizontal: 2,
    },
    titleAccent: {
        fontWeight: '800',
        color: 'transparent',
        letterSpacing: 0.8,
        textShadowColor: '#0052CC',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
    },
    subtitle: {
        color: '#FFFFFF',
        marginTop: 6,
        fontWeight: '600',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});
