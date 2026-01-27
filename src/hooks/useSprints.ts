import { useState, useCallback } from 'react';
import { jiraApi } from '../services/jiraApi';
import { JiraSprint } from '../types/jira';

interface UseSprintsOptions {
    boardId: number | null;
    onRefresh?: () => Promise<void>;
    toast: {
        success: (message: string) => void;
        error: (message: string) => void;
        warning: (message: string) => void;
    };
    onConfirmDelete?: (sprintName: string, onConfirm: () => void) => void;
}

export const useSprints = ({ boardId, onRefresh, toast, onConfirmDelete }: UseSprintsOptions) => {
    const [selectedSprint, setSelectedSprint] = useState<{
        id: number;
        name: string;
        startDate?: string;
        endDate?: string;
    } | null>(null);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [creating, setCreating] = useState(false);

    const handleSprintOptions = useCallback(
        (id: number, name: string, startDate?: string, endDate?: string) => {
            setSelectedSprint({ id, name, startDate, endDate });
            setShowOptionsModal(true);
        },
        []
    );

    const handleOpenUpdate = useCallback(() => {
        setShowOptionsModal(false);
        setTimeout(() => {
            setShowUpdateModal(true);
        }, 100);
    }, []);

    const handleUpdateSprint = useCallback(
        async (data: {
            name: string;
            goal: string;
            startDate: Date | null;
            endDate: Date | null;
        }) => {
            if (!selectedSprint || !boardId) return;

            try {
                setUpdating(true);

                const startDateString = data.startDate?.toISOString();
                const endDateString = data.endDate?.toISOString();

                await jiraApi.updateSprint(
                    selectedSprint.id,
                    data.name || selectedSprint.name,
                    data.goal,
                    startDateString,
                    endDateString
                );

                setShowUpdateModal(false);
                setSelectedSprint(null);
                setShowOptionsModal(false);

                toast.success('Sprint updated successfully');

                if (onRefresh) {
                    await onRefresh();
                }
            } catch (error) {
                console.error('Error updating sprint:', error);
                toast.error('Failed to update sprint. Please try again.');
            } finally {
                setUpdating(false);
            }
        },
        [selectedSprint, boardId, onRefresh]
    );

    const handleDeleteSprint = useCallback(async () => {
        if (!selectedSprint) return;

        const executeDelete = async () => {
            try {
                setDeleting(true);
                await jiraApi.deleteSprint(selectedSprint.id);

                setSelectedSprint(null);
                setShowOptionsModal(false);

                toast.success('Sprint deleted successfully');

                if (onRefresh) {
                    await onRefresh();
                }
            } catch (error) {
                console.error('Error deleting sprint:', error);
                toast.error('Failed to delete sprint. Please try again.');
            } finally {
                setDeleting(false);
            }
        };

        if (onConfirmDelete) {
            onConfirmDelete(selectedSprint.name, executeDelete);
        } else {
            // Fallback if no confirmation handler provided
            executeDelete();
        }
    }, [selectedSprint, onRefresh, toast, onConfirmDelete]);

    const handleCreateSprint = useCallback(
        async (data: {
            name: string;
            goal: string;
            startDate: Date | null;
            endDate: Date | null;
        }) => {
            if (!boardId) return;

            if (!data.name.trim()) {
                toast.warning('Please enter a sprint name');
                return;
            }

            if (!data.startDate) {
                toast.warning('Please select a start date');
                return;
            }

            if (!data.endDate) {
                toast.warning('Please select an end date');
                return;
            }

            if (data.startDate >= data.endDate) {
                toast.warning('End date must be after start date');
                return;
            }

            setCreating(true);
            try {
                const startDateString = data.startDate.toISOString();
                const endDateString = data.endDate.toISOString();

                await jiraApi.createSprint(
                    boardId,
                    data.name.trim(),
                    data.goal.trim() || undefined,
                    startDateString,
                    endDateString
                );

                setShowCreateModal(false);
                toast.success('Sprint created successfully');

                if (onRefresh) {
                    await onRefresh();
                }
            } catch (error: any) {
                console.error('Error creating sprint:', error);
                toast.error(
                    error?.response?.data?.errorMessages?.[0] ||
                    'Failed to create sprint'
                );
            } finally {
                setCreating(false);
            }
        },
        [boardId, onRefresh]
    );

    return {
        selectedSprint,
        showOptionsModal,
        showUpdateModal,
        showCreateModal,
        updating,
        deleting,
        creating,
        setShowOptionsModal,
        setShowUpdateModal,
        setShowCreateModal,
        handleSprintOptions,
        handleOpenUpdate,
        handleUpdateSprint,
        handleDeleteSprint,
        handleCreateSprint,
    };
};
