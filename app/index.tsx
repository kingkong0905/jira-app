import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SetupScreen from '../src/components/SetupScreen';
import HomeScreen from '../src/components/HomeScreen';
import SettingsScreen from '../src/components/SettingsScreen';
import { StorageService } from '../src/services/storage';
import { jiraApi } from '../src/services/jiraApi';

type Screen = 'setup' | 'home' | 'settings';

export default function Page() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [homeScreenKey, setHomeScreenKey] = useState(0);

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
    // Increment key to force HomeScreen to remount and reload with new default board
    setHomeScreenKey(prev => prev + 1);
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
      <StatusBar style="auto" />
      {currentScreen === 'setup' && (
        <SetupScreen onComplete={handleSetupComplete} />
      )}
      {currentScreen === 'home' && (
        <HomeScreen key={homeScreenKey} onOpenSettings={handleOpenSettings} />
      )}
      {currentScreen === 'settings' && (
        <SettingsScreen
          onBack={handleBackFromSettings}
          onLogout={handleLogout}
        />
      )}
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
