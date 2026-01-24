import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
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
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const apiTokenRef = useRef<View>(null);

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
            Alert.alert('Error', 'Failed to load current configuration');
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
                Alert.alert('Success', 'Default board cleared');
            } else {
                // Save new default board
                await StorageService.setDefaultBoardId(tempSelectedBoardId);
                setDefaultBoardId(tempSelectedBoardId);
                Alert.alert('Success', 'Default board saved successfully');
            }
        } catch (error) {
            console.error('Error saving default board:', error);
            Alert.alert('Error', 'Failed to save default board');
        } finally {
            setSavingBoard(false);
        }
    };

    const validateInputs = (): boolean => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return false;
        }

        if (!jiraUrl.trim()) {
            Alert.alert('Error', 'Please enter your Jira URL');
            return false;
        }

        if (!apiToken.trim()) {
            Alert.alert('Error', 'Please enter your API token');
            return false;
        }

        try {
            new URL(jiraUrl);
        } catch {
            Alert.alert('Error', 'Please enter a valid URL');
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
                    Alert.alert(
                        'Connection Failed',
                        'Unable to connect to Jira. Please check your credentials.'
                    );
                    setSaving(false);
                    return;
                }
            }

            // Save configuration
            await StorageService.saveConfig(config);

            const successMessage = Platform.OS === 'web'
                ? 'Settings saved! Note: Web browsers have CORS limitations. Use mobile app for full functionality.'
                : 'Settings saved successfully!';

            Alert.alert('Success', successMessage, [
                {
                    text: 'OK',
                    onPress: onBack,
                },
            ]);
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout? This will clear all your credentials.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await StorageService.clearConfig();
                            jiraApi.reset();
                            onLogout();
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Failed to logout');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0052CC" />
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
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.boardModalItem,
                                            tempSelectedBoardId === item.id && styles.boardModalItemSelected,
                                        ]}
                                        onPress={() => {
                                            handleBoardItemSelect(item.id);
                                            setIsBoardDropdownExpanded(false);
                                        }}
                                    >
                                        <View style={styles.boardItemContent}>
                                            <Text style={[
                                                styles.boardName,
                                                tempSelectedBoardId === item.id && styles.boardNameSelected,
                                            ]}>
                                                {defaultBoardId === item.id && '⭐ '}{item.name}
                                            </Text>
                                            {item.location?.projectName && (
                                                <Text style={styles.boardProject}>
                                                    {item.location.projectName}
                                                </Text>
                                            )}
                                        </View>
                                        {tempSelectedBoardId === item.id && (
                                            <Text style={styles.checkmark}>✓</Text>
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
        maxHeight: '80%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
    },
    modalCloseButton: {
        padding: 5,
    },
    modalCloseText: {
        fontSize: 24,
        color: '#5E6C84',
        fontWeight: '300',
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
        color: '#172B4D',
    },
    loadingContainer: {
        padding: 40,
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
    },
    emptyContainer: {
        padding: 40,
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
});
