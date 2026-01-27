import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StorageService } from '../../services/storage';

interface IssueHeaderProps {
    issueKey: string;
    onBack: () => void;
}

export default function IssueHeader({ issueKey, onBack }: IssueHeaderProps) {
    const handleShare = async () => {
        try {
            const config = await StorageService.getConfig();
            if (!config) {
                return;
            }

            const issueUrl = `${config.jiraUrl}/browse/${issueKey}`;
            
            if (Platform.OS === 'web') {
                // For web, copy to clipboard
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(issueUrl);
                    alert('Issue URL copied to clipboard!');
                } else {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = issueUrl;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Issue URL copied to clipboard!');
                }
            } else {
                // For mobile, use native share
                await Share.share({
                    message: issueUrl,
                    url: issueUrl,
                });
            }
        } catch (error) {
            console.error('Error sharing issue:', error);
        }
    };

    return (
        <LinearGradient colors={['#0052CC', '#0065FF']} style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{issueKey}</Text>
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                <Text style={styles.shareIcon}>📤</Text>
            </TouchableOpacity>
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
    shareButton: {
        padding: 5,
    },
    shareIcon: {
        fontSize: 24,
        color: '#fff',
    },
});
