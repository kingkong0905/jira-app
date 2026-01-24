import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { JiraIssue } from '../types/jira';
import { formatDate } from '../utils/helpers';

interface IssueDetailsProps {
    issue: JiraIssue;
    onClose: () => void;
}

export default function IssueDetails({ issue, onClose }: IssueDetailsProps) {
    const getStatusColor = (statusCategory: string): string => {
        const colors: { [key: string]: string } = {
            done: '#00875A',
            indeterminate: '#0052CC',
            new: '#6554C0',
            todo: '#6554C0',
            default: '#999',
        };
        return colors[statusCategory.toLowerCase()] || colors.default;
    };

    const renderDescriptionText = (description: any): string => {
        // Handle simple string
        if (typeof description === 'string') {
            return description;
        }

        // Handle ADF (Atlassian Document Format)
        if (description?.content && Array.isArray(description.content)) {
            return description.content
                .map((node: any) => {
                    if (node.type === 'paragraph' && node.content) {
                        return node.content.map((text: any) => text.text || '').join('');
                    }
                    return '';
                })
                .filter((text: string) => text.length > 0)
                .join('\n\n');
        }

        return '';
    };

    return (
        <View style={styles.overlay}>
            <View style={styles.modal}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Issue Details</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeIcon}>✕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.issueKey}>{issue.key}</Text>
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: getStatusColor(
                                        issue.fields.status.statusCategory.colorName
                                    ),
                                },
                            ]}
                        >
                            <Text style={styles.statusText}>{issue.fields.status.name}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Summary</Text>
                        <Text style={styles.summary}>{issue.fields.summary}</Text>
                    </View>

                    {issue.fields.description && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.description}>{renderDescriptionText(issue.fields.description)}</Text>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Details</Text>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Type:</Text>
                            <Text style={styles.detailValue}>{issue.fields.issuetype.name}</Text>
                        </View>

                        {issue.fields.priority && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Priority:</Text>
                                <Text style={styles.detailValue}>{issue.fields.priority.name}</Text>
                            </View>
                        )}

                        {issue.fields.assignee && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Assignee:</Text>
                                <Text style={styles.detailValue}>
                                    {issue.fields.assignee.displayName}
                                </Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Created:</Text>
                            <Text style={styles.detailValue}>
                                {formatDate(issue.fields.created)}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Updated:</Text>
                            <Text style={styles.detailValue}>
                                {formatDate(issue.fields.updated)}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: 15,
        width: '100%',
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    closeIcon: {
        fontSize: 24,
        color: '#666',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 20,
    },
    issueKey: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0052CC',
        marginBottom: 10,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
    },
    statusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    summary: {
        fontSize: 18,
        color: '#333',
        fontWeight: '500',
        lineHeight: 24,
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        width: 100,
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
});
