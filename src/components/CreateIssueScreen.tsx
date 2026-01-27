import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
    StyleSheet,
    KeyboardAvoidingView,
    Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { jiraApi } from '../services/jiraApi';
import PickerModal, { PickerItem } from './shared/PickerModal';
import { formatDateOnly, getPriorityEmoji } from '../utils/helpers';
import { SkeletonLoader, SkeletonText } from './shared/SkeletonLoader';
import { FadeInView } from './shared/FadeInView';
import { useToast } from './shared/ToastContext';

interface CreateIssueScreenProps {
    boardId: number;
    projectId?: string;
    onBack: () => void;
    onIssueCreated: () => void;
}

export default function CreateIssueScreen({
    boardId,
    projectId: initialProjectId,
    onBack,
    onIssueCreated,
}: CreateIssueScreenProps) {
    const [projectId, setProjectId] = useState<string>(initialProjectId || '');
    const [issueTypes, setIssueTypes] = useState<any[]>([]);
    const [sprints, setSprints] = useState<any[]>([]);
    const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
    const [parentIssues, setParentIssues] = useState<any[]>([]);
    const [priorities, setPriorities] = useState<any[]>([]);

    const [selectedIssueType, setSelectedIssueType] = useState<string>('');
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
    const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [tempDate, setTempDate] = useState<Date | null>(null); // Temporary date for picker
    const [storyPoints, setStoryPoints] = useState('');
    const [selectedSprint, setSelectedSprint] = useState<number | null>(null);
    const [selectedParent, setSelectedParent] = useState<string | null>(null);

    const [showIssueTypePicker, setShowIssueTypePicker] = useState(false);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [showAssigneePicker, setShowAssigneePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showSprintPicker, setShowSprintPicker] = useState(false);
    const [showParentPicker, setShowParentPicker] = useState(false);
    const [loadingParents, setLoadingParents] = useState(false);

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [generatingDescription, setGeneratingDescription] = useState(false);

    const richEditorRef = useRef<RichEditor>(null);
    const toast = useToast();

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedIssueType && projectId) {
            loadParentIssues();
        }
    }, [selectedIssueType, projectId]);

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // Get project if not provided
            let projId = projectId;
            if (!projId) {
                const project = await jiraApi.getProjectForBoard(boardId);
                if (project?.projectKey) {
                    projId = project.projectKey;
                    setProjectId(projId);
                }
            }

            if (!projId) {
                toast.error('Could not find project for this board');
                onBack();
                return;
            }

            // Load data in parallel
            const [typesData, sprintsData, usersData, prioritiesData] = await Promise.all([
                jiraApi.getIssueTypesForProject(projId),
                jiraApi.getSprintsForBoard(boardId),
                jiraApi.getAssignableUsersForProject(projId),
                jiraApi.getPriorities(),
            ]);

            setIssueTypes(typesData);
            setPriorities(prioritiesData);

            // Filter active and future sprints
            const activeAndFutureSprints = sprintsData.filter(
                s => s.state === 'active' || s.state === 'future'
            );
            setSprints(activeAndFutureSprints);

            setAssignableUsers(usersData);

            // Set default issue type if available
            if (typesData.length > 0) {
                setSelectedIssueType(typesData[0].id);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error('Failed to load form data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadParentIssues = async () => {
        try {
            setLoadingParents(true);
            setParentIssues([]);
            setSelectedParent(null);

            const selectedType = issueTypes.find(t => t.id === selectedIssueType);
            if (!selectedType) return;

            const typeName = selectedType.name.toLowerCase();
            let jql = '';

            // Determine parent issue types based on current issue type
            if (typeName === 'bug' || typeName === 'story' || typeName === 'user story') {
                // Parent should be Epic
                jql = `project = ${projectId} AND issuetype = Epic ORDER BY created DESC`;
            } else if (typeName === 'task') {
                // Parent can be Epic or User Story
                jql = `project = ${projectId} AND (issuetype = Epic OR issuetype = Story OR issuetype = "User Story") ORDER BY created DESC`;
            } else if (typeName === 'sub-task' || typeName === 'subtask') {
                // Parent should be Task or User Story
                jql = `project = ${projectId} AND (issuetype = Task OR issuetype = Story OR issuetype = "User Story") ORDER BY created DESC`;
            } else {
                // No parent needed for other types
                return;
            }

            const issues = await jiraApi.searchIssues(jql, 100);
            setParentIssues(issues);
        } catch (error) {
            console.error('Error loading parent issues:', error);
        } finally {
            setLoadingParents(false);
        }
    };

    const handleCreate = async () => {
        // Validation
        if (!selectedIssueType) {
            toast.warning('Please select an issue type');
            return;
        }

        if (!summary.trim()) {
            toast.warning('Please enter a summary');
            return;
        }

        setCreating(true);
        try {
            const issueData = {
                issueType: selectedIssueType,
                summary: summary.trim(),
                description: description.trim() || undefined,
                assignee: selectedAssignee,
                priority: selectedPriority || undefined,
                dueDate: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
                storyPoints: storyPoints ? parseFloat(storyPoints) : undefined,
                sprintId: selectedSprint || undefined,
                parent: selectedParent || undefined,
            };

            await jiraApi.createIssue(projectId, issueData);

            toast.success('Issue created successfully');
            onIssueCreated();
        } catch (error: any) {
            console.error('Error creating issue:', error);
            const errorMessage = error?.response?.data?.errorMessages?.[0]
                || error?.response?.data?.errors
                || 'Failed to create issue. Please try again.';
            toast.error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        } finally {
            setCreating(false);
        }
    };

    const getSelectedIssueTypeName = () => {
        const type = issueTypes.find(t => t.id === selectedIssueType);
        return type?.name || 'Select Issue Type';
    };

    const getSelectedAssigneeName = () => {
        if (!selectedAssignee) return 'Unassigned';
        const user = assignableUsers.find(u => u.accountId === selectedAssignee);
        return user?.displayName || 'Unassigned';
    };

    const getSelectedSprintName = () => {
        if (!selectedSprint) return 'None';
        const sprint = sprints.find(s => s.id === selectedSprint);
        return sprint?.name || 'None';
    };

    const getSelectedParentName = () => {
        if (!selectedParent) return 'None';
        const parent = parentIssues.find(i => i.key === selectedParent);
        return parent ? `${parent.key}: ${parent.fields.summary}` : 'None';
    };

    const getSelectedPriorityName = () => {
        if (!selectedPriority) return 'None';
        const priority = priorities.find(p => p.id === selectedPriority);
        return priority ? `${getPriorityEmoji(priority.name)} ${priority.name}` : 'None';
    };

    const handleGenerateDescription = async () => {
        if (!summary.trim()) {
            toast.warning('Please enter a summary first before generating description.');
            return;
        }

        try {
            setGeneratingDescription(true);
            const selectedType = issueTypes.find(t => t.id === selectedIssueType);
            const issueTypeName = selectedType?.name;

            const generatedDesc = await jiraApi.generateDescription(summary.trim(), issueTypeName);

            if (generatedDesc) {
                setDescription(generatedDesc);
                richEditorRef.current?.setContentHTML(generatedDesc);
            }
        } catch (error) {
            console.error('Error generating description:', error);
            toast.error('Failed to generate description template. Please try again.');
        } finally {
            setGeneratingDescription(false);
        }
    };

    const shouldShowParentField = () => {
        const selectedType = issueTypes.find(t => t.id === selectedIssueType);
        if (!selectedType) return false;
        const typeName = selectedType.name.toLowerCase();
        return typeName === 'bug' || typeName === 'task' || typeName === 'story' ||
            typeName === 'user story' || typeName === 'sub-task' || typeName === 'subtask';
    };

    const handleParentSearch = async (query: string) => {
        if (!projectId || !selectedIssueType) return [];

        const selectedType = issueTypes.find(t => t.id === selectedIssueType);
        if (!selectedType) return [];

        const typeName = selectedType.name.toLowerCase();
        let jql = '';

        if (typeName === 'bug' || typeName === 'story' || typeName === 'user story') {
            jql = `project = ${projectId} AND issuetype = Epic`;
        } else if (typeName === 'task') {
            jql = `project = ${projectId} AND (issuetype = Epic OR issuetype = Story OR issuetype = "User Story")`;
        } else if (typeName === 'sub-task' || typeName === 'subtask') {
            jql = `project = ${projectId} AND (issuetype = Task OR issuetype = Story OR issuetype = "User Story")`;
        } else {
            return [];
        }

        if (query.trim()) {
            jql += ` AND (summary ~ "*${query}*" OR key ~ "${query}*")`;
        }

        jql += ' ORDER BY created DESC';

        const results = await jiraApi.searchIssues(jql, 50);
        return results.map(issue => ({
            id: issue.key,
            label: issue.key,
            description: issue.fields.summary,
            emoji: issue.fields.issuetype?.name === 'Epic' ? '📚' : '📋',
        }));
    };

    const handleAssigneeSearch = async (query: string) => {
        if (!projectId) return [];

        const users = await jiraApi.getAssignableUsersForProject(projectId, query);
        return users.map(user => ({
            id: user.accountId,
            label: user.displayName,
            description: user.emailAddress,
            imageUrl: user.avatarUrls?.['48x48'],
        }));
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <LinearGradient colors={['#0052CC', '#4C9AFF']} style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Issue</Text>
                    <View style={styles.placeholder} />
                </LinearGradient>
                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.field}>
                        <SkeletonLoader width={100} height={16} style={{ marginBottom: 8 }} />
                        <SkeletonLoader width="100%" height={48} borderRadius={8} />
                    </View>
                    <View style={styles.field}>
                        <SkeletonLoader width={80} height={16} style={{ marginBottom: 8 }} />
                        <SkeletonLoader width="100%" height={48} borderRadius={8} />
                    </View>
                    <View style={styles.field}>
                        <SkeletonLoader width={70} height={16} style={{ marginBottom: 8 }} />
                        <SkeletonLoader width="100%" height={48} borderRadius={8} />
                    </View>
                    <View style={styles.field}>
                        <SkeletonLoader width={90} height={16} style={{ marginBottom: 8 }} />
                        <SkeletonLoader width="100%" height={150} borderRadius={8} />
                    </View>
                    <View style={styles.field}>
                        <SkeletonLoader width={80} height={16} style={{ marginBottom: 8 }} />
                        <SkeletonLoader width="100%" height={48} borderRadius={8} />
                    </View>
                </ScrollView>
            </View>
        );
    }

    // Convert data to PickerItem format
    const issueTypeItems: PickerItem[] = issueTypes.map(type => ({
        id: type.id,
        label: type.name,
        description: type.description,
    }));

    const assigneeItems: PickerItem[] = assignableUsers.map(user => ({
        id: user.accountId,
        label: user.displayName,
        description: user.emailAddress,
        imageUrl: user.avatarUrls?.['48x48'],
    }));

    const sprintItems: PickerItem[] = sprints.map(sprint => ({
        id: sprint.id.toString(),
        label: sprint.name,
        description: sprint.state === 'active' ? '🟢 Active' : '🔵 Future',
    }));

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <LinearGradient colors={['#0052CC', '#4C9AFF']} style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Issue</Text>
                <View style={styles.placeholder} />
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Issue Type */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Issue Type <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity
                            style={styles.picker}
                            onPress={() => setShowIssueTypePicker(true)}
                        >
                            <Text style={styles.pickerText}>{getSelectedIssueTypeName()}</Text>
                            <Text style={styles.pickerIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Priority */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Priority</Text>
                        <TouchableOpacity
                            style={styles.picker}
                            onPress={() => setShowPriorityPicker(true)}
                        >
                            <Text style={styles.pickerText}>{getSelectedPriorityName()}</Text>
                            <Text style={styles.pickerIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Parent (conditional) */}
                    {shouldShowParentField() && (
                        <View style={styles.field}>
                            <Text style={styles.label}>Parent</Text>
                            <TouchableOpacity
                                style={styles.picker}
                                onPress={() => setShowParentPicker(true)}
                                disabled={loadingParents || parentIssues.length === 0}
                            >
                                <Text style={[
                                    styles.pickerText,
                                    (loadingParents || parentIssues.length === 0) && styles.pickerTextDisabled
                                ]}>
                                    {loadingParents ? 'Loading...' : parentIssues.length === 0 ? 'No parent issues available' : getSelectedParentName()}
                                </Text>
                                {!loadingParents && parentIssues.length > 0 && (
                                    <Text style={styles.pickerIcon}>▼</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Summary */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Summary <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter issue summary"
                            value={summary}
                            onChangeText={setSummary}
                            multiline
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.field}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Description</Text>
                            <TouchableOpacity
                                style={[
                                    styles.aiButton,
                                    (generatingDescription || !summary.trim()) && styles.aiButtonDisabled
                                ]}
                                onPress={handleGenerateDescription}
                                disabled={generatingDescription || !summary.trim()}
                                activeOpacity={0.7}
                            >
                                {generatingDescription ? (
                                    <ActivityIndicator size="small" color="#0052CC" />
                                ) : (
                                    <>
                                        <Text style={styles.aiButtonIcon}>✨</Text>
                                        <Text style={[
                                            styles.aiButtonText,
                                            !summary.trim() && styles.aiButtonTextDisabled
                                        ]}>Generate</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={styles.richEditorContainer}>
                            <RichToolbar
                                editor={richEditorRef}
                                actions={[
                                    actions.setBold,
                                    actions.setItalic,
                                    actions.setUnderline,
                                    actions.insertBulletsList,
                                    actions.insertOrderedList,
                                    actions.code,
                                    actions.blockquote,
                                ]}
                                iconTint="#172B4D"
                                selectedIconTint="#0052CC"
                                style={styles.richToolbar}
                            />
                            <RichEditor
                                ref={richEditorRef}
                                onChange={setDescription}
                                placeholder="Enter issue description..."
                                initialHeight={150}
                                style={styles.richEditor}
                            />
                        </View>
                    </View>

                    {/* Assignee */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Assignee</Text>
                        <TouchableOpacity
                            style={styles.picker}
                            onPress={() => setShowAssigneePicker(true)}
                        >
                            <Text style={styles.pickerText}>{getSelectedAssigneeName()}</Text>
                            <Text style={styles.pickerIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Due Date */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Due Date</Text>
                        <View style={styles.fieldWithClear}>
                            <TouchableOpacity
                                style={[styles.picker, dueDate && styles.pickerWithClear]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.pickerText} numberOfLines={1} ellipsizeMode="tail">
                                    {dueDate ? formatDateOnly(dueDate.toISOString()) : 'No due date'}
                                </Text>
                                <Text style={styles.pickerIcon}>📅</Text>
                            </TouchableOpacity>
                            {dueDate && (
                                <TouchableOpacity
                                    style={styles.clearButton}
                                    onPress={() => setDueDate(null)}
                                >
                                    <Text style={styles.clearButtonText}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Story Points */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Story Points</Text>
                        <View style={styles.fieldWithClear}>
                            <TextInput
                                style={[styles.input, storyPoints && styles.inputWithClear]}
                                placeholder="Enter story points (e.g., 3, 5, 8)"
                                value={storyPoints}
                                onChangeText={setStoryPoints}
                                keyboardType="decimal-pad"
                            />
                            {storyPoints.length > 0 && (
                                <TouchableOpacity
                                    style={styles.clearButton}
                                    onPress={() => setStoryPoints('')}
                                >
                                    <Text style={styles.clearButtonText}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Sprint */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Sprint</Text>
                        <TouchableOpacity
                            style={styles.picker}
                            onPress={() => setShowSprintPicker(true)}
                            disabled={sprints.length === 0}
                        >
                            <Text style={[styles.pickerText, sprints.length === 0 && styles.pickerTextDisabled]}>
                                {sprints.length === 0 ? 'No sprints available' : getSelectedSprintName()}
                            </Text>
                            {sprints.length > 0 && <Text style={styles.pickerIcon}>▼</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Create Button */}
                    <TouchableOpacity
                        style={[styles.createButton, creating && styles.createButtonDisabled]}
                        onPress={handleCreate}
                        disabled={creating}
                    >
                        {creating ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.createButtonText}>Create Issue</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Issue Type Picker */}
            <PickerModal
                visible={showIssueTypePicker}
                title="Select Issue Type"
                currentValue={selectedIssueType}
                currentLabel={getSelectedIssueTypeName()}
                items={issueTypeItems}
                onClose={() => setShowIssueTypePicker(false)}
                onSelect={(id: string) => {
                    setSelectedIssueType(id);
                    setShowIssueTypePicker(false);
                }}
                showCurrentValue={false}
            />
            {/* Priority Picker */}
            <PickerModal
                visible={showPriorityPicker}
                title="Select Priority"
                currentValue={selectedPriority || ''}
                currentLabel={getSelectedPriorityName()}
                items={priorities.map(priority => ({
                    id: priority.id,
                    label: priority.name,
                    emoji: getPriorityEmoji(priority.name),
                }))}
                allowUnselect={true}
                unselectLabel="No Priority"
                onClose={() => setShowPriorityPicker(false)}
                onSelect={(id: string) => {
                    setSelectedPriority(id || null);
                    setShowPriorityPicker(false);
                }}
                showCurrentValue={false}
            />
            {/* Priority Picker */}
            <PickerModal
                visible={showPriorityPicker}
                title="Select Priority"
                currentValue={selectedPriority || ''}
                currentLabel={getSelectedPriorityName()}
                items={priorities.map(priority => ({
                    id: priority.id,
                    label: priority.name,
                    emoji: getPriorityEmoji(priority.name),
                }))}
                allowUnselect={true}
                unselectLabel="No Priority"
                onClose={() => setShowPriorityPicker(false)}
                onSelect={(id: string) => {
                    setSelectedPriority(id || null);
                    setShowPriorityPicker(false);
                }}
                showCurrentValue={false}
            />

            {/* Assignee Picker */}
            <PickerModal
                visible={showAssigneePicker}
                title="Select Assignee"
                currentValue={selectedAssignee || ''}
                currentLabel={getSelectedAssigneeName()}
                items={assigneeItems}
                allowUnselect={true}
                unselectLabel="Unassigned"
                searchable={true}
                searchPlaceholder="Search by name or email..."
                onSearch={handleAssigneeSearch}
                onClose={() => setShowAssigneePicker(false)}
                onSelect={(id: string) => {
                    setSelectedAssignee(id || null);
                    setShowAssigneePicker(false);
                }}
                showCurrentValue={false}
            />

            {/* Sprint Picker */}
            <PickerModal
                visible={showSprintPicker}
                title="Select Sprint"
                currentValue={selectedSprint?.toString() || ''}
                currentLabel={getSelectedSprintName()}
                items={sprintItems}
                allowUnselect={true}
                unselectLabel="No Sprint"
                onClose={() => setShowSprintPicker(false)}
                onSelect={(id: string) => {
                    setSelectedSprint(id ? parseInt(id) : null);
                    setShowSprintPicker(false);
                }}
                showCurrentValue={false}
            />

            {/* Parent Picker */}
            <PickerModal
                visible={showParentPicker}
                title="Select Parent Issue"
                currentValue={selectedParent || ''}
                currentLabel={getSelectedParentName()}
                items={parentIssues.map(issue => ({
                    id: issue.key,
                    label: issue.key,
                    description: issue.fields.summary,
                    emoji: issue.fields.issuetype?.name === 'Epic' ? '📚' : '📋',
                }))}
                allowUnselect={true}
                unselectLabel="No Parent"
                searchable={true}
                searchPlaceholder="Search by key or summary..."
                onSearch={handleParentSearch}
                onClose={() => setShowParentPicker(false)}
                onSelect={(id: string) => {
                    setSelectedParent(id || null);
                    setShowParentPicker(false);
                }}
                showCurrentValue={false}
            />

            {/* Date Picker */}
            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        transparent={true}
                        animationType="slide"
                        visible={showDatePicker}
                        onRequestClose={() => {
                            setShowDatePicker(false);
                            setTempDate(null);
                        }}
                    >
                        <View style={styles.datePickerModal}>
                            <View style={styles.datePickerContainer}>
                                <View style={styles.datePickerHeader}>
                                    <TouchableOpacity onPress={() => {
                                        setShowDatePicker(false);
                                        setTempDate(null);
                                    }}>
                                        <Text style={styles.datePickerButton}>Cancel</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.datePickerTitle}>Select Due Date</Text>
                                    <TouchableOpacity onPress={() => {
                                        setDueDate(tempDate || new Date());
                                        setShowDatePicker(false);
                                        setTempDate(null);
                                    }}>
                                        <Text style={[styles.datePickerButton, styles.datePickerButtonDone]}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={tempDate || dueDate || new Date()}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, selectedDate) => {
                                        if (selectedDate) {
                                            setTempDate(selectedDate);
                                        }
                                    }}
                                />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={dueDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) {
                                setDueDate(selectedDate);
                            }
                        }}
                    />
                )
            )}
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
    header: {
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
    },
    backIcon: {
        fontSize: 28,
        color: '#fff',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    placeholder: {
        width: 44,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 40,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 8,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        gap: 6,
        minHeight: 32,
    },
    aiButtonDisabled: {
        backgroundColor: '#FAFBFC',
        borderColor: '#E8EBED',
        opacity: 0.6,
    },
    aiButtonIcon: {
        fontSize: 16,
    },
    aiButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0052CC',
    },
    aiButtonTextDisabled: {
        color: '#8993A4',
    },
    required: {
        color: '#DE350B',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#172B4D',
        minHeight: 44,
    },
    picker: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 44,
    },
    pickerText: {
        fontSize: 15,
        color: '#172B4D',
        flex: 1,
        marginRight: 4,
    },
    pickerTextDisabled: {
        color: '#A5ADBA',
    },
    pickerIcon: {
        fontSize: 12,
        color: '#5E6C84',
        marginLeft: 4,
        flexShrink: 0,
    },
    richEditorContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        overflow: 'hidden',
    },
    richToolbar: {
        backgroundColor: '#F4F5F7',
        borderBottomWidth: 1,
        borderBottomColor: '#DFE1E6',
    },
    richEditor: {
        backgroundColor: '#fff',
    },
    createButton: {
        backgroundColor: '#0052CC',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    createButtonDisabled: {
        backgroundColor: '#A5ADBA',
        shadowOpacity: 0,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    fieldWithClear: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pickerWithClear: {
        flex: 0,
        maxWidth: '90%',
        minWidth: 0,
    },
    inputWithClear: {
        flex: 1,
    },
    clearButton: {
        width: 32,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FF5630',
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        flexShrink: 0,
    },
    clearButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '700',
    },
    datePickerModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    datePickerContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#DFE1E6',
    },
    datePickerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#172B4D',
    },
    datePickerButton: {
        fontSize: 17,
        color: '#0052CC',
    },
    datePickerButtonDone: {
        fontWeight: '600',
    },
});
