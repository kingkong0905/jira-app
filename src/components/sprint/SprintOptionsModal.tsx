import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    TouchableWithoutFeedback,
} from 'react-native';

interface SprintOptionsModalProps {
    visible: boolean;
    sprintName: string;
    onClose: () => void;
    onUpdate: () => void;
    onDelete: () => void;
    deleting: boolean;
}

export const SprintOptionsModal: React.FC<SprintOptionsModalProps> = ({
    visible,
    sprintName,
    onClose,
    onUpdate,
    onDelete,
    deleting,
}) => {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View style={styles.content}>
                            <Text style={styles.title}>{sprintName}</Text>

                            <TouchableOpacity style={styles.optionButton} onPress={onUpdate}>
                                <Text style={styles.optionIcon}>✏️</Text>
                                <Text style={styles.optionText}>Update Sprint</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.optionButton, styles.deleteButton]}
                                onPress={onDelete}
                                disabled={deleting}
                            >
                                <Text style={styles.optionIcon}>🗑️</Text>
                                <Text style={[styles.optionText, styles.deleteText]}>
                                    {deleting ? 'Deleting...' : 'Delete Sprint'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.optionButton, styles.cancelButton]}
                                onPress={onClose}
                            >
                                <Text style={styles.optionText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 320,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#172B4D',
        marginBottom: 16,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#F4F5F7',
    },
    deleteButton: {
        backgroundColor: '#FFEBE6',
    },
    cancelButton: {
        marginTop: 8,
        backgroundColor: '#F4F5F7',
    },
    optionIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    optionText: {
        fontSize: 16,
        color: '#172B4D',
        fontWeight: '500',
    },
    deleteText: {
        color: '#DE350B',
    },
});
