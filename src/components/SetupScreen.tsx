import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    Keyboard,
    KeyboardEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { StorageService } from '../services/storage';
import { jiraApi } from '../services/jiraApi';
import Logo from './Logo';

interface SetupScreenProps {
    onComplete: () => void;
}

export default function SetupScreen({ onComplete }: SetupScreenProps) {
    const [step, setStep] = useState(1); // 1 = API Token, 2 = Jira Info
    const [email, setEmail] = useState('');
    const [jiraUrl, setJiraUrl] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleStep1Next = () => {
        if (!apiToken.trim()) {
            Alert.alert('Error', 'Please enter your API token');
            return;
        }
        setStep(2);
    };

    const handleStep2Submit = async () => {
        // Validate email
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return;
        }

        // Validate Jira URL
        if (!jiraUrl.trim()) {
            Alert.alert('Error', 'Please enter your Jira URL');
            return;
        }

        try {
            new URL(jiraUrl);
        } catch {
            Alert.alert('Error', 'Please enter a valid URL (e.g., https://your-domain.atlassian.net)');
            return;
        }

        setLoading(true);
        try {
            const config = {
                email: email.trim(),
                jiraUrl: jiraUrl.trim().replace(/\/$/, ''),
                apiToken: apiToken.trim(),
            };

            // Initialize API
            jiraApi.initialize(config);

            // Test connection
            if (Platform.OS !== 'web') {
                const isConnected = await jiraApi.testConnection();
                if (!isConnected) {
                    Alert.alert(
                        'Connection Failed',
                        'Unable to connect to Jira. Please check your credentials and try again.'
                    );
                    setLoading(false);
                    return;
                }
            }

            // Save configuration
            await StorageService.saveConfig(config);

            const successMessage = Platform.OS === 'web'
                ? 'Configuration saved! Note: Due to browser CORS restrictions, some features may be limited on web.'
                : 'Configuration saved successfully!';

            Alert.alert('Success', successMessage, [
                {
                    text: 'OK',
                    onPress: onComplete,
                },
            ]);
        } catch (error) {
            console.error('Setup error:', error);
            const errorMessage = Platform.OS === 'web'
                ? 'Failed to save configuration. Web browsers have CORS limitations. Please use the mobile app for best experience.'
                : 'Failed to save configuration. Please try again.';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#0052CC', '#4C9AFF', '#B3D4FF']}
                style={styles.gradientBackground}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.logoSection}>
                        <Logo size="large" showText={true} />
                    </View>

                    <View style={styles.formCard}>
                        {step === 1 ? (
                            <>
                                <Text style={styles.formTitle}>Step 1 of 2</Text>
                                <Text style={styles.formSubtitle}>
                                    Enter your API Token
                                </Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>🔑 API Token</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Your Jira API token"
                                            placeholderTextColor="#A5ADBA"
                                            value={apiToken}
                                            onChangeText={setApiToken}
                                            secureTextEntry
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            autoFocus
                                        />
                                    </View>
                                </View>

                                <View style={styles.helpBox}>
                                    <Text style={styles.helpIcon}>💡</Text>
                                    <Text style={styles.helpText}>
                                        Generate an API token at:{'\n'}
                                        id.atlassian.com/manage-profile/security/api-tokens
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleStep1Next}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#0052CC', '#003D99']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.buttonGradient}
                                    >
                                        <Text style={styles.buttonText}>Next →</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => setStep(1)}
                                >
                                    <Text style={styles.backButtonText}>← Back</Text>
                                </TouchableOpacity>

                                <Text style={styles.formTitle}>Step 2 of 2</Text>
                                <Text style={styles.formSubtitle}>
                                    Connect to your Jira workspace
                                </Text>

                                {Platform.OS === 'web' && (
                                    <View style={styles.webNotice}>
                                        <Text style={styles.webNoticeIcon}>⚠️</Text>
                                        <View style={styles.webNoticeContent}>
                                            <Text style={styles.webNoticeTitle}>Web Limitation</Text>
                                            <Text style={styles.webNoticeText}>
                                                CORS restrictions apply. Use mobile app for full functionality.
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>📧 Email</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="your.email@example.com"
                                            placeholderTextColor="#A5ADBA"
                                            value={email}
                                            onChangeText={setEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>🔗 Jira URL</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="https://your-domain.atlassian.net"
                                            placeholderTextColor="#A5ADBA"
                                            value={jiraUrl}
                                            onChangeText={setJiraUrl}
                                            keyboardType="url"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.button, loading && styles.buttonDisabled]}
                                    onPress={handleStep2Submit}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={loading ? ['#999', '#666'] : ['#0052CC', '#003D99']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.buttonGradient}
                                    >
                                        {loading ? (
                                            <View style={styles.buttonContent}>
                                                <ActivityIndicator color="#fff" size="small" />
                                                <Text style={styles.buttonTextLoading}>Connecting...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.buttonText}>🚀 Let's Go!</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradientBackground: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 100,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    formTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#172B4D',
        marginBottom: 8,
        textAlign: 'center',
    },
    formSubtitle: {
        fontSize: 16,
        color: '#172B4D',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 8,
    },
    inputWrapper: {
        backgroundColor: '#F4F5F7',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#DFE1E6',
    },
    input: {
        padding: 16,
        fontSize: 16,
        color: '#172B4D',
    },
    helpBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DEEBFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
    },
    helpIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    helpText: {
        flex: 1,
        fontSize: 13,
        color: '#0052CC',
        lineHeight: 18,
    },
    button: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    backButtonText: {
        color: '#0052CC',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    buttonTextLoading: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    webNotice: {
        flexDirection: 'row',
        backgroundColor: '#FFF4E6',
        borderLeftWidth: 4,
        borderLeftColor: '#FFAB00',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    webNoticeIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    webNoticeContent: {
        flex: 1,
    },
    webNoticeTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#974F0C',
        marginBottom: 4,
    },
    webNoticeText: {
        fontSize: 13,
        color: '#974F0C',
        lineHeight: 18,
    },
});
