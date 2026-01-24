// Environment Configuration Example
// This file shows the structure of configuration that will be stored securely

export interface AppConfig {
    // Jira Configuration
    jira: {
        email: string;        // Your Atlassian account email
        url: string;          // Your Jira instance URL (e.g., https://your-company.atlassian.net)
        apiToken: string;     // API token from https://id.atlassian.com/manage-profile/security/api-tokens
    };
}

// Example configuration (for reference only - not used in app)
export const exampleConfig: AppConfig = {
    jira: {
        email: 'your.email@example.com',
        url: 'https://your-company.atlassian.net',
        apiToken: 'your-api-token-here',
    },
};

// Note: Actual configuration is stored securely using Expo SecureStore
// and is entered by users through the Setup or Settings screen
