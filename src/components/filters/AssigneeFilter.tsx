import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from 'react-native';

interface AssigneeFilterProps {
    assignees: Array<{ key: string; name: string }>;
    selectedAssignee: string;
    onSelectAssignee: (key: string) => void;
}

export const AssigneeFilter: React.FC<AssigneeFilterProps> = ({
    assignees,
    selectedAssignee,
    onSelectAssignee,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>👤 Filter by Assignee:</Text>
            <FlatList
                horizontal
                data={assignees}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.chip,
                            selectedAssignee === item.key && styles.chipSelected,
                        ]}
                        onPress={() => onSelectAssignee(item.key)}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                selectedAssignee === item.key && styles.chipTextSelected,
                            ]}
                        >
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 10,
        paddingHorizontal: 16,
    },
    list: {
        paddingHorizontal: 12,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F4F5F7',
        borderRadius: 20,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    chipSelected: {
        backgroundColor: '#0052CC',
        borderColor: '#0052CC',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#42526E',
    },
    chipTextSelected: {
        color: '#FFFFFF',
    },
});
