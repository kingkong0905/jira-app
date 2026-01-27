import { Stack } from 'expo-router';
import { ToastProvider } from '../src/components/shared/ToastContext';

export default function Layout() {
    return (
        <ToastProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                }}
            />
        </ToastProvider>
    );
}
