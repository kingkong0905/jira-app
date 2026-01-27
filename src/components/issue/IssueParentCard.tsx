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

interface IssueParentCardProps {
    parent: JiraIssue | null;
    loading?: boolean;
    onParentPress?: (issueKey: string) => void;
}

export default function IssueParentCard({
    parent,
    loading = false,
    onParentPress,
}: IssueParentCardProps) {
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
                <Text style={styles.title}>Parent Task</Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0052CC" />
                    <Text style={styles.loadingText}>Loading parent task...</Text>
                </View>
            </View>
        );
    }

    if (!parent) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Parent Task</Text>
            <TouchableOpacity
                style={styles.parentItem}
                onPress={() => onParentPress?.(parent.key)}
                activeOpacity={0.7}
            >
                <View style={styles.parentContent}>
                    {/* Ticket ID */}
                    <View style={styles.parentHeader}>
                        <Text style={styles.parentKey}>{parent.key}</Text>
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: getStatusColor(
                                        parent.fields.status.statusCategory.key
                                    ),
                                },
                            ]}
                        >
                            <Text style={styles.statusText}>
                                {parent.fields.status.name}
                            </Text>
                        </View>
                    </View>

                    {/* Name/Summary */}
                    <Text style={styles.parentSummary} numberOfLines={2}>
                        {parent.fields.summary}
                    </Text>

                    {/* Assignee */}
                    <View style={styles.parentFooter}>
                        {parent.fields.assignee ? (
                            <View style={styles.assigneeContainer}>
                                {parent.fields.assignee.avatarUrls?.['48x48'] ? (
                                    <Image
                                        source={{
                                            uri: parent.fields.assignee.avatarUrls['48x48'],
                                        }}
                                        style={styles.assigneeAvatar}
                                    />
                                ) : (
                                    <View style={styles.assigneeAvatarPlaceholder}>
                                        <Text style={styles.assigneeAvatarText}>
                                            {parent.fields.assignee.displayName
                                                .charAt(0)
                                                .toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <Text style={styles.assigneeName}>
                                    {parent.fields.assignee.displayName}
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
    parentItem: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E1E4E8',
    },
    parentContent: {
        gap: 8,
    },
    parentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    parentKey: {
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
    parentSummary: {
        fontSize: 14,
        color: '#172B4D',
        lineHeight: 20,
        fontWeight: '400',
    },
    parentFooter: {
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
