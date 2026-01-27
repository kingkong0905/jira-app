import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { UserAvatar } from '../shared';
import { getPriorityEmoji } from '../../utils/fieldFormatters';

interface IssueDetailsFieldsProps {
    assignee?: {
        displayName: string;
        accountId: string;
        avatarUrls?: any;
    };
    reporter?: {
        displayName: string;
        accountId: string;
        avatarUrls?: any;
    };
    priority?: {
        name: string;
    };
    issueType?: {
        name: string;
    };
    sprint?: any;
    storyPoints?: number;
    dueDate?: string;
    onAssigneePress?: () => void;
    onPriorityPress?: () => void;
    onSprintPress?: () => void;
    onStoryPointsPress?: () => void;
    onDueDatePress?: () => void;
}

export default function IssueDetailsFields({
    assignee,
    reporter,
    priority,
    issueType,
    sprint,
    storyPoints,
    dueDate,
    onAssigneePress,
    onPriorityPress,
    onSprintPress,
    onStoryPointsPress,
    onDueDatePress,
}: IssueDetailsFieldsProps) {
    const canEdit = Platform.OS !== 'web';

    const formatSprint = () => {
        if (!sprint) return 'None';
        if (Array.isArray(sprint)) {
            if (sprint.length === 0) return 'None';
            const latestSprint = sprint[sprint.length - 1];
            return latestSprint?.name || 'None';
        }
        return sprint.name || 'None';
    };

    return (
        <View style={styles.card}>
            <View style={styles.headerTitleRow}>
                <Text style={styles.sectionIcon}>📋</Text>
                <Text style={styles.sectionTitle}>Details</Text>
            </View>

            {/* Assignee */}
            <TouchableOpacity
                style={styles.detailRow}
                onPress={canEdit ? onAssigneePress : undefined}
                disabled={!canEdit}
            >
                <View style={styles.detailIconLabel}>
                    <Text style={styles.detailIcon}>👤</Text>
                    <Text style={styles.detailLabel}>Assignee</Text>
                </View>
                <View style={styles.detailValueContainer}>
                    {assignee ? (
                        <View style={styles.assigneeRow}>
                            <UserAvatar user={assignee} size={24} />
                            <Text style={styles.detailValue} numberOfLines={1}>
                                {assignee.displayName}
                            </Text>
                        </View>
                    ) : (
                        <Text style={[styles.detailValue, styles.unassignedText]}>
                            Unassigned
                        </Text>
                    )}
                    {canEdit && <Text style={styles.chevron}>›</Text>}
                </View>
            </TouchableOpacity>

            {/* Reporter */}
            {reporter && (
                <View style={styles.detailRow}>
                    <View style={styles.detailIconLabel}>
                        <Text style={styles.detailIcon}>📝</Text>
                        <Text style={styles.detailLabel}>Reporter</Text>
                    </View>
                    <View style={styles.detailValueContainer}>
                        <View style={styles.assigneeRow}>
                            <UserAvatar user={reporter} size={24} />
                            <Text style={styles.detailValueStatic} numberOfLines={1}>
                                {reporter.displayName}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Priority */}
            <TouchableOpacity
                style={styles.detailRow}
                onPress={canEdit ? onPriorityPress : undefined}
                disabled={!canEdit}
            >
                <View style={styles.detailIconLabel}>
                    <Text style={styles.detailIcon}>⚡</Text>
                    <Text style={styles.detailLabel}>Priority</Text>
                </View>
                <View style={styles.detailValueContainer}>
                    <View style={styles.priorityRow}>
                        <Text style={styles.priorityEmoji}>
                            {getPriorityEmoji(priority?.name)}
                        </Text>
                        <Text style={styles.detailValue}>
                            {priority?.name || 'None'}
                        </Text>
                    </View>
                    {canEdit && <Text style={styles.chevron}>›</Text>}
                </View>
            </TouchableOpacity>

            {/* Issue Type */}
            {issueType && (
                <View style={styles.detailRow}>
                    <View style={styles.detailIconLabel}>
                        <Text style={styles.detailIcon}>🏷️</Text>
                        <Text style={styles.detailLabel}>Type</Text>
                    </View>
                    <View style={styles.detailValueContainer}>
                        <Text style={styles.detailValueStatic}>{issueType.name}</Text>
                    </View>
                </View>
            )}

            {/* Sprint */}
            {sprint !== undefined && (
                <TouchableOpacity
                    style={styles.detailRow}
                    onPress={canEdit ? onSprintPress : undefined}
                    disabled={!canEdit}
                >
                    <View style={styles.detailIconLabel}>
                        <Text style={styles.detailIcon}>🏃</Text>
                        <Text style={styles.detailLabel}>Sprint</Text>
                    </View>
                    <View style={styles.detailValueContainer}>
                        <Text style={styles.detailValue} numberOfLines={1}>
                            {formatSprint()}
                        </Text>
                        {canEdit && <Text style={styles.chevron}>›</Text>}
                    </View>
                </TouchableOpacity>
            )}

            {/* Story Points */}
            {storyPoints !== undefined && (
                <TouchableOpacity
                    style={styles.detailRow}
                    onPress={canEdit ? onStoryPointsPress : undefined}
                    disabled={!canEdit}
                >
                    <View style={styles.detailIconLabel}>
                        <Text style={styles.detailIcon}>🎯</Text>
                        <Text style={styles.detailLabel}>Story Points</Text>
                    </View>
                    <View style={styles.detailValueContainer}>
                        <Text style={styles.detailValue}>
                            {storyPoints || 'Not set'}
                        </Text>
                        {canEdit && <Text style={styles.chevron}>›</Text>}
                    </View>
                </TouchableOpacity>
            )}

            {/* Due Date */}
            {dueDate !== undefined && (
                <TouchableOpacity
                    style={styles.detailRow}
                    onPress={canEdit ? onDueDatePress : undefined}
                    disabled={!canEdit}
                >
                    <View style={styles.detailIconLabel}>
                        <Text style={styles.detailIcon}>📅</Text>
                        <Text style={styles.detailLabel}>Due Date</Text>
                    </View>
                    <View style={styles.detailValueContainer}>
                        <Text style={styles.detailValue}>
                            {dueDate ? new Date(dueDate).toLocaleDateString() : 'Not set'}
                        </Text>
                        {canEdit && <Text style={styles.chevron}>›</Text>}
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 20,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E1E4E8',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#172B4D',
        letterSpacing: 0.2,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 32,
    },
    detailIconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 0.4,
    },
    detailIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84',
        letterSpacing: 0.2,
    },
    detailValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 0.6,
        justifyContent: 'flex-end',
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: -10,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 82, 204, 0.02)',
    },
    detailValue: {
        fontSize: 15,
        color: '#172B4D',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
    },
    detailValueStatic: {
        fontSize: 14,
        color: '#5E6C84',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
    },
    chevron: {
        fontSize: 20,
        color: '#8993A4',
        marginLeft: 8,
        fontWeight: '300',
    },
    unassignedText: {
        fontStyle: 'italic',
        color: '#8993A4',
        fontWeight: '400',
    },
    priorityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    priorityEmoji: {
        fontSize: 16,
        marginRight: 6,
    },
    assigneeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
});
