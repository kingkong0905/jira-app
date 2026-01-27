import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface IssueHeaderProps {
    issueKey: string;
    onBack: () => void;
}

export default function IssueHeader({ issueKey, onBack }: IssueHeaderProps) {
    return (
        <LinearGradient colors={['#0052CC', '#0065FF']} style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{issueKey}</Text>
            <View style={styles.placeholder} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 5,
    },
    backIcon: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeholder: {
        width: 38,
    },
});
