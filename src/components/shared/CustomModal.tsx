import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ModalProps } from 'react-native';

interface CustomModalProps extends Omit<ModalProps, 'children'> {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    size?: 'small' | 'medium' | 'large';
}

export default function CustomModal({
    visible,
    title,
    onClose,
    children,
    size = 'medium',
    ...modalProps
}: CustomModalProps) {
    const contentStyle = [
        styles.modalContent,
        size === 'small' && styles.modalContentSmall,
        size === 'large' && styles.modalContentLarge,
    ];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
            {...modalProps}
        >
            <View style={styles.modalOverlay}>
                <View style={contentStyle}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.modalCloseButton}
                        >
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    {children}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '85%',
        maxHeight: '80%',
    },
    modalContentSmall: {
        width: '75%',
        maxHeight: '60%',
    },
    modalContentLarge: {
        width: '95%',
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E8EBED',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        flex: 1,
        marginRight: 10,
    },
    modalCloseButton: {
        padding: 5,
    },
    modalCloseText: {
        fontSize: 24,
        color: '#5E6C84',
        fontWeight: '400',
    },
});
