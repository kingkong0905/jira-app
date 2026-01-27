import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBadge } from '../shared';
import { getStatusColor, getPriorityEmoji } from '../../utils/fieldFormatters';

interface IssueSummaryCardProps {
    issueKey: string;
    summary: string;
    status: {
        name: string;
        statusCategory: { key?: string };
    };
    priority?: { name: string };
    onEdit?: () => void;
    onStatusPress?: () => void;
}

export default function IssueSummaryCard({
    issueKey,
    summary,
    status,
    priority,
    onEdit,
    onStatusPress
}: IssueSummaryCardProps) {
    const statusColor = getStatusColor(status.statusCategory.key || 'default');

    return (
        <View style={styles.card}>
            <View style={styles.keyStatusRow}>
                <View style={styles.keyContainer}>
                    <Text style={styles.issueKeyLabel}>Issue Key</Text>
                    <Text style={styles.issueKey}>{issueKey}</Text>
                </View>
                <TouchableOpacity
                    onPress={onStatusPress}
                    disabled={!onStatusPress}
                    activeOpacity={onStatusPress ? 0.7 : 1}
                >
                    <StatusBadge
                        status={status.name}
                        color={statusColor}
                        style={styles.statusBadge}
                        textStyle={styles.statusText}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardHeader}>
                <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionIcon}>📝</Text>
                    <Text style={styles.sectionTitle}>Summary</Text>
                    {priority && (
                        <Text style={styles.priorityEmoji}>
                            {getPriorityEmoji(priority.name)}
                        </Text>
                    )}
                </View>
                {onEdit && (
                    <TouchableOpacity onPress={onEdit} style={styles.editButton}>
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.summary}>{summary}</Text>
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
    keyStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    keyContainer: {
        flexDirection: 'column',
    },
    issueKeyLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5E6C84',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    issueKey: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0052CC',
        letterSpacing: 0.3,
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 1,
    },
    statusText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: '#E1E4E8',
        marginVertical: 18,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
    priorityEmoji: {
        fontSize: 16,
        marginLeft: 8,
    },
    editButton: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    editButtonText: {
        color: '#0052CC',
        fontSize: 14,
        fontWeight: '600',
    },
    summary: {
        fontSize: 20,
        color: '#172B4D',
        fontWeight: '600',
        lineHeight: 30,
        letterSpacing: 0.1,
    },
});
