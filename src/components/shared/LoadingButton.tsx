import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface LoadingButtonProps {
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    title: string;
    variant?: 'primary' | 'secondary' | 'danger';
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export default function LoadingButton({
    onPress,
    loading = false,
    disabled = false,
    title,
    variant = 'primary',
    style,
    textStyle,
}: LoadingButtonProps) {
    const buttonStyle = [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        style,
    ];

    const buttonTextStyle = [
        styles.buttonText,
        variant === 'primary' && styles.buttonTextPrimary,
        variant === 'secondary' && styles.buttonTextSecondary,
        variant === 'danger' && styles.buttonTextDanger,
        textStyle,
    ];

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color="#fff" size="small" />
            ) : (
                <Text style={buttonTextStyle}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    buttonPrimary: {
        backgroundColor: '#0052CC',
    },
    buttonSecondary: {
        backgroundColor: '#F4F5F7',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    buttonDanger: {
        backgroundColor: '#DE350B',
    },
    buttonDisabled: {
        backgroundColor: '#A5ADBA',
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    buttonTextPrimary: {
        color: '#fff',
    },
    buttonTextSecondary: {
        color: '#172B4D',
    },
    buttonTextDanger: {
        color: '#fff',
    },
});
