import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerFieldProps {
    label: string;
    value: Date | null;
    onValueChange: (date: Date | null) => void;
    isVisible: boolean;
    onToggleVisible: (visible: boolean) => void;
    placeholder?: string;
    required?: boolean;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
    label,
    value,
    onValueChange,
    isVisible,
    onToggleVisible,
    placeholder = 'Select date',
    required = false,
}) => {
    const handlePress = () => {
        if (!value) {
            onValueChange(new Date());
        }
        onToggleVisible(true);
    };

    const handleConfirm = () => {
        if (!value) {
            onValueChange(new Date());
        }
        onToggleVisible(false);
    };

    const handleCancel = () => {
        onToggleVisible(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {label} {required && '*'}
            </Text>
            <TouchableOpacity style={styles.button} onPress={handlePress}>
                <Text style={styles.buttonText}>
                    {value
                        ? value.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })
                        : placeholder}
                </Text>
            </TouchableOpacity>

            {isVisible && Platform.OS === 'ios' && (
                <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerHeaderText}>{label}</Text>
                    </View>
                    <DateTimePicker
                        value={value || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                            if (selectedDate) {
                                onValueChange(selectedDate);
                            }
                        }}
                        themeVariant="light"
                    />
                    <View style={styles.pickerActions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.confirmText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

// Android Date Picker Component
export const AndroidDatePicker: React.FC<{
    visible: boolean;
    value: Date | null;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
}> = ({ visible, value, onConfirm, onCancel }) => {
    if (!visible || Platform.OS !== 'android') return null;

    return (
        <DateTimePicker
            value={value || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
                onCancel();
                if (event.type === 'set' && selectedDate) {
                    onConfirm(selectedDate);
                }
            }}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 8,
    },
    button: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#FAFBFC',
    },
    buttonText: {
        fontSize: 15,
        color: '#172B4D',
    },
    pickerContainer: {
        marginTop: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    pickerHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E1E4E8',
        backgroundColor: '#F4F5F7',
    },
    pickerHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        textAlign: 'center',
    },
    pickerActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#E1E4E8',
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#E1E4E8',
    },
    confirmButton: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#0052CC',
    },
    cancelText: {
        fontSize: 16,
        color: '#42526E',
        fontWeight: '500',
    },
    confirmText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
});
