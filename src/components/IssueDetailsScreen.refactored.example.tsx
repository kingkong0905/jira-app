/**
 * Refactored IssueDetailsScreen - Example Implementation
 * 
 * This is a simplified example showing how to use the extracted components and hooks.
 * Replace the current IssueDetailsScreen.tsx with this pattern.
 * 
 * Key improvements:
 * - Reduced from 5,182 lines to ~200 lines
 * - Uses custom hooks for state management
 * - Composed of smaller, reusable components
 * - Clean, maintainable code structure
 */

import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useToast } from './shared/ToastContext';
import { SkeletonLoader } from './shared/SkeletonLoader';
import { FadeInView } from './shared/FadeInView';

// Import custom hooks
import { useIssueData } from '../hooks/useIssueData';
import { useComments } from '../hooks/useComments';
import { useFieldUpdates } from '../hooks/useFieldUpdates';

// Import feature components
import IssueHeader from './issue/IssueHeader';
import IssueSummaryCard from './issue/IssueSummaryCard';
import IssueDetailsFields from './issue/IssueDetailsFields';

// Import the original component's complex pieces (to be further extracted)
// TODO: Extract these into separate components
// - IssueDescriptionCard
// - IssueCommentsSection
// - AttachmentPreviewModal
// - Various picker modals

interface IssueDetailsScreenProps {
    issueKey: string;
    onBack: () => void;
}

/**
 * Main IssueDetailsScreen Component
 * 
 * This component orchestrates the display of issue details by:
 * 1. Loading data via useIssueData hook
 * 2. Managing comments via useComments hook
 * 3. Handling field updates via useFieldUpdates hook
 * 4. Composing UI with smaller, focused components
 */
export default function IssueDetailsScreen({ issueKey, onBack }: IssueDetailsScreenProps) {
    const toast = useToast();

    // ============================================
    // DATA MANAGEMENT (via hooks)
    // ============================================

    const {
        issue,
        comments,
        issueLinks,
        remoteLinks,
        loading,
        loadingComments,
        loadingLinks,
        authHeaders,
        currentUser,
        refreshIssue,
        refreshComments,
        refreshLinks,
    } = useIssueData(issueKey);

    const commentOperations = useComments(
        issueKey,
        (msg) => toast.success(msg),
        (msg) => toast.error(msg)
    );

    const fieldOperations = useFieldUpdates(
        issueKey,
        refreshIssue,
        (msg) => toast.success(msg),
        (msg) => toast.error(msg)
    );

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading || !issue) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <IssueHeader issueKey={issueKey} onBack={onBack} />
                <View style={styles.centerContainer}>
                    <SkeletonLoader />
                </View>
            </View>
        );
    }

    // ============================================
    // MAIN UI COMPOSITION
    // ============================================

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <IssueHeader issueKey={issueKey} onBack={onBack} />

            {/* Content */}
            <ScrollView style={styles.content}>
                <FadeInView>
                    {/* Summary Card */}
                    <IssueSummaryCard
                        issueKey={issue.key}
                        summary={issue.fields.summary}
                        status={issue.fields.status}
                        priority={issue.fields.priority}
                        onEdit={() => fieldOperations.startEditSummary(issue.fields.summary)}
                    />

                    {/* Details Fields */}
                    <IssueDetailsFields
                        assignee={issue.fields.assignee}
                        reporter={issue.fields.reporter}
                        priority={issue.fields.priority}
                        issueType={issue.fields.issuetype}
                        sprint={issue.fields.customfield_10020}
                        storyPoints={issue.fields.customfield_10016}
                        dueDate={issue.fields.duedate}
                        onAssigneePress={fieldOperations.openAssigneePicker}
                        onPriorityPress={fieldOperations.openPriorityPicker}
                        onSprintPress={() => {/* TODO: Implement sprint picker */ }}
                        onStoryPointsPress={() => {/* TODO: Implement story points picker */ }}
                        onDueDatePress={() => {/* TODO: Implement due date picker */ }}
                    />

                    {/* TODO: Add remaining components
                    <IssueDescriptionCard
                        description={issue.fields.description}
                        attachments={issue.fields.attachment}
                        onEdit={() => fieldOperations.startEditDescription(issue.fields.description)}
                    />

                    <IssueCommentsSection
                        comments={comments}
                        loading={loadingComments}
                        currentUser={currentUser}
                        commentText={commentOperations.commentText}
                        onCommentTextChange={commentOperations.setCommentText}
                        onAddComment={() => commentOperations.addComment(refreshComments)}
                        onReply={commentOperations.startReply}
                        onEdit={commentOperations.startEdit}
                        onDelete={(id) => commentOperations.deleteComment(id, refreshComments)}
                    />
                    */}
                </FadeInView>
            </ScrollView>

            {/* TODO: Add modals for editing fields
            <AssigneePickerModal
                visible={fieldOperations.showAssigneePicker}
                users={fieldOperations.assignableUsers}
                loading={fieldOperations.loadingUsers}
                currentAssignee={issue.fields.assignee}
                onSelect={fieldOperations.assignUser}
                onClose={() => fieldOperations.setShowAssigneePicker(false)}
            />
            
            <StatusPickerModal ... />
            <PriorityPickerModal ... />
            etc.
            */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
});
