import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';

interface Priority {
    id: string;
    name: string;
}

interface PriorityPickerModalProps {
    visible: boolean;
    currentPriority: string | null;
    priorities: Priority[];
    loading: boolean;
    updatingId: string | null;
    onClose: () => void;
    onSelect: (priorityId: string, priorityName: string) => void;
    getPriorityEmoji: (priorityName: string) => string;
}

export default function PriorityPickerModal({
    visible,
    currentPriority,
    priorities,
    loading,
    updatingId,
    onClose,
    onSelect,
    getPriorityEmoji,
}: PriorityPickerModalProps) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Change Priority</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.currentContainer}>
                        <Text style={styles.currentLabel}>Current Priority:</Text>
                        <View style={styles.priorityRow}>
                            <Text style={styles.priorityEmoji}>
                                {getPriorityEmoji(currentPriority || 'None')}
                            </Text>
                            <Text style={styles.currentValue}>{currentPriority || 'None'}</Text>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0052CC" />
                        </View>
                    ) : (
                        <ScrollView style={styles.list}>
                            {priorities
                                .filter((priority) => priority.name !== currentPriority)
                                .map((priority) => (
                                    <TouchableOpacity
                                        key={priority.id}
                                        style={styles.item}
                                        onPress={() => onSelect(priority.id, priority.name)}
                                        disabled={updatingId !== null}
                                    >
                                        <View style={styles.itemContent}>
                                            <Text style={styles.priorityEmoji}>
                                                {getPriorityEmoji(priority.name)}
                                            </Text>
                                            <Text style={styles.priorityName}>{priority.name}</Text>
                                        </View>
                                        {updatingId === priority.id && (
                                            <ActivityIndicator size="small" color="#0052CC" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '60%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#DFE1E6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
    },
    modalCloseButton: {
        padding: 8,
        backgroundColor: '#F4F5F7',
        borderRadius: 6,
    },
    modalCloseText: {
        fontSize: 18,
        color: '#42526E',
        fontWeight: 'bold',
    },
    currentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F4F5F7',
    },
    currentLabel: {
        fontSize: 14,
        color: '#5E6C84',
        marginRight: 12,
    },
    priorityRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priorityEmoji: {
        fontSize: 20,
        marginRight: 8,
    },
    currentValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        maxHeight: 300,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    priorityName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
    },
});
