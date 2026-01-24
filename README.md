# JiraFlow - Jira Management App 🎯

A beautiful React Native application for managing Jira boards and viewing tickets with a modern, professional UI.

## ✨ Features

- **🎨 Fancy Modern UI**: Professional design with gradients, shadows, and smooth animations
- **🎯 Custom Logo**: Branded "JiraFlow" logo with checkmark design
- **🔐 Secure Setup**: Input email, Jira URL, and API token with validation
- **📊 Board Management**: Browse and view tickets from your Jira boards
- **🎴 Beautiful Cards**: Modern issue cards with status colors, priority indicators, and avatars
- **⚙️ Settings Panel**: Update credentials and preferences anytime
- **📱 Cross-Platform**: Works on iOS, Android, and Web (with limitations)

## ⚠️ Important Note

**Web Version Limitation**: Due to browser CORS restrictions, the web version cannot directly call Jira APIs. For full functionality, please use the **iOS or Android app**. See [CORS-INFO.md](CORS-INFO.md) for details and workarounds.

## Prerequisites

- Node.js 18+ installed
- Expo CLI installed globally: `npm install -g expo-cli`
- iOS Simulator (for Mac) or Android Emulator

## Installation

```bash
npm install
```

## Running the App

```bash
# Start the development server
npm start

# Run on iOS (Recommended - no CORS issues)
npm run ios

# Run on Android (Recommended - no CORS issues)
npm run android

# Run on Web (Limited functionality due to CORS)
npm run web
```

## Configuration

On first launch, you'll need to provide:
- **Email**: Your Jira account email
- **Jira URL**: Your Jira instance URL (e.g., https://your-domain.atlassian.net)
- **API Token**: Generate from https://id.atlassian.com/manage-profile/security/api-tokens

## Project Structure

```
jira-app/
├── app/              # Application screens
├── src/
│   ├── components/   # Reusable components
│   ├── services/     # API and storage services
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Utility functions
└── assets/           # Images and static assets
```
