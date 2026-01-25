import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { JiraIssue } from '../types/jira';

interface IssueCardProps {
    issue: JiraIssue;
    onPress?: () => void;
}

const IssueCard = React.memo<IssueCardProps>(({ issue, onPress }) => {
    const getStatusColor = (statusCategory: string): string => {
        const colors: { [key: string]: string } = {
            done: '#36B37E',
            indeterminate: '#0065FF',
            new: '#6554C0',
            todo: '#6554C0',
            default: '#5E6C84',
        };
        return colors[statusCategory.toLowerCase()] || colors.default;
    };

    const getPriorityEmoji = (priority?: string): string => {
        if (!priority) return '📋';
        const emojiMap: { [key: string]: string } = {
            highest: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
            lowest: '🔵',
        };
        return emojiMap[priority.toLowerCase()] || '📋';
    };

    const statusColor = getStatusColor(issue.fields.status.statusCategory.key || issue.fields.status.statusCategory.colorName);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.keyContainer}>
                    <Text style={styles.issueKey}>{issue.key}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>{issue.fields.status.name}</Text>
                    </View>
                </View>
                {issue.fields.priority && (
                    <Text style={styles.priorityEmoji}>
                        {getPriorityEmoji(issue.fields.priority.name)}
                    </Text>
                )}
            </View>

            <Text style={styles.summary} numberOfLines={2}>
                {issue.fields.summary}
            </Text>

            <View style={styles.footer}>
                <View style={styles.typeContainer}>
                    <Text style={styles.typeEmoji}>
                        {issue.fields.issuetype.name === 'Bug' ? '🐛' :
                            issue.fields.issuetype.name === 'Task' ? '📝' :
                                issue.fields.issuetype.name === 'Story' ? '📖' : '📌'}
                    </Text>
                    <Text style={styles.typeText}>{issue.fields.issuetype.name}</Text>
                </View>
                {issue.fields.assignee && (
                    <View style={styles.assigneeContainer}>
                        <View style={styles.avatar}>
                            {issue.fields.assignee.avatarUrls?.['48x48'] ? (
                                <Image
                                    source={{ uri: issue.fields.assignee.avatarUrls['48x48'] }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <Text style={styles.avatarText}>
                                    {issue.fields.assignee.displayName.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <Text style={styles.assigneeName} numberOfLines={1}>
                            {issue.fields.assignee.displayName}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

export default IssueCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E1E4E8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    keyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10,
    },
    issueKey: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0052CC',
        letterSpacing: 0.5,
    },
    statusBadge: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 1,
    },
    statusText: {
        fontSize: 11,
        color: '#FFFFFF',
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    priorityEmoji: {
        fontSize: 20,
    },
    summary: {
        fontSize: 16,
        color: '#172B4D',
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 6,
    },
    typeEmoji: {
        fontSize: 14,
    },
    typeText: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '600',
    },
    assigneeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        marginLeft: 12,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#0052CC',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    assigneeName: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '500',
        flex: 1,
    },
});
