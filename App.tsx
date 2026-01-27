import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SetupScreen from './src/components/SetupScreen';
import HomeScreen from './src/components/HomeScreen';
import SettingsScreen from './src/components/SettingsScreen';
import { StorageService } from './src/services/storage';
import { jiraApi } from './src/services/jiraApi';
import { ToastProvider } from './src/components/shared/ToastContext';

type Screen = 'setup' | 'home' | 'settings';

export default function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>('setup');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkConfiguration();
    }, []);

    const checkConfiguration = async () => {
        try {
            const isConfigured = await StorageService.isConfigured();

            if (isConfigured) {
                const config = await StorageService.getConfig();
                if (config) {
                    jiraApi.initialize(config);
                    setCurrentScreen('home');
                }
            }
        } catch (error) {
            console.error('Error checking configuration:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetupComplete = () => {
        setCurrentScreen('home');
    };

    const handleOpenSettings = () => {
        setCurrentScreen('settings');
    };

    const handleBackFromSettings = () => {
        setCurrentScreen('home');
    };

    const handleLogout = () => {
        setCurrentScreen('setup');
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0052CC" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <ToastProvider>
                <StatusBar style="auto" />
                {currentScreen === 'setup' && (
                    <SetupScreen onComplete={handleSetupComplete} />
                )}
                {currentScreen === 'home' && (
                    <HomeScreen onOpenSettings={handleOpenSettings} />
                )}
                {currentScreen === 'settings' && (
                    <SettingsScreen
                        onBack={handleBackFromSettings}
                        onLogout={handleLogout}
                    />
                )}
            </ToastProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
});
