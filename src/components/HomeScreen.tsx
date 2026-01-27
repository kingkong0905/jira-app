import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Platform,
    TextInput,
    ScrollView,
    Image,
    Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { jiraApi } from '../services/jiraApi';
import { StorageService } from '../services/storage';
import { JiraIssue, JiraBoard, JiraSprint } from '../types/jira';
import IssueCard from './IssueCard';
import Logo from './Logo';
import IssueDetailsScreen from './IssueDetailsScreen';
import CreateIssueScreen from './CreateIssueScreen';
import { SkeletonList, SkeletonLoader } from './shared/SkeletonLoader';
import { FadeInView } from './shared/FadeInView';
import { SprintOptionsModal } from './sprint/SprintOptionsModal';
import { CreateSprintModal } from './sprint/CreateSprintModal';
import { UpdateSprintModal } from './sprint/UpdateSprintModal';
import { AssigneeFilter } from './filters/AssigneeFilter';
import { useSprints } from '../hooks/useSprints';
import { useToast } from './shared/ToastContext';

interface HomeScreenProps {
    onOpenSettings: () => void;
}

type TabType = 'backlog' | 'board' | 'timeline';

export default function HomeScreen({ onOpenSettings }: HomeScreenProps) {
    const [boards, setBoards] = useState<JiraBoard[]>([]);
    const [selectedBoard, setSelectedBoard] = useState<JiraBoard | null>(null);
    const [issues, setIssues] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [boardsStartAt, setBoardsStartAt] = useState(0);
    const [hasMoreBoards, setHasMoreBoards] = useState(true);
    const [loadingMoreBoards, setLoadingMoreBoards] = useState(false);
    const [totalBoards, setTotalBoards] = useState(0);
    const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<TabType>('board');
    const [sprints, setSprints] = useState<JiraSprint[]>([]);
    const [activeSprint, setActiveSprint] = useState<JiraSprint | null>(null);
    const [backlogIssues, setBacklogIssues] = useState<JiraIssue[]>([]);
    const [issueSearchQuery, setIssueSearchQuery] = useState('');
    const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(null);
    const [savedDefaultBoardId, setSavedDefaultBoardId] = useState<number | null>(null);
    const [isBoardDropdownExpanded, setIsBoardDropdownExpanded] = useState(false);
    const [boardAssignees, setBoardAssignees] = useState<Array<{ key: string, name: string }>>([]);
    const [showCreateIssue, setShowCreateIssue] = useState(false);
    const [filteringIssues, setFilteringIssues] = useState(false);
    const [collapsedSprints, setCollapsedSprints] = useState<Set<string>>(new Set());
    const [boardTypeFilter, setBoardTypeFilter] = useState<'all' | 'scrum' | 'kanban'>('all');
    const [searchingBoards, setSearchingBoards] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [sprintToDelete, setSprintToDelete] = useState<{ name: string; onConfirm: () => void } | null>(null);
    const [showCompleteSprint, setShowCompleteSprint] = useState(false);
    const boardListRef = useRef<FlatList>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const toast = useToast();

    // Sprint management with custom hook
    const sprintManager = useSprints({
        boardId: selectedBoard?.id || null,
        onRefresh: async () => {
            if (selectedBoard) {
                await loadIssuesForBoard(selectedBoard.id);
            }
        },
        toast,
        onConfirmDelete: (sprintName, onConfirm) => {
            setSprintToDelete({ name: sprintName, onConfirm });
            setShowDeleteConfirm(true);
        },
    });

    useEffect(() => {
        initializeAndLoadData();
    }, []);

    const initializeAndLoadData = async () => {
        try {
            const config = await StorageService.getConfig();
            if (config) {
                jiraApi.initialize(config);
                const defaultBoardId = await StorageService.getDefaultBoardId();
                setSavedDefaultBoardId(defaultBoardId);
                await loadBoards(true);
            }
        } catch (error) {
            console.error('Initialization error:', error);
            toast.error('Failed to initialize. Please check your settings.');
        } finally {
            setLoading(false);
        }
    };

    const loadBoards = async (reset: boolean = false, search?: string) => {
        try {
            setError(null);
            const startAt = reset ? 0 : boardsStartAt;
            const query = search !== undefined ? search : searchQuery;
            const response = await jiraApi.getBoards(startAt, 50, query);

            if (reset) {
                // If we have a default board that was fetched separately, ensure it's at the start
                const defaultBoardId = await StorageService.getDefaultBoardId();
                if (defaultBoardId) {
                    const defaultBoard = response.boards.find(b => b.id === defaultBoardId);
                    if (defaultBoard) {
                        // Move default board to the front
                        const otherBoards = response.boards.filter(b => b.id !== defaultBoardId);
                        setBoards([defaultBoard, ...otherBoards]);
                    } else {
                        setBoards(response.boards);
                    }
                } else {
                    setBoards(response.boards);
                }
                setBoardsStartAt(50);
            } else {
                setBoards(prev => [...prev, ...response.boards]);
                setBoardsStartAt(prev => prev + 50);
            }

            setTotalBoards(response.total);
            setHasMoreBoards(!response.isLast);

            // Auto-select default board or first board (only when not searching)
            if (response.boards.length > 0 && !selectedBoard && reset && !query) {
                const defaultBoardId = await StorageService.getDefaultBoardId();
                let boardToSelect = response.boards[0];

                if (defaultBoardId) {
                    console.log(response.boards);
                    const defaultBoard = response.boards.find(b => b.id === defaultBoardId);
                    if (defaultBoard) {
                        boardToSelect = defaultBoard;
                    } else {
                        // Default board not in first page, try to load it specifically by ID
                        console.log(`Default board ${defaultBoardId} not found in first page, fetching by ID...`);
                        try {
                            const specificBoard = await jiraApi.getBoardById(defaultBoardId);
                            if (specificBoard) {
                                // Add the specific board to the list and select it
                                setBoards(prev => [specificBoard, ...prev]);
                                boardToSelect = specificBoard;
                            } else {
                                console.log(`Default board ${defaultBoardId} no longer exists, using first board`);
                                await StorageService.clearDefaultBoard();
                            }
                        } catch (error) {
                            console.error('Error fetching default board by ID:', error);
                            // Keep using first board if fetch fails
                        }
                    }
                }

                if (boardToSelect && boardToSelect.id) {
                    setSelectedBoard(boardToSelect);
                    await loadIssuesForBoard(boardToSelect.id);
                }
            }
        } catch (error: any) {
            console.error('Error loading boards:', error);
            const errorMessage = Platform.OS === 'web'
                ? 'Unable to load boards due to browser CORS restrictions. Please use the iOS or Android app for full functionality.'
                : 'Failed to load boards. Please check your credentials and internet connection.';

            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    const handleBoardSearch = async (query: string) => {
        setSearchQuery(query);

        // Clear any existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Reset filter when searching
        if (query.trim()) {
            setBoardTypeFilter('all');
        }

        // Debounce search
        searchTimeoutRef.current = setTimeout(async () => {
            setBoardsStartAt(0);
            setHasMoreBoards(true);
            setSearchingBoards(true);
            await loadBoards(true, query);
            setSearchingBoards(false);
        }, 300);
    };

    const loadMoreBoards = async () => {
        if (loadingMoreBoards || !hasMoreBoards) return;

        setLoadingMoreBoards(true);
        await loadBoards(false);
        setLoadingMoreBoards(false);
    };

    const handleBoardTypeFilterChange = async (filter: 'all' | 'scrum' | 'kanban') => {
        setBoardTypeFilter(filter);
        // If there's a search query, re-search with the new filter
        // Otherwise, the filter will work client-side on already loaded boards
    };

    const loadIssuesForBoard = async (boardId: number, targetTab?: TabType, assigneeFilter?: string) => {
        if (!boardId) {
            console.error('Invalid board ID');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Load assignees for the board
            const assigneesData = await jiraApi.getBoardAssignees(boardId);
            setBoardAssignees(assigneesData);

            // Get the board to check its type
            const board = boards.find(b => b.id === boardId) || selectedBoard;
            const isNotKanban = board?.type?.toLowerCase() !== 'kanban';

            // Use targetTab if provided, otherwise use activeTab
            const tabToLoad = targetTab !== undefined ? targetTab : activeTab;

            // Use assigneeFilter if provided, otherwise use selectedAssignee state
            const assigneeToUse = assigneeFilter !== undefined ? assigneeFilter : selectedAssignee;

            // Only load sprints for non-Kanban boards (Scrum and other board types)
            if (isNotKanban) {
                // Load sprints for the board
                let sprintsData: JiraSprint[] = [];
                try {
                    sprintsData = await jiraApi.getSprintsForBoard(boardId);
                    setSprints(sprintsData);
                } catch (error) {
                    console.log('Board does not support sprints, treating as Kanban');
                    setSprints([]);
                    setActiveSprint(null);
                    setBacklogIssues([]);
                    const issuesData = await jiraApi.getBoardIssues(boardId);
                    setIssues(issuesData);
                    setLoading(false);
                    return;
                }

                // Get active sprint
                const activeSprintData = sprintsData.find(s => s.state === 'active') || null;
                setActiveSprint(activeSprintData);

                // Auto-collapse non-active sprints for better initial performance
                if (tabToLoad === 'backlog' && sprintsData.length > 2) {
                    const collapsed = new Set<string>();
                    sprintsData.forEach(sprint => {
                        // Keep active sprint and backlog expanded, collapse others
                        if (sprint.id !== activeSprintData?.id && sprint.state !== 'active') {
                            collapsed.add(`sprint-${sprint.id}`);
                        }
                    });
                    setCollapsedSprints(collapsed);
                }

                // Load issues based on active tab
                if ((tabToLoad === 'board' || tabToLoad === 'timeline') && activeSprintData) {
                    const sprintIssues = await jiraApi.getSprintIssues(boardId, activeSprintData.id, assigneeToUse);
                    setIssues(sprintIssues);
                } else if (tabToLoad === 'backlog') {
                    const backlog = await jiraApi.getBacklogIssues(boardId, assigneeToUse);
                    setBacklogIssues(backlog);

                    // Load all sprint issues for backlog view
                    const allSprintIssues: JiraIssue[] = [];
                    const issueKeys = new Set<string>();
                    for (const sprint of sprintsData) {
                        try {
                            const sprintIssues = await jiraApi.getSprintIssues(boardId, sprint.id, assigneeToUse);
                            // Deduplicate by issue key
                            sprintIssues.forEach(issue => {
                                if (!issueKeys.has(issue.key)) {
                                    issueKeys.add(issue.key);
                                    allSprintIssues.push(issue);
                                }
                            });
                        } catch (sprintError) {
                            console.error(`Error loading sprint ${sprint.id}:`, sprintError);
                            // Continue loading other sprints
                        }
                    }
                    setIssues(allSprintIssues);
                } else {
                    // Fallback to board issues if no active sprint
                    const issuesData = await jiraApi.getBoardIssues(boardId);
                    setIssues(issuesData);
                }
            } else {
                // Kanban board - no sprints, just load all board issues
                console.log('Loading Kanban board - no sprints');
                setSprints([]);
                setActiveSprint(null);
                setBacklogIssues([]);

                const issuesData = await jiraApi.getBoardIssues(boardId);
                setIssues(issuesData);
            }
        } catch (error: any) {
            console.error('Error loading issues:', error);
            const errorMsg = error?.response?.data?.errorMessages?.[0] || 'Failed to load issues for this board';
            setError(errorMsg);
            toast.error(errorMsg);
            // Reset state on error
            setIssues([]);
            setBacklogIssues([]);
            setSprints([]);
            setActiveSprint(null);
        } finally {
            setLoading(false);
        }
    };

    const handleBoardSelect = async (board: JiraBoard) => {
        setSelectedBoard(board);
        setIssueSearchQuery('');
        setSelectedAssignee('all');
        setIsBoardDropdownExpanded(false);
        await loadIssuesForBoard(board.id);
    };

    const handleTabChange = async (tab: TabType) => {
        setActiveTab(tab);
        setIssueSearchQuery('');
        // Don't reset assignee filter when changing tabs - preserve the user's selection
        if (selectedBoard) {
            await loadIssuesForBoard(selectedBoard.id, tab);
        }
    };

    const handleAssigneeChange = async (assignee: string) => {
        setSelectedAssignee(assignee);
        if (selectedBoard) {
            await filterIssuesByAssignee(assignee);
        }
    };

    const filterIssuesByAssignee = async (assignee: string) => {
        if (!selectedBoard) return;

        setFilteringIssues(true);
        try {
            if ((activeTab === 'board' || activeTab === 'timeline') && activeSprint) {
                // Filter sprint issues by assignee for both board and timeline tabs
                const sprintIssues = await jiraApi.getSprintIssues(
                    selectedBoard.id,
                    activeSprint.id,
                    assignee
                );
                setIssues(sprintIssues);
            } else if (activeTab === 'backlog') {
                // Filter backlog issues by assignee
                const backlog = await jiraApi.getBacklogIssues(
                    selectedBoard.id,
                    assignee
                );
                setBacklogIssues(backlog);

                // Also load all sprint issues with the assignee filter for backlog view
                const allSprintIssues: JiraIssue[] = [];
                const issueKeys = new Set<string>();
                for (const sprint of sprints) {
                    try {
                        const sprintIssues = await jiraApi.getSprintIssues(
                            selectedBoard.id,
                            sprint.id,
                            assignee
                        );
                        // Deduplicate by issue key
                        sprintIssues.forEach(issue => {
                            if (!issueKeys.has(issue.key)) {
                                issueKeys.add(issue.key);
                                allSprintIssues.push(issue);
                            }
                        });
                    } catch (sprintError) {
                        console.error(`Error loading sprint ${sprint.id}:`, sprintError);
                        // Continue loading other sprints
                    }
                }
                setIssues(allSprintIssues);
            }
        } catch (err) {
            console.error('Error filtering issues by assignee:', err);
            setError(err instanceof Error ? err.message : 'Failed to filter issues');
        } finally {
            setFilteringIssues(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setBoardsStartAt(0);
        setHasMoreBoards(true);
        if (selectedBoard) {
            await loadIssuesForBoard(selectedBoard.id);
        } else {
            await loadBoards(true);
        }
        setRefreshing(false);
    };

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

    const renderIssueItem = ({ item }: { item: JiraIssue }) => (
        <IssueCard issue={item} />
    );

    // Get unique assignees from board API
    const assignees = React.useMemo(() => {
        return [
            { key: 'all', name: 'All Assignees' },
            { key: 'unassigned', name: 'Unassigned' },
            ...boardAssignees,
        ];
    }, [boardAssignees]);

    // Filter and search issues
    const filteredIssues = React.useMemo(() => {
        let filtered = activeTab === 'board' ? issues : issues;

        // Exclude Epic issue types from both Board and Backlog
        filtered = filtered.filter(issue =>
            issue.fields.issuetype.name.toLowerCase() !== 'epic'
        );

        // Note: Assignee filtering is now done at API level

        // Search by ticket name or ID
        if (issueSearchQuery.trim()) {
            const query = issueSearchQuery.toLowerCase().trim();
            filtered = filtered.filter(issue =>
                issue.key.toLowerCase().includes(query) ||
                issue.fields.summary.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [issues, issueSearchQuery, activeTab]);

    // Group issues by status for Board view
    const groupedIssues = React.useMemo(() => {
        if (activeTab !== 'board') return [];

        const groups = new Map<string, JiraIssue[]>();

        filteredIssues.forEach(issue => {
            const status = issue.fields.status.name;
            if (!groups.has(status)) {
                groups.set(status, []);
            }
            groups.get(status)!.push(issue);
        });

        return Array.from(groups.entries()).map(([status, items]) => ({
            status,
            data: items,
            statusCategory: items[0]?.fields.status.statusCategory.key || 'default',
        }));
    }, [filteredIssues, activeTab]);

    // Group issues by sprint for Backlog view with pre-calculated stats
    const groupedBySprintIssues = React.useMemo(() => {
        if (activeTab !== 'backlog') return [];

        const groups: {
            sprint: string,
            sprintId: number | null,
            startDate?: string,
            endDate?: string,
            data: JiraIssue[]
        }[] = [];
        const addedIssueKeys = new Set<string>();

        // Get active sprint ID
        const activeSprintId = activeSprint?.id;

        // Add active sprint at the top (always show, even if empty)
        if (activeSprintId) {
            const activeSprintIssues = filteredIssues.filter(issue => {
                if (issue.fields.sprint && issue.fields.sprint.id === activeSprintId && !addedIssueKeys.has(issue.key)) {
                    addedIssueKeys.add(issue.key);
                    return true;
                }
                return false;
            });
            groups.push({
                sprint: activeSprint.name,
                sprintId: activeSprint.id,
                startDate: activeSprint.startDate,
                endDate: activeSprint.endDate,
                data: activeSprintIssues,
            });
        }

        // Group by other sprints (excluding active sprint to avoid duplication)
        // Only show upcoming sprints (exclude closed/completed sprints)
        const otherSprints = sprints
            .filter(sprint => {
                // Exclude active sprint (already shown above)
                if (activeSprintId && sprint.id === activeSprintId) return false;
                // Only include future sprints, exclude closed/completed sprints
                return sprint.state === 'future';
            })
            .sort((a, b) => {
                // Sort by start date if available
                if (a.startDate && b.startDate) {
                    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                }
                if (a.startDate) return -1;
                if (b.startDate) return 1;
                return 0;
            });

        otherSprints.forEach(sprint => {
            const sprintIssues = filteredIssues.filter(issue => {
                if (issue.fields.sprint && issue.fields.sprint.id === sprint.id && !addedIssueKeys.has(issue.key)) {
                    addedIssueKeys.add(issue.key);
                    return true;
                }
                return false;
            });
            // Always show sprint, even if empty
            groups.push({
                sprint: sprint.name,
                sprintId: sprint.id,
                startDate: sprint.startDate,
                endDate: sprint.endDate,
                data: sprintIssues,
            });
        });

        // Add backlog issues (exclude Done status and issues already in sprints)
        const backlog = backlogIssues.filter(issue => {
            // Exclude Epic issue types
            if (issue.fields.issuetype.name.toLowerCase() === 'epic') {
                return false;
            }

            // Apply same filters
            let include = true;

            // Exclude issues with Done status from backlog
            if (issue.fields.status.statusCategory.key === 'done') {
                return false;
            }

            // Exclude issues that already have a sprint assigned
            if (issue.fields.sprint) {
                return false;
            }

            // Note: Assignee filtering is now done at API level

            if (issueSearchQuery.trim()) {
                const query = issueSearchQuery.toLowerCase().trim();
                include = issue.key.toLowerCase().includes(query) ||
                    issue.fields.summary.toLowerCase().includes(query);
            }

            return include;
        });

        if (backlog.length > 0) {
            groups.push({
                sprint: 'Backlog',
                sprintId: null,
                data: backlog,
            });
        }

        return groups;
    }, [filteredIssues, backlogIssues, sprints, activeSprint, activeTab, issueSearchQuery]);

    const handleIssuePress = React.useCallback((issueKey: string) => {
        setSelectedIssueKey(issueKey);
    }, []);

    const handleCreateSprintPress = () => {
        if (!selectedBoard) {
            toast.warning('Please select a board first');
            return;
        }
        sprintManager.setShowCreateModal(true);
    };

    const handleCompleteSprint = async () => {
        if (!activeSprint) return;
        setShowCompleteSprint(true);
    };

    const confirmCompleteSprint = async () => {
        if (!activeSprint) return;
        try {
            setLoading(true);
            setShowCompleteSprint(false);
            await jiraApi.completeSprint(activeSprint.id);
            toast.success('Sprint completed successfully');
            if (selectedBoard) {
                await loadIssuesForBoard(selectedBoard.id);
            }
        } catch (error: any) {
            console.error('Error completing sprint:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to complete sprint');
        } finally {
            setLoading(false);
        }
    };

    const handleBackFromDetails = async () => {
        setSelectedIssueKey(null);
        // Refresh issues to get updated data (e.g., due date changes)
        if (selectedBoard) {
            await filterIssuesByAssignee(selectedAssignee);
        }
    };

    const handleCreateIssue = () => {
        if (!selectedBoard) {
            toast.warning('Please select a board first');
            return;
        }
        setShowCreateIssue(true);
    };

    const handleBackFromCreate = () => {
        setShowCreateIssue(false);
    };

    const toggleSprintCollapse = React.useCallback((sprintKey: string) => {
        setCollapsedSprints(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sprintKey)) {
                newSet.delete(sprintKey);
            } else {
                newSet.add(sprintKey);
            }
            return newSet;
        });
    }, []);

    const collapseAllSprints = React.useCallback(() => {
        const allKeys = new Set<string>();
        groupedBySprintIssues.forEach(group => {
            const sprintKey = group.sprintId ? `sprint-${group.sprintId}` : 'backlog';
            allKeys.add(sprintKey);
        });
        setCollapsedSprints(allKeys);
    }, [groupedBySprintIssues]);

    const expandAllSprints = React.useCallback(() => {
        setCollapsedSprints(new Set());
    }, []);

    const handleIssueCreated = async () => {
        setShowCreateIssue(false);
        if (selectedBoard) {
            await handleRefresh();
        }
    };

    // Show create issue screen
    if (showCreateIssue && selectedBoard) {
        return (
            <CreateIssueScreen
                boardId={selectedBoard.id}
                projectId={selectedBoard.location?.projectKey}
                onBack={handleBackFromCreate}
                onIssueCreated={handleIssueCreated}
            />
        );
    }

    // Show issue details screen if an issue is selected
    if (selectedIssueKey) {
        return (
            <IssueDetailsScreen
                issueKey={selectedIssueKey}
                onBack={handleBackFromDetails}
                onNavigateToIssue={(newIssueKey) => {
                    setSelectedIssueKey(newIssueKey);
                }}
            />
        );
    }

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <LinearGradient
                    colors={['#0052CC', '#4C9AFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.settingsButton} />
                    <Text style={styles.headerTitle}>Jira Board</Text>
                    <View style={styles.settingsButton} />
                </LinearGradient>
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    <View style={{ marginBottom: 16, paddingTop: 16 }}>
                        <SkeletonLoader width="100%" height={48} borderRadius={8} />
                    </View>
                    <ScrollView>
                        <SkeletonList count={4} />
                    </ScrollView>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0052CC', '#4C9AFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <Logo size="small" showText={false} />
                        <View>
                            <Text style={styles.headerTitle}>Jira Management</Text>
                            <Text style={styles.headerSubtitle}>Task Manager</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onOpenSettings} style={styles.settingsButton}>
                        <View style={styles.settingsIconContainer}>
                            <Text style={styles.settingsIcon}>⚙️</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {Platform.OS === 'web' && error && (
                <View style={styles.corsWarning}>
                    <Text style={styles.corsWarningTitle}>⚠️ Web Browser Limitation</Text>
                    <Text style={styles.corsWarningText}>{error}</Text>
                    <Text style={styles.corsWarningSubtext}>
                        To use this app, please run it on iOS or Android, or use Expo Go app on your phone.
                    </Text>
                </View>
            )}

            {boards.length > 0 && (
                <View style={styles.boardSelector}>
                    <View style={styles.boardHeader}>
                        <Text style={styles.boardLabel}>Board:</Text>
                        <TouchableOpacity
                            style={styles.boardDropdownButton}
                            onPress={() => setIsBoardDropdownExpanded(!isBoardDropdownExpanded)}
                        >
                            <View style={styles.boardDropdownContent}>
                                <Text style={styles.boardDropdownText} numberOfLines={1}>
                                    {selectedBoard ? (
                                        <>
                                            {savedDefaultBoardId === selectedBoard.id && '⭐ '}
                                            {selectedBoard.name}
                                            {selectedBoard.type && ` (${selectedBoard.type})`}
                                        </>
                                    ) : (
                                        'Select a board...'
                                    )}
                                </Text>
                                <Text style={styles.boardDropdownIcon}>
                                    {isBoardDropdownExpanded ? '▲' : '▼'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {isBoardDropdownExpanded && (
                        <View style={styles.boardDropdownPanel}>
                            <View style={styles.boardPanelHeader}>
                                <View style={styles.searchContainer}>
                                    <Text style={styles.searchIcon}>🔍</Text>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search boards..."
                                        placeholderTextColor="#A5ADBA"
                                        value={searchQuery}
                                        onChangeText={handleBoardSearch}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => handleBoardSearch('')} style={styles.clearButton}>
                                            <Text style={styles.clearButtonText}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <View style={styles.filterChipsContainer}>
                                    <TouchableOpacity
                                        style={[styles.filterChipSmall, boardTypeFilter === 'all' && styles.filterChipSmallActive]}
                                        onPress={() => handleBoardTypeFilterChange('all')}
                                    >
                                        <Text style={[styles.filterChipSmallText, boardTypeFilter === 'all' && styles.filterChipSmallTextActive]}>
                                            📊 All
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.filterChipSmall, boardTypeFilter === 'scrum' && styles.filterChipSmallActive]}
                                        onPress={() => handleBoardTypeFilterChange('scrum')}
                                    >
                                        <Text style={[styles.filterChipSmallText, boardTypeFilter === 'scrum' && styles.filterChipSmallTextActive]}>
                                            🏃 Scrum
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.filterChipSmall, boardTypeFilter === 'kanban' && styles.filterChipSmallActive]}
                                        onPress={() => handleBoardTypeFilterChange('kanban')}
                                    >
                                        <Text style={[styles.filterChipSmallText, boardTypeFilter === 'kanban' && styles.filterChipSmallTextActive]}>
                                            📋 Kanban
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {searchingBoards ? (
                                <View style={styles.searchingContainer}>
                                    <ActivityIndicator color="#0052CC" />
                                    <Text style={styles.searchingText}>Searching boards...</Text>
                                </View>
                            ) : loading && boards.length === 0 ? (
                                <ActivityIndicator color="#0052CC" style={styles.dropdownLoader} />
                            ) : boards.length > 0 ? (
                                <FlatList
                                    ref={boardListRef}
                                    data={boards}
                                    keyExtractor={(item) => item.id.toString()}
                                    style={styles.boardDropdownList}
                                    scrollEnabled={true}
                                    nestedScrollEnabled={true}
                                    onEndReached={loadMoreBoards}
                                    onEndReachedThreshold={0.5}
                                    renderItem={({ item }) => {
                                        const matchesFilter = boardTypeFilter === 'all' ||
                                            (boardTypeFilter === 'scrum' && item.type?.toLowerCase() !== 'kanban') ||
                                            (boardTypeFilter === 'kanban' && item.type?.toLowerCase() === 'kanban');

                                        if (!matchesFilter) return null;

                                        return (
                                            <TouchableOpacity
                                                style={[
                                                    styles.boardDropdownItem,
                                                    selectedBoard?.id === item.id && styles.boardDropdownItemSelected,
                                                ]}
                                                onPress={() => handleBoardSelect(item)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.boardDropdownItemLeft}>
                                                    <View style={[
                                                        styles.boardTypeIcon,
                                                        item.type?.toLowerCase() === 'kanban' ? styles.boardTypeIconKanban : styles.boardTypeIconScrum
                                                    ]}>
                                                        <Text style={styles.boardTypeIconText}>
                                                            {item.type?.toLowerCase() === 'kanban' ? '📋' : '🏃'}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.boardDropdownItemContent}>
                                                        <View style={styles.boardNameRow}>
                                                            {savedDefaultBoardId === item.id && (
                                                                <View style={styles.defaultBoardBadge}>
                                                                    <Text style={styles.defaultBoardBadgeText}>⭐</Text>
                                                                </View>
                                                            )}
                                                            <Text style={[
                                                                styles.boardDropdownItemName,
                                                                selectedBoard?.id === item.id && styles.boardDropdownItemNameSelected,
                                                            ]} numberOfLines={2}>
                                                                {item.name}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.boardDropdownItemMeta}>
                                                            {item.type && (
                                                                <View style={styles.boardTypeBadge}>
                                                                    <Text style={styles.boardDropdownItemType}>
                                                                        {item.type}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            {item.location?.projectName && (
                                                                <Text style={styles.boardDropdownItemProject} numberOfLines={1}>
                                                                    📁 {item.location.projectName}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>
                                                {selectedBoard?.id === item.id && (
                                                    <View style={styles.selectedCheckContainer}>
                                                        <Text style={styles.boardDropdownCheckmark}>✓</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    }}
                                    ListFooterComponent={() => {
                                        if (loadingMoreBoards) {
                                            return (
                                                <View style={styles.loadingMoreContainer}>
                                                    <ActivityIndicator size="small" color="#0052CC" />
                                                    <Text style={styles.loadingMoreText}>Loading more...</Text>
                                                </View>
                                            );
                                        }
                                        if (!hasMoreBoards && boards.length > 0) {
                                            return (
                                                <Text style={styles.endOfListText}>All boards loaded</Text>
                                            );
                                        }
                                        return null;
                                    }}
                                    ListEmptyComponent={
                                        <View style={styles.emptyDropdownState}>
                                            <Text style={styles.emptyDropdownText}>No boards found</Text>
                                        </View>
                                    }
                                />
                            ) : (
                                <View style={styles.emptyDropdownState}>
                                    <Text style={styles.emptyDropdownIcon}>🔍</Text>
                                    <Text style={styles.emptyDropdownText}>
                                        {searchQuery ? `No boards match "${searchQuery}"` : 'No boards found'}
                                    </Text>
                                    {searchQuery && (
                                        <TouchableOpacity
                                            style={styles.clearSearchButton}
                                            onPress={() => handleBoardSearch('')}
                                        >
                                            <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}

            <View style={styles.issuesContainer}>
                {selectedBoard && (
                    <>
                        {selectedBoard.type?.toLowerCase() !== 'kanban' && sprints.length > 0 && (
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'board' && styles.tabActive]}
                                    onPress={() => handleTabChange('board')}
                                >
                                    <Text style={[styles.tabText, activeTab === 'board' && styles.tabTextActive]}>
                                        📋 Board
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'backlog' && styles.tabActive]}
                                    onPress={() => handleTabChange('backlog')}
                                >
                                    <Text style={[styles.tabText, activeTab === 'backlog' && styles.tabTextActive]}>
                                        📦 Backlog
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'timeline' && styles.tabActive]}
                                    onPress={() => handleTabChange('timeline')}
                                >
                                    <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
                                        📅 Timeline
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Active Sprint Info Card - Show only on Board tab for non-Kanban boards */}
                        {activeTab === 'board' && activeSprint && selectedBoard.type?.toLowerCase() !== 'kanban' && (
                            <View style={styles.sprintInfoCard}>
                                <View style={styles.sprintInfoHeader}>
                                    <Text style={styles.sprintInfoTitle}>🏃 {activeSprint.name}</Text>
                                    <TouchableOpacity
                                        style={styles.completeSprintButton}
                                        onPress={handleCompleteSprint}
                                    >
                                        <Text style={styles.completeSprintButtonText}>✓ Complete Sprint</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.sprintInfoDates}>
                                    {activeSprint.startDate && (
                                        <View style={styles.sprintDateItem}>
                                            <Text style={styles.sprintDateLabel}>Start Date:</Text>
                                            <Text style={styles.sprintDateValue}>
                                                {new Date(activeSprint.startDate).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </Text>
                                        </View>
                                    )}
                                    {activeSprint.endDate && (
                                        <View style={styles.sprintDateItem}>
                                            <Text style={styles.sprintDateLabel}>End Date:</Text>
                                            <Text style={styles.sprintDateValue}>
                                                {new Date(activeSprint.endDate).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        <View style={styles.issuesHeader}>
                            <Text style={styles.sectionTitle}>
                                {selectedBoard.type?.toLowerCase() !== 'kanban'
                                    ? (activeTab === 'board' ? 'Active Sprint' : 'All Sprints')
                                    : 'All Issues'
                                } ({filteredIssues.length + (activeTab === 'backlog' ? backlogIssues.filter(issue => {
                                    let include = true;
                                    // Note: Assignee filtering is now done at API level
                                    if (issueSearchQuery.trim()) {
                                        const query = issueSearchQuery.toLowerCase().trim();
                                        include = issue.key.toLowerCase().includes(query) || issue.fields.summary.toLowerCase().includes(query);
                                    }
                                    return include;
                                }).length : 0)})
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {activeTab === 'backlog' && selectedBoard.type?.toLowerCase() !== 'kanban' && (
                                    <TouchableOpacity
                                        style={styles.createSprintButton}
                                        onPress={handleCreateSprintPress}
                                    >
                                        <Text style={styles.createSprintButtonIcon}>+</Text>
                                        <Text style={styles.createSprintButtonText}>Sprint</Text>
                                    </TouchableOpacity>
                                )}
                                {activeTab !== 'timeline' && (
                                    <TouchableOpacity
                                        style={styles.createButton}
                                        onPress={handleCreateIssue}
                                    >
                                        <Text style={styles.createButtonIcon}>+</Text>
                                        <Text style={styles.createButtonText}>Create</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </>
                )}

                {selectedBoard && (
                    <>
                        <View style={styles.searchContainer}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by ticket ID or name..."
                                placeholderTextColor="#A5ADBA"
                                value={issueSearchQuery}
                                onChangeText={setIssueSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {issueSearchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setIssueSearchQuery('')} style={styles.clearButton}>
                                    <Text style={styles.clearButtonText}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {activeTab === 'board' && selectedBoard && (
                            <AssigneeFilter
                                assignees={assignees}
                                selectedAssignee={selectedAssignee}
                                onSelectAssignee={handleAssigneeChange}
                            />
                        )}
                    </>
                )}

                {activeTab === 'backlog' && selectedBoard && (
                    <>
                        <AssigneeFilter
                            assignees={assignees}
                            selectedAssignee={selectedAssignee}
                            onSelectAssignee={handleAssigneeChange}
                        />
                        {groupedBySprintIssues.length > 1 && (
                            <View style={styles.sprintControlsContainer}>
                                <TouchableOpacity
                                    style={styles.sprintControlButton}
                                    onPress={expandAllSprints}
                                >
                                    <Text style={styles.sprintControlText}>▼ Expand All</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.sprintControlButton}
                                    onPress={collapseAllSprints}
                                >
                                    <Text style={styles.sprintControlText}>▶ Collapse All</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}

                {error && boards.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>😔 Cannot Load Boards</Text>
                        <Text style={styles.emptySubtext}>{error}</Text>
                    </View>
                ) : issues.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No issues found</Text>
                        <Text style={styles.emptySubtext}>
                            {selectedBoard ? 'This board has no issues' : 'Select a board to view issues'}
                        </Text>
                    </View>
                ) : filteredIssues.length === 0 && (activeTab === 'backlog' ? backlogIssues.length === 0 : true) ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No issues match filter</Text>
                        <Text style={styles.emptySubtext}>
                            Try adjusting your search or filter criteria
                        </Text>
                    </View>
                ) : (
                    <View style={{ flex: 1, position: 'relative' }}>
                        {filteringIssues && (
                            <View style={styles.filteringOverlay}>
                                <View style={styles.filteringBox}>
                                    <ActivityIndicator size="large" color="#0052CC" />
                                    <Text style={styles.filteringText}>Filtering...</Text>
                                </View>
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            {activeTab === 'timeline' ? (
                                // Timeline Chart View
                                activeSprint ? (
                                    <ScrollView
                                        style={styles.timelineContainer}
                                        refreshControl={
                                            <RefreshControl
                                                refreshing={refreshing}
                                                onRefresh={handleRefresh}
                                                colors={['#0052CC']}
                                            />
                                        }
                                    >
                                        <View style={styles.timelineHeader}>
                                            <Text style={styles.timelineTitle}>Sprint Timeline Chart</Text>
                                            <Text style={styles.timelineSubtitle}>
                                                {activeSprint.name}
                                            </Text>
                                        </View>

                                        {/* Sprint Date Range */}
                                        {activeSprint.startDate && activeSprint.endDate && (
                                            <View style={styles.chartDateRange}>
                                                <View style={styles.chartDateItem}>
                                                    <Text style={styles.chartDateLabel}>Start Date</Text>
                                                    <Text style={styles.chartDateValue}>
                                                        {new Date(activeSprint.startDate).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </Text>
                                                </View>
                                                <View style={styles.chartDateDivider} />
                                                <View style={styles.chartDateItem}>
                                                    <Text style={styles.chartDateLabel}>End Date</Text>
                                                    <Text style={styles.chartDateValue}>
                                                        {new Date(activeSprint.endDate).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Timeline Chart */}
                                        {activeSprint.startDate && activeSprint.endDate && (
                                            <View style={styles.timelineChart}>
                                                {/* Timeline Bar */}
                                                <View style={styles.timelineBar}>
                                                    {/* Progress indicator */}
                                                    {(() => {
                                                        const startDate = new Date(activeSprint.startDate).getTime();
                                                        const endDate = new Date(activeSprint.endDate).getTime();
                                                        const today = new Date().getTime();
                                                        const totalDuration = endDate - startDate;
                                                        const elapsed = today - startDate;
                                                        const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

                                                        return (
                                                            <>
                                                                <View style={[styles.timelineProgress, { width: `${progress}%` }]} />
                                                                <View style={[styles.timelineCurrentMarker, { left: `${progress}%` }]}>
                                                                    <View style={styles.timelineCurrentDot} />
                                                                    <Text style={styles.timelineCurrentText}>Today</Text>
                                                                </View>
                                                            </>
                                                        );
                                                    })()}
                                                </View>
                                            </View>
                                        )}

                                        {/* Issues List */}
                                        {issues.length === 0 ? (
                                            <View style={styles.emptyState}>
                                                <Text style={styles.emptyText}>No issues in active sprint</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.chartIssuesList}>
                                                {issues
                                                    .filter(issue => issue.fields.issuetype.name.toLowerCase() !== 'epic')
                                                    .sort((a, b) => {
                                                        // Sort by due date, then by status
                                                        const aDate = a.fields.duedate ? new Date(a.fields.duedate).getTime() : Infinity;
                                                        const bDate = b.fields.duedate ? new Date(b.fields.duedate).getTime() : Infinity;
                                                        return aDate - bDate;
                                                    })
                                                    .map(issue => {
                                                        const dueDate = issue.fields.duedate ? new Date(issue.fields.duedate) : null;
                                                        const sprintStartDate = activeSprint.startDate ? new Date(activeSprint.startDate) : null;
                                                        const sprintEndDate = activeSprint.endDate ? new Date(activeSprint.endDate.split('T')[0]) : null;
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);

                                                        // Issue is overdue if: due date is past today OR due date is after sprint end date
                                                        const isOverdue = dueDate && (
                                                            dueDate.getTime() < today.getTime() ||
                                                            (sprintEndDate && dueDate > sprintEndDate)
                                                        );
                                                        const noDueDate = !issue.fields.duedate;

                                                        // Calculate position on timeline
                                                        let position = 0;
                                                        if (dueDate && sprintStartDate && sprintEndDate) {
                                                            const totalDuration = sprintEndDate.getTime() - sprintStartDate.getTime();
                                                            const issueOffset = dueDate.getTime() - sprintStartDate.getTime();
                                                            position = Math.max(0, Math.min(100, (issueOffset / totalDuration) * 100));
                                                        }

                                                        return (
                                                            <TouchableOpacity
                                                                key={issue.key}
                                                                style={styles.chartIssueItem}
                                                                onPress={() => handleIssuePress(issue.key)}
                                                            >
                                                                <View style={styles.chartIssueContent}>
                                                                    <View style={styles.chartIssueHeader}>
                                                                        <Text style={styles.chartIssueKey}>{issue.key}</Text>
                                                                        <View style={[
                                                                            styles.chartStatusBadge,
                                                                            { backgroundColor: getStatusColor(issue.fields.status.statusCategory.key || 'default') }
                                                                        ]}>
                                                                            <Text style={styles.chartStatusText}>{issue.fields.status.name}</Text>
                                                                        </View>
                                                                    </View>

                                                                    <Text style={styles.chartIssueSummary} numberOfLines={2}>
                                                                        {issue.fields.summary}
                                                                    </Text>

                                                                    <View style={styles.chartIssueMeta}>
                                                                        {issue.fields.assignee && (
                                                                            <View style={styles.chartAssigneeContainer}>
                                                                                {issue.fields.assignee.avatarUrls?.['48x48'] ? (
                                                                                    <Image
                                                                                        source={{ uri: issue.fields.assignee.avatarUrls['48x48'] }}
                                                                                        style={styles.chartAssigneeAvatar}
                                                                                    />
                                                                                ) : (
                                                                                    <View style={styles.chartAssigneeAvatarPlaceholder}>
                                                                                        <Text style={styles.chartAssigneeAvatarText}>
                                                                                            {issue.fields.assignee.displayName.charAt(0).toUpperCase()}
                                                                                        </Text>
                                                                                    </View>
                                                                                )}
                                                                                <Text style={styles.chartMetaText}>
                                                                                    {issue.fields.assignee.displayName}
                                                                                </Text>
                                                                            </View>
                                                                        )}
                                                                        {issue.fields.duedate && (
                                                                            <Text style={[styles.chartMetaText, isOverdue && styles.overdueText]}>
                                                                                📅 {new Date(issue.fields.duedate).toLocaleDateString('en-US', {
                                                                                    month: 'short',
                                                                                    day: 'numeric'
                                                                                })}
                                                                            </Text>
                                                                        )}
                                                                    </View>

                                                                    {/* Timeline Position Bar */}
                                                                    <View style={styles.chartIssueTimeline}>
                                                                        {noDueDate ? (
                                                                            <View style={styles.chartNoDueDateBar}>
                                                                                <Text style={styles.chartNoDueDateText}>⏰ No Due Date</Text>
                                                                            </View>
                                                                        ) : (
                                                                            <>
                                                                                <View style={styles.chartIssueTrack}>
                                                                                    <View
                                                                                        style={[
                                                                                            styles.chartIssueDot,
                                                                                            {
                                                                                                left: `${position}%`,
                                                                                                backgroundColor: isOverdue ? '#DE350B' : '#0052CC'
                                                                                            }
                                                                                        ]}
                                                                                    />
                                                                                </View>
                                                                                {isOverdue && (
                                                                                    <View style={styles.chartOverdueBadge}>
                                                                                        <Text style={styles.chartOverdueText}>⚠️ Overdue</Text>
                                                                                    </View>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </View>
                                                                </View>
                                                            </TouchableOpacity>
                                                        );
                                                    })
                                                }
                                            </View>
                                        )}
                                    </ScrollView>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No active sprint</Text>
                                        <Text style={styles.emptySubtext}>
                                            Please activate a sprint to view the timeline
                                        </Text>
                                    </View>
                                )
                            ) : (selectedBoard?.type?.toLowerCase() === 'kanban' || activeTab === 'board') ? (
                                <FlatList
                                    data={groupedIssues}
                                    keyExtractor={(item) => item.status}
                                    renderItem={({ item: group }) => (
                                        <View style={styles.statusGroup}>
                                            <View style={[styles.statusGroupHeader, { borderLeftColor: getStatusColor(group.statusCategory) }]}>
                                                <Text style={styles.statusGroupTitle}>{group.status}</Text>
                                                <Text style={styles.statusGroupCount}>({group.data.length})</Text>
                                            </View>
                                            <FlatList
                                                data={group.data}
                                                keyExtractor={(issue) => issue.key}
                                                renderItem={({ item: issue }) => (
                                                    <IssueCard issue={issue} onPress={() => handleIssuePress(issue.key)} />
                                                )}
                                                scrollEnabled={false}
                                                initialNumToRender={10}
                                                maxToRenderPerBatch={10}
                                                windowSize={5}
                                                removeClippedSubviews={true}
                                            />
                                        </View>
                                    )}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={handleRefresh}
                                            colors={['#0052CC']}
                                        />
                                    }
                                    initialNumToRender={5}
                                    maxToRenderPerBatch={5}
                                    windowSize={5}
                                    removeClippedSubviews={true}
                                    contentContainerStyle={styles.issuesList}
                                />
                            ) : (
                                <FlatList
                                    data={groupedBySprintIssues}
                                    keyExtractor={(item, index) => item.sprintId ? `sprint-${item.sprintId}` : `backlog-${index}`}
                                    renderItem={({ item: group }) => {
                                        const sprintKey = group.sprintId ? `sprint-${group.sprintId}` : 'backlog';
                                        const isCollapsed = collapsedSprints.has(sprintKey);
                                        const isBacklog = group.sprint === 'Backlog';
                                        const isActiveSprint = group.sprintId === activeSprint?.id;

                                        // Calculate stats lazily - only when expanded
                                        const stats = !isCollapsed ? {
                                            done: group.data.filter(i => i.fields.status.statusCategory.key === 'done').length,
                                            inProgress: group.data.filter(i => i.fields.status.statusCategory.key === 'indeterminate').length,
                                            todo: group.data.filter(i =>
                                                i.fields.status.statusCategory.key !== 'done' &&
                                                i.fields.status.statusCategory.key !== 'indeterminate'
                                            ).length,
                                        } : null;

                                        // Calculate issue stats
                                        const doneCount = group.data.filter(i => i.fields.status.statusCategory.key === 'done').length;
                                        const inProgressCount = group.data.filter(i => i.fields.status.statusCategory.key === 'indeterminate').length;
                                        const todoCount = group.data.filter(i =>
                                            i.fields.status.statusCategory.key !== 'done' &&
                                            i.fields.status.statusCategory.key !== 'indeterminate'
                                        ).length;

                                        return (
                                            <View style={styles.sprintSection}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.sprintGroupHeader,
                                                        isActiveSprint && styles.activeSprintHeader,
                                                        isBacklog && styles.backlogHeader
                                                    ]}
                                                    onPress={() => toggleSprintCollapse(sprintKey)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.sprintHeaderLeft}>
                                                        <Text style={styles.sprintCollapseIcon}>
                                                            {isCollapsed ? '▶' : '▼'}
                                                        </Text>
                                                        <View style={styles.sprintTitleContainer}>
                                                            <Text style={[
                                                                styles.sprintGroupTitle,
                                                                isActiveSprint && styles.activeSprintTitle
                                                            ]}>
                                                                {isBacklog ? '📋' : isActiveSprint ? '⚡' : '🏃'} {group.sprint}
                                                            </Text>
                                                            {isActiveSprint && (
                                                                <View style={styles.activeSprintBadge}>
                                                                    <Text style={styles.activeSprintBadgeText}>ACTIVE</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                    <View style={styles.sprintHeaderRight}>
                                                        {!isBacklog && group.sprintId && (
                                                            <TouchableOpacity
                                                                style={styles.sprintOptionsButton}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    sprintManager.handleSprintOptions(group.sprintId!, group.sprint, group.startDate, group.endDate);
                                                                }}
                                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                            >
                                                                <Text style={styles.sprintOptionsIcon}>⋮</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {stats && (
                                                            <View style={styles.sprintStats}>
                                                                {stats.done > 0 && (
                                                                    <View style={styles.statBadge}>
                                                                        <Text style={styles.statIcon}>✓</Text>
                                                                        <Text style={styles.statText}>{stats.done}</Text>
                                                                    </View>
                                                                )}
                                                                {stats.inProgress > 0 && (
                                                                    <View style={[styles.statBadge, styles.statBadgeProgress]}>
                                                                        <Text style={styles.statIcon}>⏳</Text>
                                                                        <Text style={styles.statText}>{stats.inProgress}</Text>
                                                                    </View>
                                                                )}
                                                                {stats.todo > 0 && (
                                                                    <View style={[styles.statBadge, styles.statBadgeTodo]}>
                                                                        <Text style={styles.statIcon}>⭘</Text>
                                                                        <Text style={styles.statText}>{stats.todo}</Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        )}
                                                        <Text style={styles.statusGroupCount}>{group.data.length}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                                {!isCollapsed && (
                                                    <FlatList
                                                        data={group.data}
                                                        keyExtractor={(issue) => issue.key}
                                                        renderItem={({ item: issue }) => (
                                                            <IssueCard issue={issue} onPress={() => handleIssuePress(issue.key)} />
                                                        )}
                                                        scrollEnabled={false}
                                                        initialNumToRender={10}
                                                        maxToRenderPerBatch={10}
                                                        windowSize={5}
                                                        removeClippedSubviews={true}
                                                        style={styles.sprintIssuesContainer}
                                                    />
                                                )}
                                            </View>
                                        );
                                    }}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={handleRefresh}
                                            colors={['#0052CC']}
                                        />
                                    }
                                    initialNumToRender={3}
                                    maxToRenderPerBatch={3}
                                    windowSize={5}
                                    removeClippedSubviews={true}
                                    contentContainerStyle={styles.issuesList}
                                />
                            )}
                        </View>
                    </View>
                )}
            </View>

            {/* Sprint Modals */}
            <CreateSprintModal
                visible={sprintManager.showCreateModal}
                onClose={() => sprintManager.setShowCreateModal(false)}
                onCreate={sprintManager.handleCreateSprint}
                creating={sprintManager.creating}
            />

            <SprintOptionsModal
                visible={sprintManager.showOptionsModal}
                sprintName={sprintManager.selectedSprint?.name || ''}
                onClose={() => sprintManager.setShowOptionsModal(false)}
                onUpdate={sprintManager.handleOpenUpdate}
                onDelete={sprintManager.handleDeleteSprint}
                deleting={sprintManager.deleting}
            />

            <UpdateSprintModal
                visible={sprintManager.showUpdateModal}
                initialName={sprintManager.selectedSprint?.name || ''}
                initialStartDate={
                    sprintManager.selectedSprint?.startDate
                        ? new Date(sprintManager.selectedSprint.startDate)
                        : null
                }
                initialEndDate={
                    sprintManager.selectedSprint?.endDate
                        ? new Date(sprintManager.selectedSprint.endDate)
                        : null
                }
                onClose={() => sprintManager.setShowUpdateModal(false)}
                onUpdate={sprintManager.handleUpdateSprint}
                updating={sprintManager.updating}
            />

            {/* Sprint Delete Confirmation Modal */}
            <Modal
                visible={showDeleteConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeleteConfirm(false)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmDialog}>
                        <Text style={styles.confirmTitle}>Delete Sprint</Text>
                        <Text style={styles.confirmMessage}>
                            Are you sure you want to delete "{sprintToDelete?.name}"? This action cannot be undone.
                        </Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmButtonCancel]}
                                onPress={() => {
                                    setShowDeleteConfirm(false);
                                    setSprintToDelete(null);
                                }}
                            >
                                <Text style={styles.confirmButtonTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmButtonDelete]}
                                onPress={() => {
                                    if (sprintToDelete) {
                                        sprintToDelete.onConfirm();
                                    }
                                    setShowDeleteConfirm(false);
                                    setSprintToDelete(null);
                                }}
                            >
                                <Text style={styles.confirmButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Complete Sprint Confirmation Modal */}
            <Modal
                visible={showCompleteSprint}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCompleteSprint(false)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmDialog}>
                        <Text style={styles.confirmTitle}>Complete Sprint</Text>
                        <Text style={styles.confirmMessage}>
                            Are you sure you want to complete "{activeSprint?.name}"?
                        </Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmButtonCancel]}
                                onPress={() => setShowCompleteSprint(false)}
                            >
                                <Text style={styles.confirmButtonTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmButtonComplete]}
                                onPress={confirmCompleteSprint}
                            >
                                <Text style={styles.confirmButtonText}>Complete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
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
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    header: {
        backgroundColor: '#0052CC',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#B3D4FF',
        marginTop: 1,
        fontWeight: '500',
    },
    settingsButton: {
        padding: 5,
    },
    settingsIconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        padding: 8,
    },
    settingsIcon: {
        fontSize: 24,
    },
    corsWarning: {
        backgroundColor: '#FFE5E5',
        borderLeftWidth: 4,
        borderLeftColor: '#DE350B',
        padding: 15,
        margin: 15,
        borderRadius: 8,
    },
    corsWarningTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#BF2600',
        marginBottom: 8,
    },
    corsWarningText: {
        fontSize: 14,
        color: '#BF2600',
        lineHeight: 20,
        marginBottom: 8,
    },
    corsWarningSubtext: {
        fontSize: 13,
        color: '#BF2600',
        lineHeight: 18,
        fontStyle: 'italic',
    },
    boardSelector: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    boardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    boardLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B778C',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    boardDropdownButton: {
        flex: 1,
        backgroundColor: '#FAFBFC',
        borderWidth: 1,
        borderColor: '#E1E4E8',
        borderRadius: 10,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    boardDropdownContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    boardDropdownText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#172B4D',
        marginRight: 8,
    },
    boardDropdownIcon: {
        fontSize: 12,
        color: '#5E6C84',
    },
    boardDropdownPanel: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        overflow: 'hidden',
        marginHorizontal: 16,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
    },
    boardPanelHeader: {
        backgroundColor: '#F9FAFB',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E8EBED',
    },
    filterChipsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 8,
        gap: 8,
    },
    filterChipSmall: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F4F5F7',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    filterChipSmallActive: {
        backgroundColor: '#0052CC',
        borderColor: '#0052CC',
    },
    filterChipSmallText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5E6C84',
    },
    filterChipSmallTextActive: {
        color: '#FFFFFF',
    },
    boardDropdownList: {
        maxHeight: 350,
    },
    boardDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
        backgroundColor: '#fff',
    },
    boardDropdownItemSelected: {
        backgroundColor: '#E6F2FF',
        borderLeftWidth: 4,
        borderLeftColor: '#0052CC',
    },
    boardDropdownItemLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    boardTypeIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    boardTypeIconScrum: {
        backgroundColor: '#E6F2FF',
    },
    boardTypeIconKanban: {
        backgroundColor: '#FFF4E6',
    },
    boardTypeIconText: {
        fontSize: 18,
    },
    boardDropdownItemContent: {
        flex: 1,
    },
    boardNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    defaultBoardBadge: {
        backgroundColor: '#FFF4E6',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    defaultBoardBadgeText: {
        fontSize: 12,
    },
    boardDropdownItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
        flex: 1,
    },
    boardDropdownItemNameSelected: {
        color: '#0052CC',
        fontWeight: '700',
    },
    boardDropdownItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    boardTypeBadge: {
        backgroundColor: '#F4F5F7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    boardDropdownItemType: {
        fontSize: 11,
        color: '#5E6C84',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    boardDropdownItemProject: {
        fontSize: 12,
        color: '#7A869A',
        flex: 1,
    },
    selectedCheckContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    boardDropdownCheckmark: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    dropdownLoader: {
        padding: 30,
    },
    searchingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        gap: 12,
    },
    searchingText: {
        fontSize: 14,
        color: '#5E6C84',
        fontStyle: 'italic',
    },
    emptyDropdownState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyDropdownIcon: {
        fontSize: 48,
        marginBottom: 12,
        opacity: 0.3,
    },
    emptyDropdownText: {
        fontSize: 15,
        color: '#5E6C84',
        textAlign: 'center',
        marginBottom: 16,
    },
    clearSearchButton: {
        backgroundColor: '#0052CC',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 8,
    },
    clearSearchButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    loadingMoreContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
    },
    loadingMoreText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#5E6C84',
    },
    endOfListText: {
        padding: 15,
        textAlign: 'center',
        color: '#A5ADBA',
        fontSize: 13,
        fontStyle: 'italic',
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
    },
    loadMoreButtonText: {
        color: '#0052CC',
        fontSize: 13,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 20,
        marginVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderColor: '#E1E4E8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 15,
        color: '#172B4D',
    },
    clearButton: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: 18,
        color: '#5E6C84',
        fontWeight: '600',
    },
    emptySearchState: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    emptySearchText: {
        fontSize: 14,
        color: '#5E6C84',
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#172B4D',
        letterSpacing: 0.3,
    },
    issuesContainer: {
        flex: 1,
        paddingTop: 0,
    },
    sprintInfoCard: {
        backgroundColor: '#F0F7FF',
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 8,
        padding: 18,
        borderRadius: 14,
        borderLeftWidth: 4,
        borderLeftColor: '#0052CC',
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sprintInfoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sprintInfoTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#172B4D',
        flex: 1,
    },
    completeSprintButton: {
        backgroundColor: '#0052CC',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 12,
    },
    completeSprintButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    sprintInfoDates: {
        flexDirection: 'row',
        gap: 20,
    },
    sprintDateItem: {
        flex: 1,
    },
    sprintDateLabel: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '600',
        marginBottom: 4,
    },
    sprintDateValue: {
        fontSize: 14,
        color: '#172B4D',
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        marginBottom: -1,
    },
    tabActive: {
        borderBottomColor: '#0052CC',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B778C',
        letterSpacing: 0.2,
    },
    tabTextActive: {
        color: '#0052CC',
        fontWeight: '700',
    },
    issuesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    filterContainer: {
        backgroundColor: '#FAFBFC',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    sprintControlsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#FAFBFC',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        gap: 10,
    },
    sprintControlButton: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    sprintControlText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5E6C84',
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: '#5E6C84',
        marginBottom: 8,
    },
    filterList: {
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 22,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#E1E4E8',
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    filterChipSelected: {
        backgroundColor: '#0052CC',
        borderColor: '#0052CC',
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#42526E',
        letterSpacing: 0.2,
    },
    filterChipTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    statusGroup: {
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    statusGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    statusGroupTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#172B4D',
        flex: 1,
        letterSpacing: 0.3,
    },
    statusGroupCount: {
        fontSize: 12,
        fontWeight: '700',
        color: '#5E6C84',
        backgroundColor: '#F4F5F7',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        overflow: 'hidden',
    },
    sprintSection: {
        marginBottom: 16,
    },
    sprintGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#E6FCFF',
        borderRadius: 12,
        marginBottom: 2,
        borderLeftWidth: 5,
        borderLeftColor: '#00B8D9',
        borderWidth: 1,
        borderColor: '#B3F5FF',
        shadowColor: '#00B8D9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    activeSprintHeader: {
        backgroundColor: '#FFF3CD',
        borderLeftColor: '#FFA500',
        borderColor: '#FFE699',
        shadowColor: '#FFA500',
    },
    backlogHeader: {
        backgroundColor: '#F4F5F7',
        borderLeftColor: '#6B778C',
        borderColor: '#DFE1E6',
        shadowColor: '#6B778C',
    },
    sprintHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10,
    },
    sprintHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sprintCollapseIcon: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '700',
        width: 16,
    },
    sprintTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    sprintGroupTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#00638A',
    },
    activeSprintTitle: {
        color: '#FF8B00',
    },
    activeSprintBadge: {
        backgroundColor: '#FFA500',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    activeSprintBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },
    sprintStats: {
        flexDirection: 'row',
        gap: 6,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3FCEF',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 3,
    },
    statBadgeProgress: {
        backgroundColor: '#FFF4E6',
    },
    statBadgeTodo: {
        backgroundColor: '#EAE6FF',
    },
    statIcon: {
        fontSize: 10,
    },
    statText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#172B4D',
    },
    sprintIssuesContainer: {
        paddingTop: 8,
    },
    issuesList: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 24,
    },
    issueCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    issueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    issueKey: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0052CC',
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
        color: '#fff',
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    issueSummary: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
        marginBottom: 10,
    },
    issueFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    issueType: {
        fontSize: 12,
        color: '#5E6C84',
        backgroundColor: '#F4F5F7',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
        fontWeight: '600',
        overflow: 'hidden',
    },
    assignee: {
        fontSize: 12,
        color: '#666',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: 30,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#42526E',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    emptySubtext: {
        fontSize: 15,
        color: '#5E6C84',
        textAlign: 'center',
        lineHeight: 22,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0052CC',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    createButtonIcon: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginRight: 6,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    createSprintButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#36B37E',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        shadowColor: '#36B37E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    createSprintButtonIcon: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginRight: 6,
    },
    createSprintButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E1E4E8',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#172B4D',
    },
    modalCloseButton: {
        fontSize: 24,
        color: '#666',
        fontWeight: '300',
    },
    modalBody: {
        padding: 20,
    },
    modalField: {
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 8,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#172B4D',
        backgroundColor: '#FAFBFC',
    },
    modalTextArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    datePickerButton: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FAFBFC',
    },
    datePickerText: {
        fontSize: 15,
        color: '#172B4D',
    },
    datePickerContainer: {
        marginTop: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E1E4E8',
    },
    datePickerHeader: {
        backgroundColor: '#F4F5F7',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E1E4E8',
    },
    datePickerHeaderText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
        textAlign: 'center',
    },
    datePickerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#E1E4E8',
        backgroundColor: '#FAFBFC',
    },
    datePickerCancelButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#F4F5F7',
        alignItems: 'center',
    },
    datePickerCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#5E6C84',
    },
    datePickerConfirmButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#0052CC',
        alignItems: 'center',
    },
    datePickerConfirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    datePickerDoneButton: {
        backgroundColor: '#0052CC',
        padding: 12,
        alignItems: 'center',
    },
    datePickerDoneText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E1E4E8',
    },
    modalCancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#F4F5F7',
    },
    modalCancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#42526E',
    },
    modalCreateButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#0052CC',
        minWidth: 140,
        alignItems: 'center',
    },
    modalCreateButtonDisabled: {
        opacity: 0.6,
    },
    modalCreateButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    filteringOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filteringBox: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    filteringText: {
        marginTop: 10,
        fontSize: 14,
        color: '#5E6C84',
    },
    timelineContainer: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    timelineHeader: {
        backgroundColor: '#fff',
        padding: 20,
        marginBottom: 12,
        borderBottomWidth: 3,
        borderBottomColor: '#0052CC',
    },
    timelineTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#172B4D',
        marginBottom: 6,
    },
    timelineSubtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0052CC',
        marginBottom: 4,
    },
    timelineEndDate: {
        fontSize: 13,
        color: '#5E6C84',
        marginTop: 4,
    },
    timelineItem: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    timelineItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    timelineItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    timelineItemKey: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0052CC',
    },
    dangerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBE6',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
    },
    dangerIcon: {
        fontSize: 12,
    },
    dangerText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#DE350B',
    },
    warningBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7E6',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
    },
    warningIcon: {
        fontSize: 12,
    },
    warningText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FF991F',
    },
    timelineStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    timelineStatusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    timelineItemSummary: {
        fontSize: 15,
        fontWeight: '500',
        color: '#172B4D',
        lineHeight: 20,
        marginBottom: 12,
    },
    timelineItemFooter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    timelineItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timelineItemMetaLabel: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '500',
    },
    timelineItemMetaValue: {
        fontSize: 12,
        color: '#172B4D',
        fontWeight: '600',
    },
    overdueText: {
        color: '#DE350B',
        fontWeight: '700',
    },
    // Chart Timeline Styles
    chartDateRange: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    chartDateItem: {
        flex: 1,
        alignItems: 'center',
    },
    chartDateLabel: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    chartDateValue: {
        fontSize: 15,
        color: '#172B4D',
        fontWeight: '700',
    },
    chartDateDivider: {
        width: 1,
        backgroundColor: '#DFE1E6',
        marginHorizontal: 16,
    },
    timelineChart: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 12,
        padding: 20,
        paddingBottom: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    timelineBar: {
        height: 12,
        backgroundColor: '#E1E4E8',
        borderRadius: 6,
        position: 'relative',
        marginVertical: 30,
    },
    timelineProgress: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#0052CC',
        borderRadius: 6,
    },
    timelineCurrentMarker: {
        position: 'absolute',
        top: -4,
        alignItems: 'center',
        zIndex: 10,
        marginLeft: -10,
    },
    timelineCurrentDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#0052CC',
        borderWidth: 4,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    timelineCurrentText: {
        marginTop: 28,
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        backgroundColor: '#0052CC',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    chartIssuesList: {
        paddingHorizontal: 16,
    },
    chartIssueItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    chartIssueContent: {
        padding: 16,
    },
    chartIssueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    chartIssueKey: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0052CC',
    },
    chartStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    chartStatusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
        textTransform: 'uppercase',
    },
    chartIssueSummary: {
        fontSize: 15,
        fontWeight: '500',
        color: '#172B4D',
        lineHeight: 20,
        marginBottom: 10,
    },
    chartIssueMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
        alignItems: 'center',
    },
    chartAssigneeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chartAssigneeAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#DFE1E6',
    },
    chartAssigneeAvatarPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartAssigneeAvatarText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    chartMetaText: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '500',
    },
    chartIssueTimeline: {
        marginTop: 4,
    },
    chartIssueTrack: {
        height: 8,
        backgroundColor: '#E1E4E8',
        borderRadius: 4,
        position: 'relative',
        marginBottom: 8,
    },
    chartIssueDot: {
        position: 'absolute',
        top: -4,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
        transform: [{ translateX: -8 }],
    },
    chartNoDueDateBar: {
        backgroundColor: '#FFF7E6',
        borderWidth: 1,
        borderColor: '#FF991F',
        borderStyle: 'dashed',
        borderRadius: 6,
        padding: 8,
        alignItems: 'center',
    },
    chartNoDueDateText: {
        fontSize: 12,
        color: '#FF991F',
        fontWeight: '600',
    },
    chartOverdueBadge: {
        backgroundColor: '#FFEBE6',
        borderRadius: 8,
        padding: 6,
        alignItems: 'center',
    },
    chartOverdueText: {
        fontSize: 11,
        color: '#DE350B',
        fontWeight: '600',
    },
    sprintOptionsButton: {
        padding: 8,
        marginRight: 4,
    },
    sprintOptionsIcon: {
        fontSize: 20,
        color: '#5E6C84',
        fontWeight: 'bold',
    },
    sprintOptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    sprintOptionButtonDelete: {
        borderColor: '#FFEBE6',
        backgroundColor: '#FFEBE6',
    },
    sprintOptionIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    sprintOptionText: {
        fontSize: 16,
        color: '#172B4D',
        fontWeight: '500',
    },
    sprintOptionTextDelete: {
        color: '#DE350B',
    },
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmDialog: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#172B4D',
        marginBottom: 12,
    },
    confirmMessage: {
        fontSize: 15,
        color: '#5E6C84',
        lineHeight: 22,
        marginBottom: 24,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonCancel: {
        backgroundColor: '#F4F5F7',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    confirmButtonDelete: {
        backgroundColor: '#DE350B',
    },
    confirmButtonComplete: {
        backgroundColor: '#0052CC',
    },
    confirmButtonTextCancel: {
        color: '#172B4D',
        fontSize: 15,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});
