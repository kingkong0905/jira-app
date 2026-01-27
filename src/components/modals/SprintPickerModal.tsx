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

interface Sprint {
    id: number;
    name: string;
    state: 'active' | 'future' | 'closed';
}

interface SprintPickerModalProps {
    visible: boolean;
    currentSprint: string | null;
    sprints: Sprint[];
    loading: boolean;
    updating: boolean;
    onClose: () => void;
    onSelect: (sprintId: number | null, sprintName: string) => void;
}

export default function SprintPickerModal({
    visible,
    currentSprint,
    sprints,
    loading,
    updating,
    onClose,
    onSelect,
}: SprintPickerModalProps) {
    const activeSprints = sprints.filter((sprint) => sprint.state === 'active');
    const futureSprints = sprints.filter((sprint) => sprint.state === 'future');

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
                        <Text style={styles.modalTitle}>Change Sprint</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.currentContainer}>
                        <Text style={styles.currentLabel}>Current Sprint:</Text>
                        <Text style={styles.currentValue}>{currentSprint || 'None'}</Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0052CC" />
                        </View>
                    ) : (
                        <ScrollView style={styles.list}>
                            {/* Move to Backlog option */}
                            {currentSprint && (
                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => onSelect(null, 'Backlog')}
                                    disabled={updating}
                                >
                                    <View style={styles.itemContent}>
                                        <Text style={styles.sprintName}>📋 Move to Backlog</Text>
                                        <Text style={styles.sprintState}>Remove from sprint</Text>
                                    </View>
                                    {updating && <ActivityIndicator size="small" color="#0052CC" />}
                                </TouchableOpacity>
                            )}

                            {/* Active sprints */}
                            {activeSprints.length > 0 && (
                                <>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>Active Sprints</Text>
                                    </View>
                                    {activeSprints.map((sprint) => (
                                        <TouchableOpacity
                                            key={sprint.id}
                                            style={styles.item}
                                            onPress={() => onSelect(sprint.id, sprint.name)}
                                            disabled={updating}
                                        >
                                            <View style={styles.itemContent}>
                                                <Text style={styles.sprintName}>🏃 {sprint.name}</Text>
                                                <Text style={[styles.sprintState, styles.activeState]}>
                                                    Active
                                                </Text>
                                            </View>
                                            {updating && <ActivityIndicator size="small" color="#0052CC" />}
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}

                            {/* Future sprints */}
                            {futureSprints.length > 0 && (
                                <>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>Future Sprints</Text>
                                    </View>
                                    {futureSprints.map((sprint) => (
                                        <TouchableOpacity
                                            key={sprint.id}
                                            style={styles.item}
                                            onPress={() => onSelect(sprint.id, sprint.name)}
                                            disabled={updating}
                                        >
                                            <View style={styles.itemContent}>
                                                <Text style={styles.sprintName}>📅 {sprint.name}</Text>
                                                <Text style={[styles.sprintState, styles.futureState]}>
                                                    Future
                                                </Text>
                                            </View>
                                            {updating && <ActivityIndicator size="small" color="#0052CC" />}
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}

                            {activeSprints.length === 0 && futureSprints.length === 0 && (
                                <View style={styles.loadingContainer}>
                                    <Text style={styles.noItemsText}>No sprints available</Text>
                                </View>
                            )}
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
    noItemsText: {
        fontSize: 14,
        color: '#7A869A',
        textAlign: 'center',
    },
    list: {
        maxHeight: 400,
    },
    sectionHeader: {
        padding: 12,
        paddingLeft: 16,
        backgroundColor: '#F4F5F7',
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5E6C84',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
        flex: 1,
    },
    sprintName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 4,
    },
    sprintState: {
        fontSize: 12,
        color: '#7A869A',
    },
    activeState: {
        color: '#00875A',
    },
    futureState: {
        color: '#0052CC',
    },
});
