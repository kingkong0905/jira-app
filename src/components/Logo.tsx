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
                {/* Outer circle with gradient */}
                <View style={[styles.circle, { width: iconSize, height: iconSize }]}>
                    <View style={[styles.innerCircle, { width: iconSize * 0.7, height: iconSize * 0.7 }]}>
                        {/* Checkmark symbol */}
                        <View style={styles.checkmarkContainer}>
                            <Text style={[styles.checkmark, { fontSize: iconSize * 0.5 }]}>✓</Text>
                        </View>
                    </View>
                </View>
            </View>

            {showText && (
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { fontSize: textSize }]}>
                        Jira<Text style={styles.titleAccent}>Flow</Text>
                    </Text>
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
    circle: {
        borderRadius: 1000,
        backgroundColor: '#0052CC',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    innerCircle: {
        borderRadius: 1000,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        color: '#0052CC',
        fontWeight: 'bold',
    },
    textContainer: {
        marginTop: 16,
        alignItems: 'center',
    },
    title: {
        fontWeight: 'bold',
        color: '#172B4D',
        letterSpacing: 0.5,
    },
    titleAccent: {
        color: '#0052CC',
    },
    subtitle: {
        color: '#FFFFFF',
        marginTop: 4,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
