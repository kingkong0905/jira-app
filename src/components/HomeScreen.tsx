import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Platform,
    TextInput,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { jiraApi } from '../services/jiraApi';
import { StorageService } from '../services/storage';
import { JiraIssue, JiraBoard, JiraSprint } from '../types/jira';
import IssueCard from './IssueCard';
import Logo from './Logo';
import IssueDetailsScreen from './IssueDetailsScreen';

interface HomeScreenProps {
    onOpenSettings: () => void;
}

type TabType = 'backlog' | 'board';

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
    const boardListRef = useRef<FlatList>(null);

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
            Alert.alert('Error', 'Failed to initialize. Please check your settings.');
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
            Alert.alert('Error', errorMessage);
        }
    };

    const handleBoardSearch = async (query: string) => {
        setSearchQuery(query);
        setBoardsStartAt(0);
        setHasMoreBoards(true);
        await loadBoards(true, query);
    };

    const loadMoreBoards = async () => {
        if (loadingMoreBoards || !hasMoreBoards) return;

        setLoadingMoreBoards(true);
        await loadBoards(false);
        setLoadingMoreBoards(false);
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

                // Load issues based on active tab
                if (tabToLoad === 'board' && activeSprintData) {
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
            Alert.alert('Error', errorMsg);
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
        setSelectedAssignee('all');
        if (selectedBoard) {
            await loadIssuesForBoard(selectedBoard.id, tab);
        }
    };

    const handleAssigneeChange = async (assignee: string) => {
        setSelectedAssignee(assignee);
        if (selectedBoard) {
            await loadIssuesForBoard(selectedBoard.id, undefined, assignee);
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

    // Group issues by sprint for Backlog view
    const groupedBySprintIssues = React.useMemo(() => {
        if (activeTab !== 'backlog') return [];

        const groups: { sprint: string, sprintId: number | null, data: JiraIssue[] }[] = [];
        const addedIssueKeys = new Set<string>();

        // Get active sprint ID
        const activeSprintId = activeSprint?.id;

        // Add active sprint at the top if it has issues
        if (activeSprintId) {
            const activeSprintIssues = filteredIssues.filter(issue => {
                if (issue.fields.sprint && issue.fields.sprint.id === activeSprintId && !addedIssueKeys.has(issue.key)) {
                    addedIssueKeys.add(issue.key);
                    return true;
                }
                return false;
            });
            if (activeSprintIssues.length > 0) {
                groups.push({
                    sprint: activeSprint.name,
                    sprintId: activeSprint.id,
                    data: activeSprintIssues,
                });
            }
        }

        // Group by other sprints (excluding active sprint to avoid duplication)
        sprints.forEach(sprint => {
            // Skip active sprint - it's already shown
            if (activeSprintId && sprint.id === activeSprintId) {
                return;
            }

            const sprintIssues = filteredIssues.filter(issue => {
                if (issue.fields.sprint && issue.fields.sprint.id === sprint.id && !addedIssueKeys.has(issue.key)) {
                    addedIssueKeys.add(issue.key);
                    return true;
                }
                return false;
            });
            if (sprintIssues.length > 0) {
                groups.push({
                    sprint: sprint.name,
                    sprintId: sprint.id,
                    data: sprintIssues,
                });
            }
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
    }, [filteredIssues, backlogIssues, sprints, activeTab, issueSearchQuery]);

    const handleIssuePress = (issueKey: string) => {
        setSelectedIssueKey(issueKey);
    };

    const handleCompleteSprint = async () => {
        if (!activeSprint) return;

        Alert.alert(
            'Complete Sprint',
            `Are you sure you want to complete "${activeSprint.name}"?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Complete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await jiraApi.completeSprint(activeSprint.id);
                            Alert.alert('Success', 'Sprint completed successfully');
                            if (selectedBoard) {
                                await loadIssuesForBoard(selectedBoard.id);
                            }
                        } catch (error: any) {
                            console.error('Error completing sprint:', error);
                            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to complete sprint');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleBackFromDetails = () => {
        setSelectedIssueKey(null);
    };

    // Show issue details screen if an issue is selected
    if (selectedIssueKey) {
        return (
            <IssueDetailsScreen
                issueKey={selectedIssueKey}
                onBack={handleBackFromDetails}
            />
        );
    }

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0052CC" />
                <Text style={styles.loadingText}>Loading...</Text>
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
                            <Text style={styles.headerTitle}>JiraFlow</Text>
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

                            {loading && boards.length === 0 ? (
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
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.boardDropdownItem,
                                                selectedBoard?.id === item.id && styles.boardDropdownItemSelected,
                                            ]}
                                            onPress={() => handleBoardSelect(item)}
                                        >
                                            <View style={styles.boardDropdownItemContent}>
                                                <Text style={[
                                                    styles.boardDropdownItemName,
                                                    selectedBoard?.id === item.id && styles.boardDropdownItemNameSelected,
                                                ]} numberOfLines={1}>
                                                    {savedDefaultBoardId === item.id && '⭐ '}{item.name}
                                                </Text>
                                                <View style={styles.boardDropdownItemMeta}>
                                                    {item.type && (
                                                        <Text style={styles.boardDropdownItemType}>
                                                            {item.type.toLowerCase() === 'kanban' ? '📋 Kanban' : '🏃 Scrum'}
                                                        </Text>
                                                    )}
                                                    {item.location?.projectName && (
                                                        <Text style={styles.boardDropdownItemProject} numberOfLines={1}>
                                                            {item.location.projectName}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            {selectedBoard?.id === item.id && (
                                                <Text style={styles.boardDropdownCheckmark}>✓</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
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
                                    <Text style={styles.emptyDropdownText}>No boards match "{searchQuery}"</Text>
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
                        </View>
                    </>
                )}

                {issues.length > 0 && selectedBoard && (
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

                        {activeTab === 'board' && (
                            <View style={styles.filterContainer}>
                                <Text style={styles.filterLabel}>👤 Filter by Assignee:</Text>
                                <FlatList
                                    horizontal
                                    data={assignees}
                                    keyExtractor={(item) => item.key}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.filterChip,
                                                selectedAssignee === item.key && styles.filterChipSelected,
                                            ]}
                                            onPress={() => handleAssigneeChange(item.key)}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    selectedAssignee === item.key && styles.filterChipTextSelected,
                                                ]}
                                            >
                                                {item.name}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.filterList}
                                />
                            </View>
                        )}
                    </>
                )}

                {issues.length > 0 && activeTab === 'backlog' && selectedBoard && (
                    <View style={styles.filterContainer}>
                        <Text style={styles.filterLabel}>👤 Filter by Assignee:</Text>
                        <FlatList
                            horizontal
                            data={assignees}
                            keyExtractor={(item) => item.key}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        selectedAssignee === item.key && styles.filterChipSelected,
                                    ]}
                                    onPress={() => handleAssigneeChange(item.key)}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            selectedAssignee === item.key && styles.filterChipTextSelected,
                                        ]}
                                    >
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterList}
                        />
                    </View>
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
                                {group.data.map(issue => (
                                    <View key={issue.key}>
                                        <IssueCard issue={issue} onPress={() => handleIssuePress(issue.key)} />
                                    </View>
                                ))}
                            </View>
                        )}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={['#0052CC']}
                            />
                        }
                        contentContainerStyle={styles.issuesList}
                    />
                ) : (
                    <FlatList
                        data={groupedBySprintIssues}
                        keyExtractor={(item) => item.sprintId?.toString() || 'backlog'}
                        renderItem={({ item: group }) => (
                            <View style={styles.statusGroup}>
                                <View style={[styles.sprintGroupHeader]}>
                                    <Text style={styles.sprintGroupTitle}>🏃 {group.sprint}</Text>
                                    <Text style={styles.statusGroupCount}>({group.data.length})</Text>
                                </View>
                                {group.data.map(issue => (
                                    <View key={issue.key}>
                                        <IssueCard issue={issue} onPress={() => handleIssuePress(issue.key)} />
                                    </View>
                                ))}
                            </View>
                        )}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={['#0052CC']}
                            />
                        }
                        contentContainerStyle={styles.issuesList}
                    />
                )}
            </View>
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
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#B3D4FF',
        marginTop: 2,
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
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    boardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
    },
    boardLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
    },
    boardDropdownButton: {
        flex: 1,
        backgroundColor: '#F4F5F7',
        borderWidth: 2,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        padding: 12,
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
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        overflow: 'hidden',
    },
    boardDropdownList: {
        maxHeight: 300,
    },
    boardDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E8EBED',
        backgroundColor: '#fff',
    },
    boardDropdownItemSelected: {
        backgroundColor: '#E6F2FF',
    },
    boardDropdownItemContent: {
        flex: 1,
        marginRight: 8,
    },
    boardDropdownItemName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 4,
    },
    boardDropdownItemNameSelected: {
        color: '#0052CC',
        fontWeight: '600',
    },
    boardDropdownItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    boardDropdownItemType: {
        fontSize: 12,
        color: '#5E6C84',
        backgroundColor: '#F4F5F7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    boardDropdownItemProject: {
        fontSize: 12,
        color: '#5E6C84',
        flex: 1,
    },
    boardDropdownCheckmark: {
        fontSize: 18,
        color: '#0052CC',
        fontWeight: 'bold',
    },
    dropdownLoader: {
        padding: 30,
    },
    emptyDropdownState: {
        padding: 30,
        alignItems: 'center',
    },
    emptyDropdownText: {
        fontSize: 14,
        color: '#5E6C84',
        fontStyle: 'italic',
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
        backgroundColor: '#F4F5F7',
        borderRadius: 12,
        marginHorizontal: 20,
        marginVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#DFE1E6',
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
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    issuesContainer: {
        flex: 1,
        paddingTop: 0,
    },
    sprintInfoCard: {
        backgroundColor: '#EAF3FF',
        marginHorizontal: 20,
        marginVertical: 12,
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#0052CC',
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
        borderBottomWidth: 2,
        borderBottomColor: '#e0e0e0',
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#0052CC',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#5E6C84',
    },
    tabTextActive: {
        color: '#0052CC',
    },
    issuesHeader: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#F4F5F7',
    },
    filterContainer: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84',
        marginBottom: 8,
    },
    filterList: {
        gap: 8,
    },
    filterChip: {
        backgroundColor: '#F4F5F7',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    filterChipSelected: {
        backgroundColor: '#0052CC',
        borderColor: '#0052CC',
    },
    filterChipText: {
        fontSize: 13,
        color: '#172B4D',
        fontWeight: '500',
    },
    filterChipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    statusGroup: {
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    statusGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 4,
    },
    statusGroupTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#172B4D',
        flex: 1,
    },
    statusGroupCount: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5E6C84',
    },
    sprintGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: '#E6FCFF',
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#00B8D9',
    },
    sprintGroupTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#00638A',
        flex: 1,
    },
    issuesList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
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
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
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
        color: '#666',
        backgroundColor: '#f5f5f5',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    assignee: {
        fontSize: 12,
        color: '#666',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#999',
        marginBottom: 5,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
    },
});
