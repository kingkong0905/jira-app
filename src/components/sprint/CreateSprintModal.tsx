import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Platform,
} from 'react-native';
import { DatePickerField, AndroidDatePicker } from './DatePickerField';

interface CreateSprintModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (data: {
        name: string;
        goal: string;
        startDate: Date | null;
        endDate: Date | null;
    }) => void;
    creating: boolean;
}

export const CreateSprintModal: React.FC<CreateSprintModalProps> = ({
    visible,
    onClose,
    onCreate,
    creating,
}) => {
    const [name, setName] = React.useState('');
    const [goal, setGoal] = React.useState('');
    const [startDate, setStartDate] = React.useState<Date | null>(null);
    const [endDate, setEndDate] = React.useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = React.useState(false);
    const [showEndPicker, setShowEndPicker] = React.useState(false);

    const handleClose = () => {
        setName('');
        setGoal('');
        setStartDate(null);
        setEndDate(null);
        onClose();
    };

    const handleCreate = () => {
        onCreate({ name, goal, startDate, endDate });
        setName('');
        setGoal('');
        setStartDate(null);
        setEndDate(null);
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={handleClose}
            >
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.content}>
                                <View style={styles.header}>
                                    <Text style={styles.title}>Create New Sprint</Text>
                                    <TouchableOpacity onPress={handleClose}>
                                        <Text style={styles.closeButton}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <ScrollView
                                    style={styles.body}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    scrollEnabled={true}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    <View style={styles.field}>
                                        <Text style={styles.label}>Sprint Name *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="Enter sprint name"
                                            placeholderTextColor="#999"
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Goal (Overview)</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={goal}
                                            onChangeText={setGoal}
                                            placeholder="Enter sprint goal"
                                            placeholderTextColor="#999"
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>

                                    <DatePickerField
                                        label="Start Date"
                                        value={startDate}
                                        onValueChange={setStartDate}
                                        isVisible={showStartPicker}
                                        onToggleVisible={setShowStartPicker}
                                        placeholder="Select start date"
                                        required
                                    />

                                    <DatePickerField
                                        label="End Date"
                                        value={endDate}
                                        onValueChange={setEndDate}
                                        isVisible={showEndPicker}
                                        onToggleVisible={setShowEndPicker}
                                        placeholder="Select end date"
                                        required
                                    />
                                </ScrollView>

                                <View style={styles.footer}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={handleClose}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.createButton,
                                            creating && styles.createButtonDisabled,
                                        ]}
                                        onPress={handleCreate}
                                        disabled={creating}
                                    >
                                        {creating ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.createButtonText}>Create Sprint</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <AndroidDatePicker
                visible={showStartPicker}
                value={startDate}
                onConfirm={(date) => {
                    setStartDate(date);
                    setShowStartPicker(false);
                }}
                onCancel={() => setShowStartPicker(false)}
            />

            <AndroidDatePicker
                visible={showEndPicker}
                value={endDate}
                onConfirm={(date) => {
                    setEndDate(date);
                    setShowEndPicker(false);
                }}
                onCancel={() => setShowEndPicker(false)}
            />
        </>
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
        maxWidth: 500,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E1E4E8',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#172B4D',
    },
    closeButton: {
        fontSize: 24,
        color: '#666',
        fontWeight: '300',
    },
    body: {
        padding: 20,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#172B4D',
        backgroundColor: '#FAFBFC',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E1E4E8',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#F4F5F7',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#42526E',
    },
    createButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#0052CC',
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
