import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { jiraApi } from '../services/jiraApi';

export function useFieldUpdates(
    issueKey: string,
    refreshIssue: () => Promise<void>,
    onSuccess?: (message: string) => void,
    onError?: (message: string) => void
) {
    // Assignee
    const [showAssigneePicker, setShowAssigneePicker] = useState(false);
    const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [assigningUser, setAssigningUser] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Status
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [availableTransitions, setAvailableTransitions] = useState<any[]>([]);
    const [loadingTransitions, setLoadingTransitions] = useState(false);
    const [transitioningStatusId, setTransitioningStatusId] = useState<string | null>(null);

    // Priority
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [availablePriorities, setAvailablePriorities] = useState<any[]>([]);
    const [loadingPriorities, setLoadingPriorities] = useState(false);
    const [updatingPriorityId, setUpdatingPriorityId] = useState<string | null>(null);

    // Summary
    const [editingSummary, setEditingSummary] = useState(false);
    const [summaryInput, setSummaryInput] = useState('');
    const [updatingSummary, setUpdatingSummary] = useState(false);

    // Description  
    const [editingDescription, setEditingDescription] = useState(false);
    const [descriptionInput, setDescriptionInput] = useState('');
    const [updatingDescription, setUpdatingDescription] = useState(false);

    const checkWebPlatform = (): boolean => {
        if (Platform.OS === 'web') {
            onError?.('This action is not available on web due to CORS restrictions.');
            return false;
        }
        return true;
    };

    const openAssigneePicker = useCallback(async () => {
        if (!checkWebPlatform()) return;

        try {
            setLoadingUsers(true);
            setShowAssigneePicker(true);
            setSearchQuery('');
            const users = await jiraApi.getAssignableUsers(issueKey);
            setAllUsers(users);
            setAssignableUsers(users);
        } catch (error) {
            console.error('Error loading assignable users:', error);
            onError?.('Failed to load assignable users');
            setShowAssigneePicker(false);
        } finally {
            setLoadingUsers(false);
        }
    }, [issueKey]);

    const assignUser = useCallback(async (accountId: string | null) => {
        try {
            setAssigningUser(true);
            await jiraApi.assignIssue(issueKey, accountId);
            await refreshIssue();
            setShowAssigneePicker(false);
            // Reset search and users list after assignment
            setSearchQuery('');
            setAssignableUsers(allUsers);
            onSuccess?.(accountId ? 'Assignee updated successfully' : 'Issue unassigned successfully');
        } catch (error: any) {
            console.error('Error assigning issue:', error);
            onError?.(error?.response?.data?.errorMessages?.[0] || 'Failed to assign issue');
        } finally {
            setAssigningUser(false);
        }
    }, [issueKey, refreshIssue, allUsers]);

    const openStatusPicker = useCallback(async () => {
        if (!checkWebPlatform()) return;

        try {
            setLoadingTransitions(true);
            setShowStatusPicker(true);
            const transitions = await jiraApi.getAvailableTransitions(issueKey);
            setAvailableTransitions(transitions);
        } catch (error) {
            console.error('Error loading transitions:', error);
            onError?.('Failed to load available transitions');
            setShowStatusPicker(false);
        } finally {
            setLoadingTransitions(false);
        }
    }, [issueKey]);

    const transitionStatus = useCallback(async (transitionId: string, transitionName: string) => {
        try {
            setTransitioningStatusId(transitionId);
            await jiraApi.transitionIssue(issueKey, transitionId);
            await refreshIssue();
            setShowStatusPicker(false);
            onSuccess?.(`Status changed to ${transitionName}`);
        } catch (error: any) {
            console.error('Error transitioning issue:', error);
            onError?.(error?.response?.data?.errorMessages?.[0] || 'Failed to change status');
        } finally {
            setTransitioningStatusId(null);
        }
    }, [issueKey, refreshIssue]);

    const openPriorityPicker = useCallback(async () => {
        if (!checkWebPlatform()) return;

        try {
            setLoadingPriorities(true);
            setShowPriorityPicker(true);
            const priorities = await jiraApi.getPriorities();
            setAvailablePriorities(priorities);
        } catch (error) {
            console.error('Error loading priorities:', error);
            onError?.('Failed to load priorities');
            setShowPriorityPicker(false);
        } finally {
            setLoadingPriorities(false);
        }
    }, []);

    const updatePriority = useCallback(async (priorityId: string, priorityName: string) => {
        try {
            setUpdatingPriorityId(priorityId);
            await jiraApi.updateIssueField(issueKey, { priority: { id: priorityId } });
            await refreshIssue();
            setShowPriorityPicker(false);
            onSuccess?.(`Priority changed to ${priorityName}`);
        } catch (error: any) {
            console.error('Error updating priority:', error);
            onError?.(error?.response?.data?.errorMessages?.[0] || 'Failed to change priority');
        } finally {
            setUpdatingPriorityId(null);
        }
    }, [issueKey, refreshIssue]);

    const startEditSummary = useCallback((currentSummary: string) => {
        if (!checkWebPlatform()) return;
        setSummaryInput(currentSummary);
        setEditingSummary(true);
    }, []);

    const updateSummary = useCallback(async () => {
        if (!summaryInput.trim()) {
            onError?.('Summary cannot be empty');
            return;
        }

        try {
            setUpdatingSummary(true);
            await jiraApi.updateIssueField(issueKey, { summary: summaryInput.trim() });
            await refreshIssue();
            setEditingSummary(false);
            onSuccess?.('Summary updated');
        } catch (error: any) {
            console.error('Error updating summary:', error);
            onError?.(error?.response?.data?.errorMessages?.[0] || 'Failed to update summary');
        } finally {
            setUpdatingSummary(false);
        }
    }, [issueKey, summaryInput, refreshIssue]);

    const startEditDescription = useCallback((description: any) => {
        if (!checkWebPlatform()) return;
        // You'd implement HTML conversion logic here
        setDescriptionInput(description || '');
        setEditingDescription(true);
    }, []);

    const updateDescription = useCallback(async () => {
        try {
            setUpdatingDescription(true);
            // Convert HTML to ADF - simplified here
            const descriptionADF = descriptionInput ? {
                type: 'doc',
                version: 1,
                content: [{
                    type: 'paragraph',
                    content: [{
                        type: 'text',
                        text: descriptionInput,
                    }],
                }],
            } : null;

            await jiraApi.updateIssueField(issueKey, { description: descriptionADF });
            await refreshIssue();
            setEditingDescription(false);
            onSuccess?.('Description updated');
        } catch (error: any) {
            console.error('Error updating description:', error);
            onError?.(error?.response?.data?.errorMessages?.[0] || 'Failed to update description');
        } finally {
            setUpdatingDescription(false);
        }
    }, [issueKey, descriptionInput, refreshIssue]);

    return {
        // Assignee
        showAssigneePicker,
        setShowAssigneePicker,
        assignableUsers,
        loadingUsers,
        setLoadingUsers,
        assigningUser,
        searchQuery,
        setSearchQuery,
        allUsers,
        setAssignableUsers,
        openAssigneePicker,
        assignUser,

        // Status
        showStatusPicker,
        setShowStatusPicker,
        availableTransitions,
        loadingTransitions,
        transitioningStatusId,
        openStatusPicker,
        transitionStatus,

        // Priority
        showPriorityPicker,
        setShowPriorityPicker,
        availablePriorities,
        loadingPriorities,
        updatingPriorityId,
        openPriorityPicker,
        updatePriority,

        // Summary
        editingSummary,
        setEditingSummary,
        summaryInput,
        setSummaryInput,
        updatingSummary,
        startEditSummary,
        updateSummary,

        // Description
        editingDescription,
        setEditingDescription,
        descriptionInput,
        setDescriptionInput,
        updatingDescription,
        startEditDescription,
        updateDescription,
    };
}
