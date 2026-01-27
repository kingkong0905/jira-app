import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Platform,
    FlatList,
    Modal,
    Keyboard,
    KeyboardEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StorageService } from '../services/storage';
import { jiraApi } from '../services/jiraApi';
import { JiraBoard } from '../types/jira';
import { SkeletonLoader } from './shared/SkeletonLoader';
import { useToast } from './shared/ToastContext';

interface SettingsScreenProps {
    onBack: () => void;
    onLogout: () => void;
}

export default function SettingsScreen({ onBack, onLogout }: SettingsScreenProps) {
    const [email, setEmail] = useState('');
    const [jiraUrl, setJiraUrl] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [boards, setBoards] = useState<JiraBoard[]>([]);
    const [loadingBoards, setLoadingBoards] = useState(false);
    const [defaultBoardId, setDefaultBoardId] = useState<number | null>(null);
    const [tempSelectedBoardId, setTempSelectedBoardId] = useState<number | null>(null);
    const [boardSearchQuery, setBoardSearchQuery] = useState('');
    const [isBoardDropdownExpanded, setIsBoardDropdownExpanded] = useState(false);
    const [boardsStartAt, setBoardsStartAt] = useState(0);
    const [hasMoreBoards, setHasMoreBoards] = useState(true);
    const [loadingMoreBoards, setLoadingMoreBoards] = useState(false);
    const [savingBoard, setSavingBoard] = useState(false);
    const [boardTypeFilter, setBoardTypeFilter] = useState<'all' | 'scrum' | 'kanban'>('all');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const apiTokenRef = useRef<View>(null);
    const toast = useToast();

    useEffect(() => {
        loadCurrentConfig();

        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e: KeyboardEvent) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const loadCurrentConfig = async () => {
        try {
            const config = await StorageService.getConfig();
            if (config) {
                setEmail(config.email);
                setJiraUrl(config.jiraUrl);
                setApiToken(config.apiToken);

                // Initialize API and load boards
                jiraApi.initialize(config);
                const savedBoardId = await StorageService.getDefaultBoardId();
                setDefaultBoardId(savedBoardId);
                setTempSelectedBoardId(savedBoardId);
                await loadBoards(true, undefined, savedBoardId);
            }
        } catch (error) {
            console.error('Error loading config:', error);
            toast.error('Failed to load current configuration');
        } finally {
            setLoading(false);
        }
    };

    const loadBoards = async (reset: boolean = false, search?: string, boardIdToLoad?: number | null) => {
        if (Platform.OS === 'web') return; // Skip on web due to CORS

        try {
            if (reset) {
                setLoadingBoards(true);
            } else {
                setLoadingMoreBoards(true);
            }

            const query = search !== undefined ? search : boardSearchQuery;
            const startAt = reset ? 0 : boardsStartAt;
            const response = await jiraApi.getBoards(startAt, 50, query || undefined);

            if (reset) {
                // Use passed boardIdToLoad or fall back to state
                const targetBoardId = boardIdToLoad !== undefined ? boardIdToLoad : defaultBoardId;

                // Move default board to the front if it exists in the results
                if (targetBoardId) {
                    const defaultBoard = response.boards.find(b => b.id === targetBoardId);
                    if (defaultBoard) {
                        const otherBoards = response.boards.filter(b => b.id !== targetBoardId);
                        setBoards([defaultBoard, ...otherBoards]);
                    } else {
                        // Default board not in results, try to fetch it
                        try {
                            const specificBoard = await jiraApi.getBoardById(targetBoardId);
                            if (specificBoard) {
                                setBoards([specificBoard, ...response.boards]);
                            } else {
                                setBoards(response.boards);
                            }
                        } catch (error) {
                            console.error('Error fetching default board:', error);
                            setBoards(response.boards);
                        }
                    }
                } else {
                    setBoards(response.boards);
                }
                setBoardsStartAt(50);
            } else {
                setBoards(prev => [...prev, ...response.boards]);
                setBoardsStartAt(prev => prev + 50);
            }

            setHasMoreBoards(!response.isLast);
        } catch (error) {
            console.error('Error loading boards:', error);
        } finally {
            setLoadingBoards(false);
            setLoadingMoreBoards(false);
        }
    };

    const handleBoardSearch = async (query: string) => {
        setBoardSearchQuery(query);
        setBoardsStartAt(0);
        setHasMoreBoards(true);
        await loadBoards(true, query);
    };

    const loadMoreBoards = async () => {
        if (!loadingMoreBoards && hasMoreBoards && !loadingBoards) {
            await loadBoards(false);
        }
    };

    const handleBoardItemSelect = (boardId: number) => {
        // Just update temporary selection, don't save yet
        if (tempSelectedBoardId === boardId) {
            setTempSelectedBoardId(null);
        } else {
            setTempSelectedBoardId(boardId);
        }
        setIsBoardDropdownExpanded(false);
    };

    const handleSaveDefaultBoard = async () => {
        try {
            setSavingBoard(true);
            if (tempSelectedBoardId === null) {
                // Clear default board
                await StorageService.clearDefaultBoard();
                setDefaultBoardId(null);
                toast.info('Default board cleared');
            } else {
                // Save new default board
                await StorageService.setDefaultBoardId(tempSelectedBoardId);
                setDefaultBoardId(tempSelectedBoardId);
                toast.success('Default board saved successfully');
            }
        } catch (error) {
            console.error('Error saving default board:', error);
            toast.error('Failed to save default board');
        } finally {
            setSavingBoard(false);
        }
    };

    const validateInputs = (): boolean => {
        if (!email.trim()) {
            toast.warning('Please enter your email');
            return false;
        }

        if (!jiraUrl.trim()) {
            toast.warning('Please enter your Jira URL');
            return false;
        }

        if (!apiToken.trim()) {
            toast.warning('Please enter your API token');
            return false;
        }

        try {
            new URL(jiraUrl);
        } catch {
            toast.error('Please enter a valid URL');
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateInputs()) return;

        setSaving(true);
        try {
            const config = {
                email: email.trim(),
                jiraUrl: jiraUrl.trim().replace(/\/$/, ''),
                apiToken: apiToken.trim(),
            };

            // Initialize API
            jiraApi.initialize(config);

            // Skip connection test on web due to CORS restrictions
            if (Platform.OS !== 'web') {
                const isConnected = await jiraApi.testConnection();
                if (!isConnected) {
                    toast.error('Unable to connect to Jira. Please check your credentials.');
                    setSaving(false);
                    return;
                }
            }

            // Save configuration
            await StorageService.saveConfig(config);

            const successMessage = Platform.OS === 'web'
                ? 'Settings saved! Note: Web browsers have CORS limitations. Use mobile app for full functionality.'
                : 'Settings saved successfully!';

            toast.success(successMessage, 2000);
            setTimeout(() => {
                onBack();
            }, 500);
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = async () => {
        try {
            await StorageService.clearConfig();
            jiraApi.reset();
            setShowLogoutConfirm(false);
            onLogout();
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Failed to logout');
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={styles.backButton} />
                </View>
                <ScrollView style={styles.content}>
                    <View style={{ marginBottom: 24 }}>
                        <SkeletonLoader width={150} height={20} style={{ marginBottom: 16 }} />
                        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                            <SkeletonLoader width={80} height={14} style={{ marginBottom: 8 }} />
                            <SkeletonLoader width="100%" height={16} />
                        </View>
                        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                            <SkeletonLoader width={100} height={14} style={{ marginBottom: 8 }} />
                            <SkeletonLoader width="100%" height={16} />
                        </View>
                        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                            <SkeletonLoader width={120} height={14} style={{ marginBottom: 8 }} />
                            <SkeletonLoader width="100%" height={16} />
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
            >
                <View style={styles.form}>
                    <Text style={styles.sectionTitle}>Jira Configuration</Text>

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="your.email@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!saving}
                    />

                    <Text style={styles.label}>Jira URL</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="https://your-domain.atlassian.net"
                        value={jiraUrl}
                        onChangeText={setJiraUrl}
                        keyboardType="url"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!saving}
                    />

                    <View ref={apiTokenRef}>
                        <Text style={styles.label}>API Token</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your Jira API token"
                            value={apiToken}
                            onChangeText={setApiToken}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!saving}
                            onFocus={() => {
                                setTimeout(() => {
                                    apiTokenRef.current?.measure((fx, fy, width, height, px, py) => {
                                        const scrollY = py - 100;
                                        scrollViewRef.current?.scrollTo({
                                            y: Math.max(0, scrollY),
                                            animated: true,
                                        });
                                    });
                                }, 100);
                            }}
                        />
                    </View>

                    <Text style={styles.helpText}>
                        Generate a new API token at:{'\n'}
                        https://id.atlassian.com/manage-profile/security/api-tokens
                    </Text>

                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {Platform.OS !== 'web' && (
                    <View style={styles.defaultBoardSection}>
                        <Text style={styles.sectionTitle}>Default Board</Text>
                        <Text style={styles.sectionDescription}>
                            Select a default board to automatically load on startup
                        </Text>

                        <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setIsBoardDropdownExpanded(true)}
                        >
                            <Text style={styles.dropdownButtonText}>
                                {tempSelectedBoardId
                                    ? boards.find(b => b.id === tempSelectedBoardId)?.name || 'Select a board'
                                    : 'Select a board'}
                            </Text>
                            <Text style={styles.dropdownIcon}>▼</Text>
                        </TouchableOpacity>

                        {tempSelectedBoardId !== defaultBoardId && (
                            <TouchableOpacity
                                style={[styles.saveBoardButton, savingBoard && styles.buttonDisabled]}
                                onPress={handleSaveDefaultBoard}
                                disabled={savingBoard}
                            >
                                {savingBoard ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Save Default Board</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.dangerZone}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                        disabled={saving}
                    >
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>Jira Manager v1.0.0</Text>
                </View>
            </ScrollView>

            {/* Board Picker Modal */}
            <Modal
                visible={isBoardDropdownExpanded}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsBoardDropdownExpanded(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.boardModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Default Board</Text>
                            <TouchableOpacity
                                onPress={() => setIsBoardDropdownExpanded(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Search boards..."
                                value={boardSearchQuery}
                                onChangeText={handleBoardSearch}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {boardSearchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => handleBoardSearch('')}
                                    style={styles.clearButton}
                                >
                                    <Text style={styles.clearButtonText}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.filterChipsRow}>
                            <TouchableOpacity
                                style={[styles.filterChipModal, boardTypeFilter === 'all' && styles.filterChipModalActive]}
                                onPress={() => setBoardTypeFilter('all')}
                            >
                                <Text style={[styles.filterChipModalText, boardTypeFilter === 'all' && styles.filterChipModalTextActive]}>
                                    📊 All Boards
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterChipModal, boardTypeFilter === 'scrum' && styles.filterChipModalActive]}
                                onPress={() => setBoardTypeFilter('scrum')}
                            >
                                <Text style={[styles.filterChipModalText, boardTypeFilter === 'scrum' && styles.filterChipModalTextActive]}>
                                    🏃 Scrum
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterChipModal, boardTypeFilter === 'kanban' && styles.filterChipModalActive]}
                                onPress={() => setBoardTypeFilter('kanban')}
                            >
                                <Text style={[styles.filterChipModalText, boardTypeFilter === 'kanban' && styles.filterChipModalTextActive]}>
                                    📋 Kanban
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loadingBoards ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : boards.length > 0 ? (
                            <FlatList
                                data={boards}
                                keyExtractor={(item) => item.id.toString()}
                                style={styles.boardListModal}
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
                                                styles.boardModalItem,
                                                tempSelectedBoardId === item.id && styles.boardModalItemSelected,
                                            ]}
                                            onPress={() => {
                                                handleBoardItemSelect(item.id);
                                                setIsBoardDropdownExpanded(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.boardItemRow}>
                                                <View style={[
                                                    styles.boardIconContainer,
                                                    item.type?.toLowerCase() === 'kanban' ? styles.boardIconKanban : styles.boardIconScrum
                                                ]}>
                                                    <Text style={styles.boardIcon}>
                                                        {item.type?.toLowerCase() === 'kanban' ? '📋' : '🏃'}
                                                    </Text>
                                                </View>
                                                <View style={styles.boardItemContent}>
                                                    <View style={styles.boardNameContainer}>
                                                        {defaultBoardId === item.id && (
                                                            <View style={styles.starBadge}>
                                                                <Text style={styles.starIcon}>⭐</Text>
                                                            </View>
                                                        )}
                                                        <Text style={[
                                                            styles.boardName,
                                                            tempSelectedBoardId === item.id && styles.boardNameSelected,
                                                        ]} numberOfLines={2}>
                                                            {item.name}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.boardMetaRow}>
                                                        {item.type && (
                                                            <View style={styles.typeBadge}>
                                                                <Text style={styles.typeText}>{item.type}</Text>
                                                            </View>
                                                        )}
                                                        {item.location?.projectName && (
                                                            <Text style={styles.boardProject} numberOfLines={1}>
                                                                📁 {item.location.projectName}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                            {tempSelectedBoardId === item.id && (
                                                <View style={styles.checkmarkContainer}>
                                                    <Text style={styles.checkmark}>✓</Text>
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
                                            <Text style={styles.endOfListText}>No more boards</Text>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.noResultsText}>No boards found</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Logout Confirmation Modal */}
            <Modal
                visible={showLogoutConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLogoutConfirm(false)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmDialog}>
                        <Text style={styles.confirmTitle}>Logout</Text>
                        <Text style={styles.confirmMessage}>
                            Are you sure you want to logout? This will clear all your credentials.
                        </Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmButtonCancel]}
                                onPress={() => setShowLogoutConfirm(false)}
                            >
                                <Text style={styles.confirmButtonTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.confirmButtonLogout]}
                                onPress={confirmLogout}
                            >
                                <Text style={styles.confirmButtonText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    header: {
        backgroundColor: '#0052CC',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 5,
    },
    backIcon: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeholder: {
        width: 38,
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    form: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 12,
        lineHeight: 20,
    },
    defaultBoardSection: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        backgroundColor: '#F9F9F9',
    },
    dropdownButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#172B4D',
        flex: 1,
    },
    dropdownIcon: {
        fontSize: 12,
        color: '#5E6C84',
        marginLeft: 8,
    },
    dropdownContent: {
        marginTop: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#F9F9F9',
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        padding: 6,
        color: '#172B4D',
    },
    clearButton: {
        padding: 4,
    },
    clearButtonText: {
        fontSize: 16,
        color: '#5E6C84',
        fontWeight: 'bold',
    },
    boardList: {
        maxHeight: 300,
    },
    noResultsText: {
        padding: 20,
        textAlign: 'center',
        color: '#5E6C84',
        fontSize: 14,
    },
    loadingMoreContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
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
        borderTopColor: '#E0E0E0',
    },
    saveBoardButton: {
        backgroundColor: '#0052CC',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
    },
    loader: {
        marginVertical: 20,
    },
    boardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        backgroundColor: '#F9F9F9',
        marginBottom: 10,
    },
    boardItemSelected: {
        borderColor: '#0052CC',
        backgroundColor: '#E6F2FF',
    },
    boardItemContent: {
        flex: 1,
    },
    boardName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 2,
    },
    boardNameSelected: {
        color: '#0052CC',
    },
    boardProject: {
        fontSize: 13,
        color: '#5E6C84',
    },
    checkmark: {
        fontSize: 20,
        color: '#0052CC',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    boardModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
        backgroundColor: '#F9FAFB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#172B4D',
    },
    modalCloseButton: {
        padding: 5,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
        backgroundColor: '#F4F5F7',
    },
    modalCloseText: {
        fontSize: 20,
        color: '#5E6C84',
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderColor: '#E1E4E8',
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    clearButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: 16,
        color: '#5E6C84',
        fontWeight: '600',
    },
    filterChipsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 8,
    },
    filterChipModal: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: '#F4F5F7',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    filterChipModalActive: {
        backgroundColor: '#0052CC',
        borderColor: '#0052CC',
    },
    filterChipModalText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5E6C84',
    },
    filterChipModalTextActive: {
        color: '#FFFFFF',
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
        color: '#172B4D',
        paddingVertical: 12,
    },
    loadingContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boardListModal: {
        maxHeight: '100%',
    },
    boardModalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    boardModalItemSelected: {
        backgroundColor: '#E6F2FF',
        borderLeftWidth: 4,
        borderLeftColor: '#0052CC',
    },
    boardItemRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    boardIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    boardIconScrum: {
        backgroundColor: '#E6F2FF',
    },
    boardIconKanban: {
        backgroundColor: '#FFF4E6',
    },
    boardIcon: {
        fontSize: 20,
    },
    boardItemContent: {
        flex: 1,
    },
    boardNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    starBadge: {
        backgroundColor: '#FFF4E6',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    starIcon: {
        fontSize: 12,
    },
    boardName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        flex: 1,
    },
    boardNameSelected: {
        color: '#0052CC',
        fontWeight: '700',
    },
    boardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    typeBadge: {
        backgroundColor: '#F4F5F7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#5E6C84',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    boardProject: {
        fontSize: 13,
        color: '#7A869A',
        flex: 1,
    },
    checkmarkContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    checkmark: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 15,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    helpText: {
        fontSize: 12,
        color: '#666',
        marginTop: 15,
        lineHeight: 18,
    },
    saveButton: {
        backgroundColor: '#0052CC',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 25,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dangerZone: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logoutButton: {
        backgroundColor: '#DE350B',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    versionText: {
        fontSize: 14,
        color: '#999',
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
    confirmButtonLogout: {
        backgroundColor: '#DE350B',
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
