# Jira Management - Jira Management App 🎯

A beautiful React Native application for managing Jira boards and viewing tickets with a modern, professional UI.

## ✨ Features

- **🎨 Fancy Modern UI**: Professional design with gradients, shadows, and smooth animations
- **🎯 Custom Logo**: Branded "Jira Management" logo with checkmark design
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

### Running on a physical iOS device

If you see **"No script URL provided"** or **"Make sure the packager is running"** on a real device, the app cannot reach Metro to load the JS bundle.

**Do this every time you run on device:**

1. **Start Metro first** (in a terminal at the project root):
   ```bash
   npm start
   ```
   Leave this running.

2. **Use the same Wi‑Fi** for your Mac and your iPhone.

3. **Run the app on the device** (choose one):
   - **Recommended:**  
     ```bash
     npx expo run:ios --device
     ```
     This builds, installs, and uses the running Metro.
   - **Or** build and run from Xcode (`npm run open-ios`), then tap Run with your device selected. Metro must already be running.

4. **If it still fails:** set your Mac’s IP in the app so it can find Metro:
   - Find your Mac’s IP: **System Settings → Wi‑Fi → Details** (or run `ipconfig getifaddr en0` in Terminal).
   - In Xcode, open **JiraManagement/Info.plist**, find **ReactNativePackagerHost**, and set its value to that IP (e.g. `192.168.1.100`).
   - Rebuild and run on the device again. Also allow Metro through your Mac firewall if needed (System Settings → Network → Firewall).

### Opening the iOS project in Xcode

If you see **"No such module 'Expo'"** in Xcode, you are opening the wrong file.

- **Do this:** Open the **workspace**: `ios/JiraManagement.xcworkspace`
- **Not this:** Do not open `JiraManagement.xcodeproj` directly

From the terminal:

```bash
npm run open-ios
```

Or in Finder: open `ios/JiraManagement.xcworkspace` (double-click it).

If the workspace doesn’t exist yet, install CocoaPods first:

```bash
cd ios && pod install && cd ..
```

Then open `ios/JiraManagement.xcworkspace` again.

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
