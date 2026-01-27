import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { JiraIssue, JiraComment } from '../types/jira';
import { jiraApi } from '../services/jiraApi';
import { StorageService } from '../services/storage';

export function useIssueData(issueKey: string) {
    const [issue, setIssue] = useState<JiraIssue | null>(null);
    const [comments, setComments] = useState<JiraComment[]>([]);
    const [issueLinks, setIssueLinks] = useState<any[]>([]);
    const [remoteLinks, setRemoteLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingComments, setLoadingComments] = useState(true);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({});
    const [currentUser, setCurrentUser] = useState<any>(null);

    const loadAuthHeaders = async () => {
        try {
            const config = await StorageService.getConfig();
            if (config) {
                const authString = `${config.email}:${config.apiToken}`;
                const base64Auth = typeof Buffer !== 'undefined'
                    ? Buffer.from(authString).toString('base64')
                    : btoa(authString);

                setAuthHeaders({
                    'Authorization': `Basic ${base64Auth}`,
                });
            }
        } catch (error) {
            console.error('Error loading auth headers:', error);
        }
    };

    const loadCurrentUser = async () => {
        try {
            const user = await jiraApi.getCurrentUser();
            setCurrentUser(user);
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    };

    const loadIssueDetails = async () => {
        try {
            setLoading(true);
            const issueData = await jiraApi.getIssueDetails(issueKey);
            setIssue(issueData);
        } catch (error) {
            console.error('Error loading issue details:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async () => {
        if (Platform.OS === 'web') {
            setLoadingComments(false);
            return;
        }

        try {
            setLoadingComments(true);
            const commentsData = await jiraApi.getIssueComments(issueKey);

            const mappedComments = commentsData.map((comment: any) => ({
                ...comment,
                parentId: comment.parent?.id || comment.parentId || null,
            }));

            setComments(mappedComments);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const loadLinks = async () => {
        if (Platform.OS === 'web') return;

        try {
            setLoadingLinks(true);
            const [links, remote] = await Promise.all([
                jiraApi.getIssueLinks(issueKey),
                jiraApi.getRemoteLinks(issueKey),
            ]);
            setIssueLinks(links);
            setRemoteLinks(remote);
        } catch (error) {
            console.error('Error loading links:', error);
        } finally {
            setLoadingLinks(false);
        }
    };

    useEffect(() => {
        loadIssueDetails();
        loadComments();
        loadLinks();
        loadCurrentUser();
        loadAuthHeaders();
    }, [issueKey]);

    return {
        issue,
        comments,
        issueLinks,
        remoteLinks,
        loading,
        loadingComments,
        loadingLinks,
        authHeaders,
        currentUser,
        refreshIssue: loadIssueDetails,
        refreshComments: loadComments,
        refreshLinks: loadLinks,
    };
}
