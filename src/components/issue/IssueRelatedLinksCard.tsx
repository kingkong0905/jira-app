import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { JiraIssue } from '../../types/jira';

interface IssueRelatedLinksCardProps {
    issueLinks: any[];
    remoteLinks: any[];
    loading?: boolean;
    onIssuePress?: (issueKey: string) => void;
}

export default function IssueRelatedLinksCard({
    issueLinks,
    remoteLinks,
    loading = false,
    onIssuePress,
}: IssueRelatedLinksCardProps) {
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

    // Filter Confluence pages from remote links
    const confluencePages = remoteLinks.filter((link: any) => {
        const url = link.object?.url || '';
        const title = link.object?.title || '';
        return url.includes('confluence') || title.toLowerCase().includes('confluence');
    });

    // Filter other remote links (non-Confluence)
    const otherRemoteLinks = remoteLinks.filter((link: any) => {
        const url = link.object?.url || '';
        const title = link.object?.title || '';
        return !url.includes('confluence') && !title.toLowerCase().includes('confluence');
    });

    // Process issue links - extract related issues
    const relatedIssues = issueLinks
        .map((link: any) => {
            // Link can have inwardIssue or outwardIssue
            const relatedIssue = link.inwardIssue || link.outwardIssue;
            if (!relatedIssue) return null;

            return {
                key: relatedIssue.key,
                summary: relatedIssue.fields?.summary || 'No summary',
                status: relatedIssue.fields?.status || { name: 'Unknown', statusCategory: { key: 'default' } },
                assignee: relatedIssue.fields?.assignee,
                relationship: link.type?.name || link.type?.inward || link.type?.outward || 'Related',
                direction: link.inwardIssue ? 'inward' : 'outward',
            };
        })
        .filter((issue: any) => issue !== null);

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Related Links</Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0052CC" />
                    <Text style={styles.loadingText}>Loading links...</Text>
                </View>
            </View>
        );
    }

    const hasContent = relatedIssues.length > 0 || confluencePages.length > 0 || otherRemoteLinks.length > 0;

    if (!hasContent) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Related Links</Text>

            {/* Related Issues */}
            {relatedIssues.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Related Issues ({relatedIssues.length})</Text>
                    <View style={styles.linksList}>
                        {relatedIssues.map((issue: any, index: number) => (
                            <TouchableOpacity
                                key={`issue-${index}-${issue.key}`}
                                style={styles.linkItem}
                                onPress={() => onIssuePress?.(issue.key)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.linkContent}>
                                    <View style={styles.linkHeader}>
                                        <Text style={styles.issueKey}>{issue.key}</Text>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                {
                                                    backgroundColor: getStatusColor(
                                                        issue.status.statusCategory?.key
                                                    ),
                                                },
                                            ]}
                                        >
                                            <Text style={styles.statusText}>
                                                {issue.status.name}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.relationshipText}>
                                        {issue.relationship}
                                    </Text>
                                    <Text style={styles.linkTitle} numberOfLines={2}>
                                        {issue.summary}
                                    </Text>
                                    {issue.assignee && (
                                        <Text style={styles.assigneeText}>
                                            {issue.assignee.displayName}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Confluence Pages */}
            {confluencePages.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Confluence Pages ({confluencePages.length})</Text>
                    <View style={styles.linksList}>
                        {confluencePages.map((link: any, index: number) => (
                            <TouchableOpacity
                                key={`confluence-${index}`}
                                style={styles.linkItem}
                                onPress={() => {
                                    const url = link.object?.url;
                                    if (url) {
                                        Linking.openURL(url);
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.linkContentRow}>
                                    <View style={styles.linkIcon}>
                                        <Text style={styles.linkIconText}>📄</Text>
                                    </View>
                                    <View style={styles.linkTextContainer}>
                                        <Text style={styles.linkType}>
                                            {link.relationship || 'Documentation'}
                                        </Text>
                                        <Text style={styles.linkTitle} numberOfLines={2}>
                                            {link.object?.title || 'Confluence Page'}
                                        </Text>
                                        {link.object?.summary && (
                                            <Text style={styles.linkSummary} numberOfLines={2}>
                                                {link.object.summary}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Other Remote Links */}
            {otherRemoteLinks.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>External Links ({otherRemoteLinks.length})</Text>
                    <View style={styles.linksList}>
                        {otherRemoteLinks.map((link: any, index: number) => (
                            <TouchableOpacity
                                key={`remote-${index}`}
                                style={styles.linkItem}
                                onPress={() => {
                                    const url = link.object?.url;
                                    if (url) {
                                        Linking.openURL(url);
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.linkContentRow}>
                                    <View style={styles.linkIcon}>
                                        <Text style={styles.linkIconText}>🌐</Text>
                                    </View>
                                    <View style={styles.linkTextContainer}>
                                        <Text style={styles.linkType}>
                                            {link.relationship || 'External Link'}
                                        </Text>
                                        <Text style={styles.linkTitle} numberOfLines={2}>
                                            {link.object?.title || 'External Link'}
                                        </Text>
                                        {link.object?.summary && (
                                            <Text style={styles.linkSummary} numberOfLines={2}>
                                                {link.object.summary}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
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
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#42526E',
        marginBottom: 12,
    },
    linksList: {
        gap: 12,
    },
    linkItem: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E1E4E8',
    },
    linkContent: {
        gap: 8,
    },
    linkContentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    linkHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    issueKey: {
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
    relationshipText: {
        fontSize: 12,
        color: '#7A869A',
        fontWeight: '500',
    },
    linkTitle: {
        fontSize: 14,
        color: '#172B4D',
        lineHeight: 20,
        fontWeight: '400',
    },
    assigneeText: {
        fontSize: 12,
        color: '#42526E',
        marginTop: 4,
    },
    linkIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E6FCFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    linkIconText: {
        fontSize: 20,
    },
    linkTextContainer: {
        flex: 1,
    },
    linkType: {
        fontSize: 12,
        color: '#7A869A',
        fontWeight: '500',
        marginBottom: 4,
    },
    linkSummary: {
        fontSize: 12,
        color: '#7A869A',
        marginTop: 4,
        lineHeight: 16,
    },
});
