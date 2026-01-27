import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast, ToastType } from './Toast';

interface ToastConfig {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastConfig[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: ToastConfig = { id, message, type, duration };

        // Only show one toast at a time by replacing existing ones
        setToasts([newToast]);
    }, []);

    const success = useCallback((message: string, duration = 3000) => {
        showToast(message, 'success', duration);
    }, [showToast]);

    const error = useCallback((message: string, duration = 4000) => {
        showToast(message, 'error', duration);
    }, [showToast]);

    const warning = useCallback((message: string, duration = 3500) => {
        showToast(message, 'warning', duration);
    }, [showToast]);

    const info = useCallback((message: string, duration = 3000) => {
        showToast(message, 'info', duration);
    }, [showToast]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const value: ToastContextValue = {
        showToast,
        success,
        error,
        warning,
        info,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onDismiss={() => removeToast(toast.id)}
                />
            ))}
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
    },
});
