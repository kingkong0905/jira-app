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

interface StatusTransition {
    id: string;
    name: string;
    to?: {
        name: string;
        statusCategory?: {
            key: string;
        };
    };
}

interface StatusPickerModalProps {
    visible: boolean;
    currentStatus: string;
    currentStatusColor: string;
    transitions: StatusTransition[];
    loading: boolean;
    transitioningId: string | null;
    onClose: () => void;
    onSelect: (transitionId: string, transitionName: string) => void;
    getStatusColor: (categoryKey: string) => string;
}

export default function StatusPickerModal({
    visible,
    currentStatus,
    currentStatusColor,
    transitions,
    loading,
    transitioningId,
    onClose,
    onSelect,
    getStatusColor,
}: StatusPickerModalProps) {
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
                        <Text style={styles.modalTitle}>Change Status</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.currentContainer}>
                        <Text style={styles.currentLabel}>Current Status:</Text>
                        <View
                            style={[styles.currentStatusBadge, { backgroundColor: currentStatusColor }]}
                        >
                            <Text style={styles.currentStatusText}>{currentStatus}</Text>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0052CC" />
                        </View>
                    ) : transitions.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.noItemsText}>No status transitions available</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.list}>
                            {transitions
                                .filter((transition) => transition.to?.name !== currentStatus)
                                .map((transition) => (
                                    <TouchableOpacity
                                        key={transition.id}
                                        style={styles.item}
                                        onPress={() => onSelect(transition.id, transition.name)}
                                        disabled={transitioningId !== null}
                                    >
                                        <View style={styles.itemContent}>
                                            <View
                                                style={[
                                                    styles.statusIndicator,
                                                    {
                                                        backgroundColor: getStatusColor(
                                                            transition.to?.statusCategory?.key || 'default'
                                                        ),
                                                    },
                                                ]}
                                            />
                                            <View style={styles.statusInfo}>
                                                <Text style={styles.statusName}>{transition.name}</Text>
                                                {transition.to && (
                                                    <Text style={styles.statusDescription}>
                                                        Move to: {transition.to.name}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        {transitioningId === transition.id && (
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
        maxHeight: '70%',
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
    currentStatusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    currentStatusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noItemsText: {
        fontSize: 14,
        color: '#7A869A',
        textAlign: 'center',
    },
    list: {
        maxHeight: 400,
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
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    statusInfo: {
        flex: 1,
    },
    statusName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 2,
    },
    statusDescription: {
        fontSize: 12,
        color: '#7A869A',
    },
});
