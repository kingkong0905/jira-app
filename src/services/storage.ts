import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { JiraConfig } from '../types/jira';

const KEYS = {
    EMAIL: 'jira_email',
    JIRA_URL: 'jira_url',
    API_TOKEN: 'jira_api_token',
    IS_CONFIGURED: 'jira_is_configured',
    DEFAULT_BOARD_ID: 'jira_default_board_id',
};

// Web-compatible storage wrapper
const storage = {
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    },
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        } else {
            return await SecureStore.getItemAsync(key);
        }
    },
    async deleteItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    },
};

export const StorageService = {
    async saveConfig(config: JiraConfig): Promise<void> {
        try {
            await storage.setItem(KEYS.EMAIL, config.email);
            await storage.setItem(KEYS.JIRA_URL, config.jiraUrl);
            await storage.setItem(KEYS.API_TOKEN, config.apiToken);
            await storage.setItem(KEYS.IS_CONFIGURED, 'true');
        } catch (error) {
            console.error('Error saving config:', error);
            throw error;
        }
    },

    async getConfig(): Promise<JiraConfig | null> {
        try {
            const email = await storage.getItem(KEYS.EMAIL);
            const jiraUrl = await storage.getItem(KEYS.JIRA_URL);
            const apiToken = await storage.getItem(KEYS.API_TOKEN);

            if (email && jiraUrl && apiToken) {
                return { email, jiraUrl, apiToken };
            }
            return null;
        } catch (error) {
            console.error('Error getting config:', error);
            return null;
        }
    },

    async isConfigured(): Promise<boolean> {
        try {
            const isConfigured = await storage.getItem(KEYS.IS_CONFIGURED);
            return isConfigured === 'true';
        } catch (error) {
            console.error('Error checking configuration:', error);
            return false;
        }
    },

    async clearConfig(): Promise<void> {
        try {
            await storage.deleteItem(KEYS.EMAIL);
            await storage.deleteItem(KEYS.JIRA_URL);
            await storage.deleteItem(KEYS.API_TOKEN);
            await storage.deleteItem(KEYS.IS_CONFIGURED);
            await storage.deleteItem(KEYS.DEFAULT_BOARD_ID);
        } catch (error) {
            console.error('Error clearing config:', error);
            throw error;
        }
    },

    async setDefaultBoardId(boardId: number): Promise<void> {
        try {
            await storage.setItem(KEYS.DEFAULT_BOARD_ID, boardId.toString());
        } catch (error) {
            console.error('Error saving default board:', error);
            throw error;
        }
    },

    async getDefaultBoardId(): Promise<number | null> {
        try {
            const boardId = await storage.getItem(KEYS.DEFAULT_BOARD_ID);
            return boardId ? parseInt(boardId, 10) : null;
        } catch (error) {
            console.error('Error getting default board:', error);
            return null;
        }
    },

    async clearDefaultBoard(): Promise<void> {
        try {
            await storage.deleteItem(KEYS.DEFAULT_BOARD_ID);
        } catch (error) {
            console.error('Error clearing default board:', error);
            throw error;
        }
    },
};
