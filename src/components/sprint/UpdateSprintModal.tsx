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
} from 'react-native';
import { DatePickerField, AndroidDatePicker } from './DatePickerField';

interface UpdateSprintModalProps {
    visible: boolean;
    initialName: string;
    initialGoal?: string;
    initialStartDate?: Date | null;
    initialEndDate?: Date | null;
    onClose: () => void;
    onUpdate: (data: {
        name: string;
        goal: string;
        startDate: Date | null;
        endDate: Date | null;
    }) => void;
    updating: boolean;
}

export const UpdateSprintModal: React.FC<UpdateSprintModalProps> = ({
    visible,
    initialName,
    initialGoal = '',
    initialStartDate = null,
    initialEndDate = null,
    onClose,
    onUpdate,
    updating,
}) => {
    const [name, setName] = React.useState(initialName);
    const [goal, setGoal] = React.useState(initialGoal);
    const [startDate, setStartDate] = React.useState<Date | null>(initialStartDate);
    const [endDate, setEndDate] = React.useState<Date | null>(initialEndDate);
    const [showStartPicker, setShowStartPicker] = React.useState(false);
    const [showEndPicker, setShowEndPicker] = React.useState(false);

    // Update state when props change
    React.useEffect(() => {
        if (visible) {
            setName(initialName);
            setGoal(initialGoal);
            setStartDate(initialStartDate);
            setEndDate(initialEndDate);
        }
    }, [visible, initialName, initialGoal, initialStartDate, initialEndDate]);

    const handleClose = () => {
        setName('');
        setGoal('');
        setStartDate(null);
        setEndDate(null);
        onClose();
    };

    const handleUpdate = () => {
        onUpdate({ name, goal, startDate, endDate });
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
                                    <Text style={styles.title}>Update Sprint</Text>
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
                                            placeholderTextColor="#8993A4"
                                        />
                                    </View>

                                    <View style={styles.field}>
                                        <Text style={styles.label}>Sprint Goal (Optional)</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={goal}
                                            onChangeText={setGoal}
                                            placeholder="Enter sprint goal"
                                            placeholderTextColor="#8993A4"
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>

                                    <DatePickerField
                                        label="Start Date (Optional)"
                                        value={startDate}
                                        onValueChange={setStartDate}
                                        isVisible={showStartPicker}
                                        onToggleVisible={setShowStartPicker}
                                        placeholder="Select start date"
                                    />

                                    <DatePickerField
                                        label="End Date (Optional)"
                                        value={endDate}
                                        onValueChange={setEndDate}
                                        isVisible={showEndPicker}
                                        onToggleVisible={setShowEndPicker}
                                        placeholder="Select end date"
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
                                            styles.updateButton,
                                            (!name || updating) && styles.updateButtonDisabled,
                                        ]}
                                        onPress={handleUpdate}
                                        disabled={!name || updating}
                                    >
                                        {updating ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.updateButtonText}>Update</Text>
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
    updateButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#0052CC',
        alignItems: 'center',
    },
    updateButtonDisabled: {
        opacity: 0.6,
    },
    updateButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
