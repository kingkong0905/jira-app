import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { JiraIssue } from '../../types/jira';

interface IssueSubtasksCardProps {
    subtasks: JiraIssue[];
    loading?: boolean;
    onSubtaskPress?: (issueKey: string) => void;
}

export default function IssueSubtasksCard({
    subtasks,
    loading = false,
    onSubtaskPress,
}: IssueSubtasksCardProps) {
    const getStatusColor = (statusCategory?: string): string => {
        const colors: { [key: string]: string } = {
            done: '#00875A',
            indeterminate: '#0052CC',
            new: '#6554C0',
            todo: '#6554C0',
            default: '#999',
        };
        return colors[statusCategory?.toLowerCase() || 'default'] || colors.default;
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Subtasks</Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0052CC" />
                    <Text style={styles.loadingText}>Loading subtasks...</Text>
                </View>
            </View>
        );
    }

    if (!subtasks || subtasks.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Subtasks ({subtasks.length})</Text>
            <View style={styles.subtasksList}>
                {subtasks.map((subtask) => (
                    <TouchableOpacity
                        key={subtask.id}
                        style={styles.subtaskItem}
                        onPress={() => onSubtaskPress?.(subtask.key)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.subtaskContent}>
                            {/* Ticket ID */}
                            <View style={styles.subtaskHeader}>
                                <Text style={styles.subtaskKey}>{subtask.key}</Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: getStatusColor(
                                                subtask.fields.status.statusCategory.key
                                            ),
                                        },
                                    ]}
                                >
                                    <Text style={styles.statusText}>
                                        {subtask.fields.status.name}
                                    </Text>
                                </View>
                            </View>

                            {/* Name/Summary */}
                            <Text style={styles.subtaskSummary} numberOfLines={2}>
                                {subtask.fields.summary}
                            </Text>

                            {/* Assignee */}
                            <View style={styles.subtaskFooter}>
                                {subtask.fields.assignee ? (
                                    <View style={styles.assigneeContainer}>
                                        {subtask.fields.assignee.avatarUrls?.['48x48'] ? (
                                            <Image
                                                source={{
                                                    uri: subtask.fields.assignee.avatarUrls['48x48'],
                                                }}
                                                style={styles.assigneeAvatar}
                                            />
                                        ) : (
                                            <View style={styles.assigneeAvatarPlaceholder}>
                                                <Text style={styles.assigneeAvatarText}>
                                                    {subtask.fields.assignee.displayName
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.assigneeName}>
                                            {subtask.fields.assignee.displayName}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.unassignedContainer}>
                                        <View style={styles.unassignedAvatar}>
                                            <Text style={styles.unassignedText}>?</Text>
                                        </View>
                                        <Text style={styles.unassignedName}>Unassigned</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 20,
        paddingTop: 24,
        marginBottom: 8,
        marginHorizontal: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 16,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#7A869A',
    },
    subtasksList: {
        gap: 12,
    },
    subtaskItem: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E1E4E8',
    },
    subtaskContent: {
        gap: 8,
    },
    subtaskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtaskKey: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0052CC',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },
    subtaskSummary: {
        fontSize: 14,
        color: '#172B4D',
        lineHeight: 20,
        fontWeight: '400',
    },
    subtaskFooter: {
        marginTop: 4,
    },
    assigneeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    assigneeAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    assigneeAvatarPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    assigneeAvatarText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    assigneeName: {
        fontSize: 13,
        color: '#42526E',
        fontWeight: '500',
    },
    unassignedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unassignedAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#7A869A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    unassignedText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    unassignedName: {
        fontSize: 13,
        color: '#7A869A',
        fontWeight: '500',
    },
});
