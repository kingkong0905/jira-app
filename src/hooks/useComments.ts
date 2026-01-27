import { useState } from 'react';
import { Platform } from 'react-native';
import { jiraApi } from '../services/jiraApi';
import { JiraUser } from '../types/jira';

export function useComments(issueKey: string, onSuccess?: (message: string) => void, onError?: (message: string) => void) {
    const [commentText, setCommentText] = useState('');
    const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
    const [postingComment, setPostingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [updatingComment, setUpdatingComment] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

    // Mention state
    const [mentionedUsersMap, setMentionedUsersMap] = useState<Map<string, JiraUser>>(new Map());
    const [editMentionedUsersMap, setEditMentionedUsersMap] = useState<Map<string, JiraUser>>(new Map());

    const extractMentionedUsers = (text: string, usersMap: Map<string, JiraUser>) => {
        const mentionedUsers: Array<{ accountId: string, displayName: string }> = [];
        const mentionRegex = /@([A-Z][A-Za-z0-9\s._-]*?)(?=\s+[a-z]|\s*$|[.,!?;:])/g;
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            const displayName = match[1].trim();
            const user = usersMap.get(displayName);
            if (user) {
                mentionedUsers.push({
                    accountId: user.accountId,
                    displayName: user.displayName,
                });
            }
        }

        return mentionedUsers;
    };

    const addComment = async (refreshComments: () => Promise<void>) => {
        if (!commentText.trim()) {
            onError?.('Please enter a comment');
            return;
        }

        if (Platform.OS === 'web') {
            onError?.('Adding comments is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setPostingComment(true);
            const mentionedUsers = extractMentionedUsers(commentText, mentionedUsersMap);

            await jiraApi.addComment(
                issueKey,
                commentText,
                replyToCommentId || undefined,
                mentionedUsers.length > 0 ? mentionedUsers : undefined
            );

            setCommentText('');
            setReplyToCommentId(null);
            setMentionedUsersMap(new Map());
            await refreshComments();
            onSuccess?.('Comment added successfully');
        } catch (error: any) {
            console.error('Error adding comment:', error);
            onError?.(error?.response?.data?.errorMessages?.[0] || 'Failed to add comment');
        } finally {
            setPostingComment(false);
        }
    };

    const startEdit = (commentId: string, body: any) => {
        if (Platform.OS === 'web') {
            onError?.('Editing comments is not available on web due to CORS restrictions.');
            return;
        }

        const extractTextAndMentions = (node: any, mentionsMap: Map<string, JiraUser>): string => {
            let text = '';
            if (node.type === 'text') {
                text = node.text || '';
            } else if (node.type === 'mention') {
                const accountId = node.attrs?.id;
                const displayName = node.attrs?.text?.replace('@', '') || '';
                if (accountId && displayName) {
                    mentionsMap.set(displayName, {
                        accountId,
                        displayName,
                        emailAddress: '',
                        avatarUrls: { '48x48': '' }
                    } as JiraUser);
                }
                text = `@${displayName}`;
            } else if (node.content) {
                text = node.content.map((child: any) => extractTextAndMentions(child, mentionsMap)).join('');
            }
            return text;
        };

        const mentionsMap = new Map<string, JiraUser>();
        const text = body ? extractTextAndMentions(body, mentionsMap) : '';
        setEditCommentText(text);
        setEditMentionedUsersMap(mentionsMap);
        setEditingCommentId(commentId);
    };

    const updateComment = async (refreshComments: () => Promise<void>) => {
        if (!editCommentText.trim()) {
            onError?.('Comment cannot be empty');
            return;
        }

        try {
            setUpdatingComment(true);
            const mentionedUsers = extractMentionedUsers(editCommentText, editMentionedUsersMap);

            await jiraApi.updateComment(
                issueKey,
                editingCommentId!,
                editCommentText.trim(),
                mentionedUsers.length > 0 ? mentionedUsers : undefined
            );

            await refreshComments();
            setEditingCommentId(null);
            setEditCommentText('');
            setEditMentionedUsersMap(new Map());
            onSuccess?.('Comment updated');
        } catch (error: any) {
            console.error('Error updating comment:', error);
            onError?.(error?.response?.data?.errorMessages?.[0] || 'Failed to update comment');
        } finally {
            setUpdatingComment(false);
        }
    };

    const deleteComment = async (commentId: string, refreshComments: () => Promise<void>) => {
        if (Platform.OS === 'web') {
            onError?.('Deleting comments is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setDeletingCommentId(commentId);
            await jiraApi.deleteComment(issueKey, commentId);
            await refreshComments();
            onSuccess?.('Comment deleted');
        } catch (error: any) {
            console.error('Error deleting comment:', error);
            onError?.(error?.response?.data?.errorMessages?.[0] || 'Failed to delete comment');
        } finally {
            setDeletingCommentId(null);
        }
    };

    const startReply = (commentId: string) => {
        setReplyToCommentId(commentId);
    };

    const cancelReply = () => {
        setReplyToCommentId(null);
        setCommentText('');
    };

    const cancelEdit = () => {
        setEditingCommentId(null);
        setEditCommentText('');
        setEditMentionedUsersMap(new Map());
    };

    return {
        commentText,
        setCommentText,
        replyToCommentId,
        postingComment,
        editingCommentId,
        editCommentText,
        setEditCommentText,
        updatingComment,
        deletingCommentId,
        mentionedUsersMap,
        setMentionedUsersMap,
        editMentionedUsersMap,
        setEditMentionedUsersMap,
        addComment,
        startEdit,
        updateComment,
        deleteComment,
        startReply,
        cancelReply,
        cancelEdit,
    };
}
