import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    TextInput,
    KeyboardAvoidingView,
    Image,
    Linking,
    Modal,
    Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { JiraIssue, JiraComment, JiraAttachment, JiraUser } from '../types/jira';
import { jiraApi } from '../services/jiraApi';
import { formatDate, formatDateOnly } from '../utils/helpers';

interface IssueDetailsScreenProps {
    issueKey: string;
    onBack: () => void;
}

export default function IssueDetailsScreen({ issueKey, onBack }: IssueDetailsScreenProps) {
    const [issue, setIssue] = useState<JiraIssue | null>(null);
    const [comments, setComments] = useState<JiraComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
    const [postingComment, setPostingComment] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<JiraAttachment | null>(null);
    const [loadedImageData, setLoadedImageData] = useState<{ [key: string]: string }>({});
    const [showAssigneePicker, setShowAssigneePicker] = useState(false);
    const [assignableUsers, setAssignableUsers] = useState<JiraUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [assigningUser, setAssigningUser] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [allUsers, setAllUsers] = useState<JiraUser[]>([]);
    const [issueLinks, setIssueLinks] = useState<any[]>([]);
    const [remoteLinks, setRemoteLinks] = useState<any[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [availableTransitions, setAvailableTransitions] = useState<any[]>([]);
    const [loadingTransitions, setLoadingTransitions] = useState(false);
    const [transitioningStatus, setTransitioningStatus] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [availableTypes, setAvailableTypes] = useState<any[]>([]);
    const [loadingTypes, setLoadingTypes] = useState(false);
    const [updatingType, setUpdatingType] = useState(false);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [availablePriorities, setAvailablePriorities] = useState<any[]>([]);
    const [loadingPriorities, setLoadingPriorities] = useState(false);
    const [updatingPriorityId, setUpdatingPriorityId] = useState<string | null>(null);
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
    const [updatingDueDate, setUpdatingDueDate] = useState(false);
    const [showStoryPointsPicker, setShowStoryPointsPicker] = useState(false);
    const [storyPointsInput, setStoryPointsInput] = useState('');
    const [updatingStoryPoints, setUpdatingStoryPoints] = useState(false);
    const [editingSummary, setEditingSummary] = useState(false);
    const [summaryInput, setSummaryInput] = useState('');
    const [updatingSummary, setUpdatingSummary] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [descriptionInput, setDescriptionInput] = useState('');
    const [updatingDescription, setUpdatingDescription] = useState(false);
    const richEditorRef = useRef<RichEditor>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [updatingComment, setUpdatingComment] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        loadIssueDetails();
        loadComments();
        loadLinks();
        loadCurrentUser();
    }, [issueKey]);

    useEffect(() => {
        console.log('Preview attachment state changed:', previewAttachment?.filename || 'null');
    }, [previewAttachment]);

    const loadCurrentUser = async () => {
        try {
            const user = await jiraApi.getCurrentUser();
            setCurrentUser(user);
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    };

    // Set content in RichEditor when modal opens
    useEffect(() => {
        if (editingDescription && descriptionInput && richEditorRef.current) {
            const timer = setTimeout(() => {
                console.log('Setting RichEditor content, length:', descriptionInput.length);
                console.log('First 200 chars:', descriptionInput.substring(0, 200));
                richEditorRef.current?.setContentHTML(descriptionInput);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [editingDescription]);

    // Preload image thumbnails when attachments are loaded
    useEffect(() => {
        if (issue?.fields.attachment) {
            issue.fields.attachment.forEach((attachment: any) => {
                if (attachment.mimeType.startsWith('image/') && !loadedImageData[attachment.id]) {
                    // Use full content URL for better quality instead of thumbnail
                    fetchImageWithAuth(attachment.content, attachment.id, attachment.mimeType);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [issue?.fields.attachment]);

    const loadIssueDetails = async () => {
        try {
            setLoading(true);
            const issueData = await jiraApi.getIssueDetails(issueKey);
            console.log('Issue data:', JSON.stringify(issueData, null, 2));
            console.log('Attachments:', issueData.fields.attachment);
            setIssue(issueData);
        } catch (error) {
            console.error('Error loading issue details:', error);
            Alert.alert('Error', 'Failed to load issue details');
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

            // Map comments and extract parent ID from the response
            const mappedComments = commentsData.map((comment: any) => {
                // Extract parent ID if it exists (only available in JSM projects)
                const parentId = comment.parent?.id || comment.parentId || null;

                return {
                    ...comment,
                    parentId,
                };
            });

            console.log('Mapped comments with parent IDs:', mappedComments.map(c => ({
                id: c.id,
                parentId: c.parentId,
                hasParent: !!c.parentId,
            })));

            setComments(mappedComments);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const loadLinks = async () => {
        if (Platform.OS === 'web') {
            return;
        }

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

    const getStatusColor = (statusCategory: string): string => {
        const colors: { [key: string]: string } = {
            done: '#36B37E',
            indeterminate: '#0065FF',
            new: '#6554C0',
            todo: '#6554C0',
            default: '#5E6C84',
        };
        return colors[statusCategory.toLowerCase()] || colors.default;
    };

    const getPriorityEmoji = (priority?: string): string => {
        if (!priority) return '📋';
        const emojiMap: { [key: string]: string } = {
            highest: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
            lowest: '🔵',
        };
        return emojiMap[priority.toLowerCase()] || '📋';
    };

    const renderDescriptionText = (description: any) => {
        // Handle simple string
        if (typeof description === 'string') {
            return <Text style={styles.description}>{description}</Text>;
        }

        // Handle ADF (Atlassian Document Format)
        if (description?.content && Array.isArray(description.content)) {
            console.log('Description content:', JSON.stringify(description.content, null, 2));

            return (
                <View>
                    {description.content.map((node: any, nodeIndex: number) => {
                        console.log('Processing node:', node.type, node);

                        if (node.type === 'paragraph' && node.content) {
                            const paragraphContent = node.content.map((item: any, itemIndex: number) => {
                                if (item.type === 'text') {
                                    // Check if text has link mark
                                    const linkMark = item.marks?.find((mark: any) => mark.type === 'link');
                                    if (linkMark && linkMark.attrs?.href) {
                                        return (
                                            <Text
                                                key={itemIndex}
                                                style={styles.linkText}
                                                onPress={() => Linking.openURL(linkMark.attrs.href)}
                                            >
                                                {item.text || linkMark.attrs.href}
                                            </Text>
                                        );
                                    }
                                    return <Text key={itemIndex}>{item.text || ''}</Text>;
                                } else if (item.type === 'mention') {
                                    return (
                                        <Text key={itemIndex} style={styles.mentionText}>
                                            {item.attrs?.text || '@user'}
                                        </Text>
                                    );
                                }
                                return null;
                            });
                            return (
                                <Text key={nodeIndex} style={styles.descriptionParagraph}>
                                    {paragraphContent}
                                </Text>
                            );
                        } else if (node.type === 'mediaSingle' && node.content) {
                            // Handle embedded media (images/attachments)
                            console.log('Found mediaSingle node:', node);
                            const mediaNode = node.content.find((n: any) => n.type === 'media');
                            console.log('Media node:', mediaNode);

                            if (mediaNode && mediaNode.attrs) {
                                const mediaType = mediaNode.attrs.type || 'file';
                                const altText = mediaNode.attrs.alt || '';

                                console.log('Media alt text (filename):', altText, 'Type:', mediaType);
                                console.log('Available attachments:', issue?.fields.attachment?.map((a: any) => ({ id: a.id, filename: a.filename })));

                                // Find the attachment by matching filename in alt text
                                const attachment = issue?.fields.attachment?.find((a: any) =>
                                    a.filename === altText || a.filename.includes(altText) || altText.includes(a.filename)
                                );

                                console.log('Found attachment:', attachment);

                                if (attachment && mediaType === 'file' && attachment.mimeType.startsWith('image/')) {
                                    return (
                                        <TouchableOpacity
                                            key={nodeIndex}
                                            onPress={() => handleAttachmentPress(attachment)}
                                            style={styles.descriptionImageContainer}
                                        >
                                            {loadedImageData[attachment.id] ? (
                                                <Image
                                                    source={{ uri: loadedImageData[attachment.id] }}
                                                    style={styles.descriptionImage}
                                                    resizeMode="contain"
                                                />
                                            ) : (
                                                <View style={styles.descriptionImagePlaceholder}>
                                                    <ActivityIndicator size="small" color="#0052CC" />
                                                    <Text style={styles.descriptionImagePlaceholderText}>
                                                        Loading image...
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                }
                            }
                        } else if (node.type === 'mediaGroup' && node.content) {
                            // Handle media groups (multiple files)
                            return (
                                <View key={nodeIndex} style={styles.mediaGroupContainer}>
                                    {node.content.map((mediaItem: any, mediaIndex: number) => {
                                        if (mediaItem.type === 'media' && mediaItem.attrs) {
                                            const altText = mediaItem.attrs.alt || '';
                                            const attachment = issue?.fields.attachment?.find((a: any) =>
                                                a.filename === altText || a.filename.includes(altText) || altText.includes(a.filename)
                                            );

                                            if (attachment && attachment.mimeType.startsWith('image/')) {
                                                return (
                                                    <TouchableOpacity
                                                        key={mediaIndex}
                                                        onPress={() => handleAttachmentPress(attachment)}
                                                        style={styles.descriptionImageContainer}
                                                    >
                                                        {loadedImageData[attachment.id] ? (
                                                            <Image
                                                                source={{ uri: loadedImageData[attachment.id] }}
                                                                style={styles.descriptionImage}
                                                                resizeMode="contain"
                                                            />
                                                        ) : (
                                                            <View style={styles.descriptionImagePlaceholder}>
                                                                <ActivityIndicator size="small" color="#0052CC" />
                                                                <Text style={styles.descriptionImagePlaceholderText}>
                                                                    Loading image...
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            }
                                        }
                                        return null;
                                    })}
                                </View>
                            );
                        } else if (node.type === 'codeBlock' && node.content) {
                            const codeText = node.content.map((text: any) => text.text || '').join('');
                            return (
                                <View key={nodeIndex} style={styles.codeBlockContainer}>
                                    <Text style={styles.codeBlockText}>{codeText}</Text>
                                </View>
                            );
                        }
                        return null;
                    })}
                </View>
            );
        }

        return <Text style={styles.description}>No description</Text>;
    };

    const renderCommentText = (comment: any) => {
        // Handle both simple string and ADF (Atlassian Document Format) content
        if (typeof comment.body === 'string') {
            // Parse plain text for URLs and make them clickable
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const parts = comment.body.split(urlRegex);

            return (
                <Text style={styles.commentBody}>
                    {parts.map((part: string, index: number) => {
                        if (part.match(urlRegex)) {
                            return (
                                <Text
                                    key={index}
                                    style={styles.linkText}
                                    onPress={() => Linking.openURL(part)}
                                >
                                    {part}
                                </Text>
                            );
                        }
                        return <Text key={index}>{part}</Text>;
                    })}
                </Text>
            );
        }

        // Extract text from ADF format
        if (comment.body?.content) {
            return (
                <View style={styles.commentBody}>
                    {comment.body.content.map((node: any, nodeIndex: number) => {
                        if (node.type === 'paragraph' && node.content) {
                            const paragraphText = node.content.map((item: any, itemIndex: number) => {
                                if (item.type === 'text') {
                                    // Check if text has link mark
                                    const linkMark = item.marks?.find((mark: any) => mark.type === 'link');
                                    if (linkMark && linkMark.attrs?.href) {
                                        return (
                                            <Text
                                                key={itemIndex}
                                                style={styles.linkText}
                                                onPress={() => Linking.openURL(linkMark.attrs.href)}
                                            >
                                                {item.text || linkMark.attrs.href}
                                            </Text>
                                        );
                                    }

                                    // Also check for plain URLs in text and linkify them
                                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                                    const textParts = (item.text || '').split(urlRegex);

                                    return textParts.map((part: string, partIndex: number) => {
                                        if (part.match(urlRegex)) {
                                            return (
                                                <Text
                                                    key={`${itemIndex}-${partIndex}`}
                                                    style={styles.linkText}
                                                    onPress={() => Linking.openURL(part)}
                                                >
                                                    {part}
                                                </Text>
                                            );
                                        }
                                        return <Text key={`${itemIndex}-${partIndex}`}>{part}</Text>;
                                    });
                                } else if (item.type === 'mention') {
                                    return (
                                        <Text key={itemIndex} style={styles.mentionText}>
                                            {item.attrs?.text || '@user'}
                                        </Text>
                                    );
                                }
                                return null;
                            });
                            return (
                                <Text key={nodeIndex} style={styles.paragraphText}>
                                    {paragraphText}
                                </Text>
                            );
                        } else if (node.type === 'codeBlock' && node.content) {
                            const codeText = node.content.map((text: any) => text.text || '').join('');
                            return (
                                <View key={nodeIndex} style={styles.codeBlockContainer}>
                                    <Text style={styles.codeBlockText}>{codeText}</Text>
                                </View>
                            );
                        }
                        return null;
                    })}
                </View>
            );
        }

        return <Text style={styles.commentBody}>No content</Text>;
    };

    const getFileIcon = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
        return '📎';
    };

    const fetchImageWithAuth = async (url: string, attachmentId: string, mimeType: string) => {
        try {
            const response = await jiraApi.fetchAttachment(url);
            const base64 = `data:${mimeType};base64,${response}`;
            setLoadedImageData(prev => ({ ...prev, [attachmentId]: base64 }));
            return base64;
        } catch (error) {
            console.error('Error fetching image:', error);
            return null;
        }
    };

    const handleAttachmentPress = (attachment: JiraAttachment) => {
        console.log('Attachment pressed:', attachment);
        // For images, fetch with authentication first (use full content URL for best quality)
        if (attachment.mimeType.startsWith('image/') && !loadedImageData[attachment.id]) {
            fetchImageWithAuth(attachment.content, attachment.id, attachment.mimeType);
        }
        // Show all attachments in modal preview
        setPreviewAttachment(attachment);
        console.log('Preview attachment set:', attachment.filename);
    };

    const renderAttachments = (attachments?: any[]) => {
        if (!attachments || attachments.length === 0) return null;

        console.log('Rendering attachments:', attachments);

        return (
            <View style={styles.attachmentsSection}>
                <Text style={styles.attachmentsTitle}>Attachments ({attachments.length})</Text>
                <View style={styles.attachmentsList}>
                    {attachments.map((attachment) => {
                        // Jira API returns: filename, mimeType, content (download URL), thumbnail, size
                        const filename = attachment.filename || 'Unknown file';
                        const mimeType = attachment.mimeType || '';
                        const contentUrl = attachment.content || '';
                        const thumbnailUrl = attachment.thumbnail || null;
                        const fileSize = attachment.size || 0;

                        const isImage = mimeType.startsWith('image/');

                        return (
                            <TouchableOpacity
                                key={attachment.id}
                                style={styles.attachmentItem}
                                onPress={() => handleAttachmentPress({
                                    id: attachment.id,
                                    filename,
                                    mimeType,
                                    content: contentUrl,
                                    thumbnail: thumbnailUrl,
                                    size: fileSize,
                                })}
                            >
                                {isImage && thumbnailUrl ? (
                                    loadedImageData[attachment.id] ? (
                                        <Image
                                            source={{ uri: loadedImageData[attachment.id] }}
                                            style={styles.attachmentThumbnail}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={styles.attachmentIconContainer}>
                                            <ActivityIndicator size="small" color="#0052CC" />
                                        </View>
                                    )
                                ) : (
                                    <View style={styles.attachmentIconContainer}>
                                        <Text style={styles.attachmentIcon}>
                                            {getFileIcon(mimeType)}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.attachmentInfo}>
                                    <Text style={styles.attachmentFilename} numberOfLines={2}>
                                        {filename}
                                    </Text>
                                    <Text style={styles.attachmentSize}>
                                        {(fileSize / 1024).toFixed(1)} KB
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const handleAssigneePress = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Changing assignee is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setLoadingUsers(true);
            setShowAssigneePicker(true);
            setSearchQuery('');
            const users = await jiraApi.getAssignableUsers(issueKey);
            setAllUsers(users);
            setAssignableUsers(users);
        } catch (error) {
            console.error('Error loading assignable users:', error);
            Alert.alert('Error', 'Failed to load assignable users');
            setShowAssigneePicker(false);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSearchUsers = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setAssignableUsers(allUsers);
            return;
        }

        try {
            setLoadingUsers(true);
            const users = await jiraApi.getAssignableUsers(issueKey, query);
            setAssignableUsers(users);
        } catch (error) {
            console.error('Error searching users:', error);
            // Fallback to local filter if API fails
            const filtered = allUsers.filter(user =>
                user.displayName.toLowerCase().includes(query.toLowerCase()) ||
                user.emailAddress?.toLowerCase().includes(query.toLowerCase())
            );
            setAssignableUsers(filtered);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAssignUser = async (accountId: string | null) => {
        try {
            setAssigningUser(true);
            await jiraApi.assignIssue(issueKey, accountId);
            await loadIssueDetails(); // Reload to get updated assignee
            setShowAssigneePicker(false);
            Alert.alert('Success', accountId ? 'Assignee updated successfully' : 'Issue unassigned successfully');
        } catch (error: any) {
            console.error('Error assigning issue:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to assign issue');
        } finally {
            setAssigningUser(false);
        }
    };

    const handleStatusPress = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Changing status is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setLoadingTransitions(true);
            setShowStatusPicker(true);
            const transitions = await jiraApi.getAvailableTransitions(issueKey);
            setAvailableTransitions(transitions);
        } catch (error) {
            console.error('Error loading transitions:', error);
            Alert.alert('Error', 'Failed to load available transitions');
            setShowStatusPicker(false);
        } finally {
            setLoadingTransitions(false);
        }
    };

    const handleTransitionIssue = async (transitionId: string, transitionName: string) => {
        try {
            setTransitioningStatus(true);
            await jiraApi.transitionIssue(issueKey, transitionId);
            await loadIssueDetails(); // Reload to get updated status
            setShowStatusPicker(false);
            Alert.alert('Success', `Status changed to ${transitionName}`);
        } catch (error: any) {
            console.error('Error transitioning issue:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to change status');
        } finally {
            setTransitioningStatus(false);
        }
    };

    const handleTypePress = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Changing type is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setLoadingTypes(true);
            setShowTypePicker(true);
            const projectKey = issueKey.split('-')[0];
            const types = await jiraApi.getProjectIssueTypes(projectKey);
            setAvailableTypes(types);
        } catch (error) {
            console.error('Error loading issue types:', error);
            Alert.alert('Error', 'Failed to load issue types');
            setShowTypePicker(false);
        } finally {
            setLoadingTypes(false);
        }
    };

    const handleUpdateType = async (typeId: string, typeName: string) => {
        try {
            setUpdatingType(true);
            await jiraApi.updateIssueField(issueKey, { issuetype: { id: typeId } });
            await loadIssueDetails();
            setShowTypePicker(false);
            Alert.alert('Success', `Type changed to ${typeName}`);
        } catch (error: any) {
            console.error('Error updating type:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to change type');
        } finally {
            setUpdatingType(false);
        }
    };

    const handlePriorityPress = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Changing priority is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setLoadingPriorities(true);
            setShowPriorityPicker(true);
            const priorities = await jiraApi.getPriorities();
            setAvailablePriorities(priorities);
        } catch (error) {
            console.error('Error loading priorities:', error);
            Alert.alert('Error', 'Failed to load priorities');
            setShowPriorityPicker(false);
        } finally {
            setLoadingPriorities(false);
        }
    };

    const handleUpdatePriority = async (priorityId: string, priorityName: string) => {
        try {
            setUpdatingPriorityId(priorityId);
            await jiraApi.updateIssueField(issueKey, { priority: { id: priorityId } });
            await loadIssueDetails();
            setShowPriorityPicker(false);
            Alert.alert('Success', `Priority changed to ${priorityName}`);
        } catch (error: any) {
            console.error('Error updating priority:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to change priority');
        } finally {
            setUpdatingPriorityId(null);
        }
    };

    const handleDueDatePress = () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Changing due date is not available on web due to CORS restrictions.');
            return;
        }
        const currentDate = issue?.fields.duedate ? new Date(issue.fields.duedate) : new Date();
        setSelectedDueDate(currentDate);
        setShowDueDatePicker(true);
    };

    const handleUpdateDueDate = async () => {
        try {
            setUpdatingDueDate(true);
            const dateString = selectedDueDate ? selectedDueDate.toISOString().split('T')[0] : null;
            await jiraApi.updateIssueField(issueKey, { duedate: dateString });
            await loadIssueDetails();
            setShowDueDatePicker(false);
            Alert.alert('Success', dateString ? 'Due date updated' : 'Due date cleared');
        } catch (error: any) {
            console.error('Error updating due date:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to update due date');
        } finally {
            setUpdatingDueDate(false);
        }
    };

    const handleStoryPointsPress = () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Changing story points is not available on web due to CORS restrictions.');
            return;
        }
        setStoryPointsInput(issue?.fields.customfield_10016?.toString() || '');
        setShowStoryPointsPicker(true);
    };

    const handleUpdateStoryPoints = async () => {
        try {
            setUpdatingStoryPoints(true);
            const points = storyPointsInput ? parseFloat(storyPointsInput) : null;
            await jiraApi.updateIssueField(issueKey, { customfield_10016: points });
            await loadIssueDetails();
            setShowStoryPointsPicker(false);
            Alert.alert('Success', 'Story points updated');
        } catch (error: any) {
            console.error('Error updating story points:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to update story points');
        } finally {
            setUpdatingStoryPoints(false);
        }
    };

    const handleSummaryEdit = () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Editing summary is not available on web due to CORS restrictions.');
            return;
        }
        setSummaryInput(issue?.fields.summary || '');
        setEditingSummary(true);
    };

    const handleUpdateSummary = async () => {
        if (!summaryInput.trim()) {
            Alert.alert('Error', 'Summary cannot be empty');
            return;
        }

        try {
            setUpdatingSummary(true);
            await jiraApi.updateIssueField(issueKey, { summary: summaryInput.trim() });
            await loadIssueDetails();
            setEditingSummary(false);
            Alert.alert('Success', 'Summary updated');
        } catch (error: any) {
            console.error('Error updating summary:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to update summary');
        } finally {
            setUpdatingSummary(false);
        }
    };

    const handleDescriptionEdit = () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Editing description is not available on web due to CORS restrictions.');
            return;
        }
        // Extract text from description ADF and convert to HTML with paragraphs
        const extractTextWithStructure = (node: any): string => {
            if (node.type === 'text') {
                return node.text || '';
            }
            if (node.type === 'paragraph') {
                const content = node.content ? node.content.map((child: any) => extractTextWithStructure(child)).join('') : '';
                return `<p>${content || '&nbsp;'}</p>`;
            }
            if (node.content) {
                return node.content.map((child: any) => extractTextWithStructure(child)).join('');
            }
            return '';
        };

        const text = issue?.fields.description ? extractTextWithStructure(issue.fields.description) : '<p>No description</p>';

        // Split text into paragraphs
        const paragraphs = text.split('</p>').filter(p => p.trim());

        // Build HTML content with attachments interspersed
        let htmlContent = '';

        if (issue?.fields.attachment && issue.fields.attachment.length > 0) {
            // Calculate how to distribute attachments
            const attachmentsPerSection = Math.ceil(issue.fields.attachment.length / Math.max(paragraphs.length, 1));
            let attachmentIndex = 0;

            paragraphs.forEach((para, index) => {
                // Add paragraph
                htmlContent += para + '</p>';

                // Add attachments after each paragraph/section
                if (issue?.fields.attachment && issue.fields.attachment.length > 0) {
                    const attachmentsToShow = issue.fields.attachment.slice(
                        attachmentIndex,
                        attachmentIndex + attachmentsPerSection
                    );

                    if (attachmentsToShow.length > 0) {
                        attachmentsToShow.forEach((attachment: any) => {
                            if (attachment.mimeType.startsWith('image/') && loadedImageData[attachment.id]) {
                                htmlContent += `
                                <div style="margin: 15px 0; padding: 10px; border: 1px solid #DFE1E6; border-radius: 8px; background: #F4F5F7;">
                                    <img src="${loadedImageData[attachment.id]}" style="max-width: 100%; height: auto; border-radius: 6px; display: block;" />
                                    <small style="display: block; margin-top: 8px; color: #5E6C84;">📎 ${attachment.filename}</small>
                                </div>`;
                            } else {
                                htmlContent += `
                                <div style="margin: 15px 0; padding: 15px; background: #f4f5f7; border: 1px solid #DFE1E6; border-radius: 8px;">
                                    <div style="font-size: 32px; text-align: center;">📄</div>
                                    <small style="display: block; margin-top: 8px; text-align: center; color: #172B4D;">${attachment.filename}</small>
                                    <small style="display: block; text-align: center; color: #5E6C84;">${(attachment.size / 1024).toFixed(1)} KB</small>
                                </div>`;
                            }
                        });
                        attachmentIndex += attachmentsPerSection;
                    }
                }
            });
        } else {
            htmlContent = text;
        }

        console.log('Generated HTML content length:', htmlContent.length);
        setDescriptionInput(htmlContent);
        setEditingDescription(true);
    };

    const handleUpdateDescription = async () => {
        try {
            setUpdatingDescription(true);

            // Strip HTML tags to get plain text for Jira ADF
            const stripHtml = (html: string) => {
                return html
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<hr\s*\/?>/gi, '\n---\n')
                    .replace(/<\/p>/gi, '\n')
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .trim();
            };

            const plainText = stripHtml(descriptionInput);

            const descriptionADF = plainText ? {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: plainText,
                            },
                        ],
                    },
                ],
            } : null;
            await jiraApi.updateIssueField(issueKey, { description: descriptionADF });
            await loadIssueDetails();
            setEditingDescription(false);
            Alert.alert('Success', 'Description updated');
        } catch (error: any) {
            console.error('Error updating description:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to update description');
        } finally {
            setUpdatingDescription(false);
        }
    };

    const handleCommentEdit = (comment: JiraComment) => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Editing comments is not available on web due to CORS restrictions.');
            return;
        }
        // Extract text from comment ADF
        const extractText = (node: any): string => {
            if (node.type === 'text') {
                return node.text || '';
            }
            if (node.content) {
                return node.content.map((child: any) => extractText(child)).join('');
            }
            return '';
        };
        const text = comment.body ? extractText(comment.body) : '';
        setEditCommentText(text);
        setEditingCommentId(comment.id);
    };

    const handleUpdateComment = async () => {
        if (!editCommentText.trim()) {
            Alert.alert('Error', 'Comment cannot be empty');
            return;
        }

        try {
            setUpdatingComment(true);
            await jiraApi.updateComment(issueKey, editingCommentId!, editCommentText.trim());
            await loadComments();
            setEditingCommentId(null);
            setEditCommentText('');
            Alert.alert('Success', 'Comment updated');
        } catch (error: any) {
            console.error('Error updating comment:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to update comment');
        } finally {
            setUpdatingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Deleting comments is not available on web due to CORS restrictions.');
            return;
        }

        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeletingCommentId(commentId);
                            await jiraApi.deleteComment(issueKey, commentId);
                            await loadComments();
                            Alert.alert('Success', 'Comment deleted');
                        } catch (error: any) {
                            console.error('Error deleting comment:', error);
                            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to delete comment');
                        } finally {
                            setDeletingCommentId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) {
            Alert.alert('Error', 'Please enter a comment');
            return;
        }

        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Adding comments is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setPostingComment(true);

            // Find mentioned user if replying
            let mentionedUser = undefined;
            if (replyToCommentId) {
                const parentComment = comments.find(c => c.id === replyToCommentId);
                if (parentComment) {
                    mentionedUser = {
                        accountId: parentComment.author.accountId,
                        displayName: parentComment.author.displayName,
                    };
                }
            }

            await jiraApi.addComment(issueKey, commentText, replyToCommentId || undefined, mentionedUser);
            setCommentText('');
            setReplyToCommentId(null);
            await loadComments();
            Alert.alert('Success', 'Comment added successfully');
        } catch (error: any) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', error?.response?.data?.errorMessages?.[0] || 'Failed to add comment');
        } finally {
            setPostingComment(false);
        }
    };

    const handleReply = (commentId: string) => {
        setReplyToCommentId(commentId);
    };

    const cancelReply = () => {
        setReplyToCommentId(null);
        setCommentText('');
    };

    // Build comment tree structure
    const buildCommentTree = (comments: JiraComment[]): (JiraComment & { replies: JiraComment[] })[] => {
        console.log('Building comment tree from comments:', comments.map(c => ({ id: c.id, parentId: c.parentId })));

        const commentMap = new Map<string, JiraComment & { replies: JiraComment[] }>();
        const rootComments: (JiraComment & { replies: JiraComment[] })[] = [];

        // First pass: create map with empty replies array
        comments.forEach(comment => {
            commentMap.set(comment.id, { ...comment, replies: [] });
        });

        // Second pass: build tree structure
        comments.forEach(comment => {
            const commentWithReplies = commentMap.get(comment.id)!;
            if (comment.parentId) {
                console.log(`Comment ${comment.id} has parent ${comment.parentId}`);
                const parent = commentMap.get(String(comment.parentId));
                if (parent) {
                    parent.replies.push(commentWithReplies);
                } else {
                    // Parent not found, treat as root comment
                    console.log(`Parent ${comment.parentId} not found for comment ${comment.id}`);
                    rootComments.push(commentWithReplies);
                }
            } else {
                console.log(`Comment ${comment.id} is a root comment`);
                rootComments.push(commentWithReplies);
            }
        });

        console.log('Root comments:', rootComments.length);
        console.log('Comment tree structure:', rootComments.map(c => ({ id: c.id, repliesCount: c.replies.length })));

        return rootComments;
    };

    const commentTree = React.useMemo(() => buildCommentTree(comments), [comments]);

    // Render comment with its replies recursively
    const renderComment = (comment: JiraComment & { replies: JiraComment[] }, depth: number = 0) => {
        const maxDepth = 5;
        const indentAmount = Math.min(depth, maxDepth) * 20;

        return (
            <View key={comment.id}>
                <View style={[styles.commentItem, { marginLeft: indentAmount }]}>
                    <View style={styles.commentAuthorRow}>
                        {comment.author.avatarUrls?.['48x48'] ? (
                            <Image
                                source={{ uri: comment.author.avatarUrls['48x48'] }}
                                style={styles.commentAvatarImage}
                            />
                        ) : (
                            <View style={styles.commentAvatar}>
                                <Text style={styles.commentAvatarText}>
                                    {comment.author.displayName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.commentMeta}>
                            <Text style={styles.commentAuthor}>
                                {comment.author.displayName}
                            </Text>
                            <Text style={styles.commentDate}>
                                {formatDate(comment.created)}
                            </Text>
                        </View>
                    </View>
                    {editingCommentId === comment.id ? (
                        <View style={styles.editCommentContainer}>
                            <TextInput
                                style={styles.editCommentInput}
                                value={editCommentText}
                                onChangeText={setEditCommentText}
                                placeholder="Edit your comment..."
                                multiline
                                numberOfLines={4}
                            />
                            <View style={styles.editCommentActions}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditingCommentId(null);
                                        setEditCommentText('');
                                    }}
                                    style={styles.editCancelButton}
                                >
                                    <Text style={styles.editCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleUpdateComment}
                                    style={styles.editSaveButton}
                                    disabled={updatingComment}
                                >
                                    <Text style={styles.editSaveButtonText}>
                                        {updatingComment ? 'Saving...' : 'Save'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            {renderCommentText(comment)}
                            <View style={styles.commentActions}>
                                <TouchableOpacity
                                    onPress={() => handleReply(comment.id)}
                                    style={styles.commentActionButton}
                                >
                                    <Text style={styles.commentActionText}>↩️ Reply</Text>
                                </TouchableOpacity>
                                {currentUser && comment.author.accountId === currentUser.accountId && (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => handleCommentEdit(comment)}
                                            style={styles.commentActionButton}
                                        >
                                            <Text style={styles.commentActionText}>✏️ Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteComment(comment.id)}
                                            style={[styles.commentActionButton, styles.deleteActionButton]}
                                            disabled={deletingCommentId === comment.id}
                                        >
                                            <Text style={styles.deleteActionText}>
                                                {deletingCommentId === comment.id ? '⏳' : '🗑️'} Delete
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </>
                    )}
                    {comment.replies.length > 0 && depth < maxDepth && (
                        <View style={styles.repliesIndicator}>
                            <Text style={styles.repliesCount}>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</Text>
                        </View>
                    )}
                </View>
                {/* Render replies recursively */}
                {comment.replies.length > 0 && depth < maxDepth &&
                    comment.replies.map(reply => renderComment(reply as JiraComment & { replies: JiraComment[] }, depth + 1))
                }
            </View>
        );
    };

    if (loading || !issue) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <LinearGradient
                    colors={['#0052CC', '#4C9AFF']}
                    style={styles.header}
                >
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Issue Details</Text>
                    <View style={styles.placeholder} />
                </LinearGradient>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#0052CC" />
                </View>
            </View>
        );
    }

    const statusColor = getStatusColor(
        issue.fields.status.statusCategory.key || issue.fields.status.statusCategory.colorName
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0052CC', '#4C9AFF']}
                style={styles.header}
            >
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Issue Details</Text>
                <View style={styles.placeholder} />
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Issue Key and Status */}
                    <View style={styles.card}>
                        <View style={styles.keyStatusRow}>
                            <Text style={styles.issueKey}>{issue.key}</Text>
                            <TouchableOpacity
                                style={[styles.statusBadge, { backgroundColor: statusColor }]}
                                onPress={handleStatusPress}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.statusText}>{issue.fields.status.name}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Summary */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.sectionTitle}>Summary</Text>
                            <TouchableOpacity onPress={handleSummaryEdit} style={styles.editButton}>
                                <Text style={styles.editButtonText}>✏️ Edit</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.summary}>{issue.fields.summary}</Text>
                    </View>

                    {/* Description */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <TouchableOpacity onPress={handleDescriptionEdit} style={styles.editButton}>
                                <Text style={styles.editButtonText}>✏️ Edit</Text>
                            </TouchableOpacity>
                        </View>
                        {issue.fields.description ? (
                            <View>
                                {renderDescriptionText(issue.fields.description)}

                                {/* Inline Attachments */}
                                {issue.fields.attachment && issue.fields.attachment.length > 0 && (
                                    <View style={styles.inlineAttachmentsSection}>
                                        <Text style={styles.inlineAttachmentsTitle}>
                                            📎 Attachments ({issue.fields.attachment.length})
                                        </Text>
                                        <View style={styles.inlineAttachmentsGrid}>
                                            {issue.fields.attachment.map((attachment: any) => (
                                                <TouchableOpacity
                                                    key={attachment.id}
                                                    style={styles.inlineAttachmentItem}
                                                    onPress={() => {
                                                        if (attachment.mimeType.startsWith('image/')) {
                                                            setPreviewAttachment(attachment);
                                                        } else {
                                                            Linking.openURL(attachment.content);
                                                        }
                                                    }}
                                                >
                                                    {attachment.mimeType.startsWith('image/') ? (
                                                        loadedImageData[attachment.id] ? (
                                                            <Image
                                                                source={{ uri: loadedImageData[attachment.id] }}
                                                                style={styles.inlineAttachmentImage}
                                                            />
                                                        ) : (
                                                            <View style={styles.inlineAttachmentPlaceholder}>
                                                                <ActivityIndicator size="small" color="#0052CC" />
                                                            </View>
                                                        )
                                                    ) : (
                                                        <View style={styles.inlineAttachmentFile}>
                                                            <Text style={styles.inlineAttachmentIcon}>📄</Text>
                                                        </View>
                                                    )}
                                                    <Text style={styles.inlineAttachmentName} numberOfLines={2}>
                                                        {attachment.filename}
                                                    </Text>
                                                    <Text style={styles.inlineAttachmentSize}>
                                                        {(attachment.size / 1024).toFixed(1)} KB
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <Text style={styles.emptyDescription}>No description</Text>
                        )}
                    </View>

                    {/* Details */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Details</Text>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Type:</Text>
                            <TouchableOpacity
                                style={styles.assigneeClickable}
                                onPress={handleTypePress}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.detailValue}>{issue.fields.issuetype.name}</Text>
                            </TouchableOpacity>
                        </View>

                        {issue.fields.priority && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Priority:</Text>
                                <TouchableOpacity
                                    style={styles.assigneeClickable}
                                    onPress={handlePriorityPress}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.priorityRow}>
                                        <Text style={styles.priorityEmoji}>
                                            {getPriorityEmoji(issue.fields.priority.name)}
                                        </Text>
                                        <Text style={styles.detailValue}>{issue.fields.priority.name}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Assignee:</Text>
                            {issue.fields.assignee ? (
                                <TouchableOpacity
                                    style={styles.assigneeClickable}
                                    onPress={handleAssigneePress}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.assigneeRow}>
                                        {issue.fields.assignee.avatarUrls?.['48x48'] ? (
                                            <Image
                                                source={{ uri: issue.fields.assignee.avatarUrls['48x48'] }}
                                                style={styles.assigneeAvatar}
                                            />
                                        ) : (
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>
                                                    {issue.fields.assignee.displayName.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.detailValue}>
                                            {issue.fields.assignee.displayName}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.assigneeClickable}
                                    onPress={handleAssigneePress}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.detailValue, styles.unassignedText]}>Unassigned</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Created:</Text>
                            <Text style={styles.detailValue}>{formatDate(issue.fields.created)}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Updated:</Text>
                            <Text style={styles.detailValue}>{formatDate(issue.fields.updated)}</Text>
                        </View>

                        {issue.fields.duedate !== undefined && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Due Date:</Text>
                                <TouchableOpacity
                                    style={styles.assigneeClickable}
                                    onPress={handleDueDatePress}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.detailValue, !issue.fields.duedate && styles.unassignedText]}>
                                        {issue.fields.duedate ? formatDateOnly(issue.fields.duedate) : 'Not set'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {issue.fields.customfield_10016 !== undefined && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Story Points:</Text>
                                <TouchableOpacity
                                    style={styles.assigneeClickable}
                                    onPress={handleStoryPointsPress}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.detailValue, !issue.fields.customfield_10016 && styles.unassignedText]}>
                                        {issue.fields.customfield_10016 || 'Not set'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Linked Issues and Pages */}
                    {(issueLinks.length > 0 || remoteLinks.length > 0) && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Links</Text>

                            {/* Issue Links */}
                            {issueLinks.map((link: any, index: number) => {
                                const linkedIssue = link.outwardIssue || link.inwardIssue;
                                const linkType = link.outwardIssue ? link.type.outward : link.type.inward;

                                if (!linkedIssue) return null;

                                return (
                                    <TouchableOpacity
                                        key={`issue-${index}`}
                                        style={styles.linkItem}
                                        onPress={() => Alert.alert('Linked Issue', `${linkedIssue.key}: ${linkedIssue.fields.summary}`)}
                                    >
                                        <View style={styles.linkIcon}>
                                            <Text style={styles.linkIconText}>🔗</Text>
                                        </View>
                                        <View style={styles.linkContent}>
                                            <Text style={styles.linkType}>{linkType}</Text>
                                            <Text style={styles.linkTitle}>
                                                {linkedIssue.key} - {linkedIssue.fields.summary}
                                            </Text>
                                            <Text style={styles.linkStatus}>
                                                {linkedIssue.fields.status.name}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Remote Links (Confluence pages, etc.) */}
                            {remoteLinks.map((link: any, index: number) => (
                                <TouchableOpacity
                                    key={`remote-${index}`}
                                    style={styles.linkItem}
                                    onPress={() => {
                                        const url = link.object?.url;
                                        if (url) {
                                            Linking.openURL(url);
                                        }
                                    }}
                                >
                                    <View style={styles.linkIcon}>
                                        <Text style={styles.linkIconText}>
                                            {link.object?.title?.toLowerCase().includes('confluence') ? '📄' : '🌐'}
                                        </Text>
                                    </View>
                                    <View style={styles.linkContent}>
                                        <Text style={styles.linkType}>
                                            {link.relationship || 'Related'}
                                        </Text>
                                        <Text style={styles.linkTitle}>
                                            {link.object?.title || 'External Link'}
                                        </Text>
                                        {link.object?.summary && (
                                            <Text style={styles.linkSummary} numberOfLines={2}>
                                                {link.object.summary}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Comments */}
                    <View style={styles.card}>
                        <View style={styles.commentHeader}>
                            <Text style={styles.sectionTitle}>Comments</Text>
                            <Text style={styles.commentCount}>({comments.length})</Text>
                        </View>

                        {Platform.OS === 'web' ? (
                            <Text style={styles.webWarning}>
                                💡 Comments are not available on web due to CORS restrictions. Please use the mobile app.
                            </Text>
                        ) : loadingComments ? (
                            <ActivityIndicator color="#0052CC" style={styles.commentsLoader} />
                        ) : comments.length > 0 ? (
                            <View>
                                {commentTree.map(comment => renderComment(comment, 0))}
                            </View>
                        ) : (
                            <Text style={styles.noComments}>No comments yet</Text>
                        )}
                    </View>

                    <View style={styles.bottomPadding} />
                </ScrollView>

                {/* Fixed Comment Input at Bottom */}
                {Platform.OS !== 'web' && (
                    <View style={styles.fixedCommentSection}>
                        {replyToCommentId && (
                            <View style={styles.replyIndicator}>
                                <Text style={styles.replyingToText}>
                                    Replying to {comments.find(c => c.id === replyToCommentId)?.author.displayName}
                                </Text>
                                <TouchableOpacity onPress={cancelReply}>
                                    <Text style={styles.cancelReplyText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.commentInputRow}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                placeholderTextColor="#999"
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity
                                style={[styles.postButton, (postingComment || !commentText.trim()) && styles.postButtonDisabled]}
                                onPress={handleAddComment}
                                disabled={postingComment || !commentText.trim()}
                            >
                                {postingComment ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.postButtonText}>Post</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>

            {/* Attachment Preview Modal */}
            <Modal
                visible={previewAttachment !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPreviewAttachment(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle} numberOfLines={1}>
                                {previewAttachment?.filename}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setPreviewAttachment(null)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Render content based on mime type */}
                        {previewAttachment?.mimeType.startsWith('image/') ? (
                            <ScrollView
                                style={styles.modalImageContainer}
                                contentContainerStyle={styles.modalImageContent}
                            >
                                {loadedImageData[previewAttachment.id] ? (
                                    <Image
                                        source={{ uri: loadedImageData[previewAttachment.id] }}
                                        style={styles.modalImage}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View style={styles.imageLoadingContainer}>
                                        <ActivityIndicator size="large" color="#0052CC" />
                                        <Text style={styles.imageLoadingText}>Loading image...</Text>
                                    </View>
                                )}
                            </ScrollView>
                        ) : (
                            <View style={styles.modalUnsupportedContainer}>
                                <Text style={styles.modalUnsupportedIcon}>{getFileIcon(previewAttachment?.mimeType || '')}</Text>
                                <Text style={styles.modalUnsupportedText}>
                                    {previewAttachment?.filename}
                                </Text>
                                <Text style={styles.modalUnsupportedHint}>
                                    {previewAttachment?.mimeType === 'application/pdf' && 'PDF - '}
                                    {previewAttachment?.mimeType.startsWith('video/') && 'Video - '}
                                    Click below to open in browser
                                </Text>
                            </View>
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalActionButton}
                                onPress={() => {
                                    if (previewAttachment) {
                                        Linking.openURL(previewAttachment.content);
                                    }
                                }}
                            >
                                <Text style={styles.modalActionText}>
                                    {previewAttachment?.mimeType.startsWith('image/') ? 'Open in Browser' : 'Open File'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Due Date Picker Modal */}
            <Modal
                visible={showDueDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDueDatePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Set Due Date</Text>
                            <TouchableOpacity
                                onPress={() => setShowDueDatePicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Due Date:</Text>
                            <Text style={styles.currentFieldValue}>
                                {issue.fields.duedate ? formatDateOnly(issue.fields.duedate) : 'Not set'}
                            </Text>
                        </View>

                        <View style={styles.datePickerContainer}>
                            <DateTimePicker
                                value={selectedDueDate || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, date) => {
                                    if (event.type === 'set' && date) {
                                        setSelectedDueDate(date);
                                    }
                                }}
                                style={styles.datePicker}
                            />
                            <View style={styles.dateActions}>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setSelectedDueDate(new Date())}
                                >
                                    <Text style={styles.dateButtonText}>Today</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.dateButton}
                                    onPress={() => setSelectedDueDate(null)}
                                >
                                    <Text style={styles.dateButtonText}>Clear</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleUpdateDueDate}
                            disabled={updatingDueDate}
                        >
                            {updatingDueDate ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Summary Edit Modal */}
            <Modal
                visible={editingSummary}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditingSummary(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Summary</Text>
                            <TouchableOpacity
                                onPress={() => setEditingSummary(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.summaryInput}
                            placeholder="Enter issue summary..."
                            value={summaryInput}
                            onChangeText={setSummaryInput}
                            multiline
                            numberOfLines={3}
                        />

                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleUpdateSummary}
                            disabled={updatingSummary}
                        >
                            {updatingSummary ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Description Edit Modal */}
            <Modal
                visible={editingDescription}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditingDescription(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.descriptionModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Description</Text>
                            <TouchableOpacity
                                onPress={() => setEditingDescription(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.richEditorWrapper}>
                            <RichToolbar
                                editor={richEditorRef}
                                actions={[
                                    actions.setBold,
                                    actions.setItalic,
                                    actions.setUnderline,
                                    actions.insertBulletsList,
                                    actions.insertOrderedList,
                                    actions.insertLink,
                                    actions.setStrikethrough,
                                    actions.heading1,
                                    actions.code,
                                ]}
                                iconTint="#172B4D"
                                selectedIconTint="#0052CC"
                                style={styles.richToolbar}
                            />

                            <ScrollView style={styles.richEditorScroll}>
                                <RichEditor
                                    ref={richEditorRef}
                                    onChange={(html) => setDescriptionInput(html)}
                                    placeholder="Enter issue description..."
                                    style={styles.richEditor}
                                    initialHeight={250}
                                    useContainer={true}
                                    editorStyle={{
                                        backgroundColor: '#FFFFFF',
                                        color: '#172B4D',
                                        placeholderColor: '#5E6C84',
                                        contentCSSText: 'font-size: 15px; padding: 12px;'
                                    }}
                                />
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleUpdateDescription}
                            disabled={updatingDescription}
                        >
                            {updatingDescription ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Story Points Picker Modal */}
            <Modal
                visible={showStoryPointsPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowStoryPointsPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Set Story Points</Text>
                            <TouchableOpacity
                                onPress={() => setShowStoryPointsPicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Story Points:</Text>
                            <Text style={styles.currentFieldValue}>
                                {issue.fields.customfield_10016 || 'Not set'}
                            </Text>
                        </View>

                        <TextInput
                            style={styles.storyPointsInput}
                            placeholder="Enter story points (e.g., 3, 5, 8)"
                            value={storyPointsInput}
                            onChangeText={setStoryPointsInput}
                            keyboardType="decimal-pad"
                        />

                        <View style={styles.quickPointsContainer}>
                            {[1, 2, 3, 5, 8, 13].map((point) => (
                                <TouchableOpacity
                                    key={point}
                                    style={styles.quickPointButton}
                                    onPress={() => setStoryPointsInput(point.toString())}
                                >
                                    <Text style={styles.quickPointText}>{point}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleUpdateStoryPoints}
                            disabled={updatingStoryPoints}
                        >
                            {updatingStoryPoints ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Type Picker Modal */}
            <Modal
                visible={showTypePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTypePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Type</Text>
                            <TouchableOpacity
                                onPress={() => setShowTypePicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Type:</Text>
                            <Text style={styles.currentFieldValue}>{issue.fields.issuetype.name}</Text>
                        </View>

                        {loadingTypes ? (
                            <View style={styles.statusLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : (
                            <ScrollView style={styles.statusList}>
                                {availableTypes
                                    .filter((type) => type.name !== issue.fields.issuetype.name)
                                    .map((type) => (
                                        <TouchableOpacity
                                            key={type.id}
                                            style={styles.statusItem}
                                            onPress={() => handleUpdateType(type.id, type.name)}
                                            disabled={updatingType}
                                        >
                                            <View style={styles.statusItemContent}>
                                                <Text style={styles.statusName}>{type.name}</Text>
                                            </View>
                                            {updatingType && (
                                                <ActivityIndicator size="small" color="#0052CC" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Priority Picker Modal */}
            <Modal
                visible={showPriorityPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPriorityPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Priority</Text>
                            <TouchableOpacity
                                onPress={() => setShowPriorityPicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Priority:</Text>
                            <View style={styles.priorityRow}>
                                <Text style={styles.priorityEmoji}>
                                    {getPriorityEmoji(issue.fields.priority?.name)}
                                </Text>
                                <Text style={styles.currentFieldValue}>{issue.fields.priority?.name || 'None'}</Text>
                            </View>
                        </View>

                        {loadingPriorities ? (
                            <View style={styles.statusLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : (
                            <ScrollView style={styles.statusList}>
                                {availablePriorities
                                    .filter((priority) => priority.name !== issue.fields.priority?.name)
                                    .map((priority) => (
                                        <TouchableOpacity
                                            key={priority.id}
                                            style={styles.statusItem}
                                            onPress={() => handleUpdatePriority(priority.id, priority.name)}
                                            disabled={updatingPriorityId !== null}
                                        >
                                            <View style={styles.statusItemContent}>
                                                <Text style={styles.priorityEmoji}>
                                                    {getPriorityEmoji(priority.name)}
                                                </Text>
                                                <Text style={styles.statusName}>{priority.name}</Text>
                                            </View>
                                            {updatingPriorityId === priority.id && (
                                                <ActivityIndicator size="small" color="#0052CC" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Status Picker Modal */}
            <Modal
                visible={showStatusPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowStatusPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Status</Text>
                            <TouchableOpacity
                                onPress={() => setShowStatusPicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Current Status Display */}
                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Status:</Text>
                            <View style={[
                                styles.currentStatusBadge,
                                { backgroundColor: statusColor }
                            ]}>
                                <Text style={styles.currentStatusText}>{issue.fields.status.name}</Text>
                            </View>
                        </View>

                        {loadingTransitions ? (
                            <View style={styles.statusLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : availableTransitions.length === 0 ? (
                            <View style={styles.statusLoadingContainer}>
                                <Text style={styles.noTransitionsText}>No status transitions available</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.statusList}>
                                {availableTransitions
                                    .filter((transition) => transition.to?.name !== issue.fields.status.name)
                                    .map((transition) => (
                                        <TouchableOpacity
                                            key={transition.id}
                                            style={styles.statusItem}
                                            onPress={() => handleTransitionIssue(transition.id, transition.name)}
                                            disabled={transitioningStatus}
                                        >
                                            <View style={styles.statusItemContent}>
                                                <View style={[
                                                    styles.statusIndicator,
                                                    { backgroundColor: getStatusColor(transition.to?.statusCategory?.key || 'default') }
                                                ]} />
                                                <View style={styles.statusInfo}>
                                                    <Text style={styles.statusName}>{transition.name}</Text>
                                                    {transition.to && (
                                                        <Text style={styles.statusDescription}>
                                                            Move to: {transition.to.name}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            {transitioningStatus && (
                                                <ActivityIndicator size="small" color="#0052CC" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Assignee Picker Modal */}
            <Modal
                visible={showAssigneePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAssigneePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.assigneeModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Assignee</Text>
                            <TouchableOpacity
                                onPress={() => setShowAssigneePicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search users..."
                            value={searchQuery}
                            onChangeText={handleSearchUsers}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        {loadingUsers ? (
                            <View style={styles.assigneeLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : (
                            <ScrollView style={styles.assigneeList}>
                                {/* Unassign option */}
                                <TouchableOpacity
                                    style={styles.assigneeItem}
                                    onPress={() => handleAssignUser(null)}
                                    disabled={assigningUser}
                                >
                                    <View style={styles.assigneeItemContent}>
                                        <View style={[styles.avatar, styles.unassignedAvatar]}>
                                            <Text style={styles.avatarText}>?</Text>
                                        </View>
                                        <View style={styles.assigneeInfo}>
                                            <Text style={styles.assigneeName}>Unassigned</Text>
                                            <Text style={styles.assigneeEmail}>Remove assignee</Text>
                                        </View>
                                    </View>
                                    {!issue?.fields.assignee && (
                                        <Text style={styles.selectedIndicator}>✓</Text>
                                    )}
                                </TouchableOpacity>

                                {assignableUsers.map((user) => {
                                    const isSelected = issue?.fields.assignee?.accountId === user.accountId;
                                    return (
                                        <TouchableOpacity
                                            key={user.accountId}
                                            style={styles.assigneeItem}
                                            onPress={() => handleAssignUser(user.accountId)}
                                            disabled={assigningUser}
                                        >
                                            <View style={styles.assigneeItemContent}>
                                                {user.avatarUrls?.['48x48'] ? (
                                                    <Image
                                                        source={{ uri: user.avatarUrls['48x48'] }}
                                                        style={styles.assigneeAvatar}
                                                    />
                                                ) : (
                                                    <View style={styles.avatar}>
                                                        <Text style={styles.avatarText}>
                                                            {user.displayName.charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View style={styles.assigneeInfo}>
                                                    <Text style={styles.assigneeName}>{user.displayName}</Text>
                                                    {user.emailAddress && (
                                                        <Text style={styles.assigneeEmail}>{user.emailAddress}</Text>
                                                    )}
                                                </View>
                                            </View>
                                            {isSelected && (
                                                <Text style={styles.selectedIndicator}>✓</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
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
        flex: 1,
    },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 15,
        marginTop: 15,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    keyStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    issueKey: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0052CC',
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
    },
    statusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#172B4D',
        marginBottom: 12,
    },
    summary: {
        fontSize: 18,
        color: '#172B4D',
        fontWeight: '500',
        lineHeight: 26,
    },
    description: {
        fontSize: 15,
        color: '#5E6C84',
        lineHeight: 22,
    },
    descriptionParagraph: {
        fontSize: 15,
        color: '#5E6C84',
        lineHeight: 22,
        marginBottom: 12,
    },
    descriptionImageContainer: {
        marginVertical: 12,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F4F5F7',
    },
    descriptionImage: {
        width: '100%',
        height: 250,
    },
    descriptionImagePlaceholder: {
        width: '100%',
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    descriptionImagePlaceholderText: {
        marginTop: 10,
        fontSize: 14,
        color: '#5E6C84',
    },
    mediaGroupContainer: {
        marginVertical: 12,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'center',
        minHeight: 24,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84',
        width: 90,
    },
    detailValue: {
        fontSize: 14,
        color: '#172B4D',
        flex: 1,
    },
    unassignedText: {
        fontStyle: 'italic',
        color: '#5E6C84',
    },
    priorityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    priorityEmoji: {
        fontSize: 16,
        marginRight: 6,
    },
    assigneeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    assigneeClickable: {
        flex: 1,
        paddingVertical: 2,
        paddingHorizontal: 4,
        marginLeft: -4,
        borderRadius: 4,
    },
    changeIndicator: {
        fontSize: 16,
        marginLeft: 6,
        opacity: 0.6,
    },
    assigneeModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        width: '80%',
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    assigneeModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: '#172B4D',
    },
    assigneeList: {
        maxHeight: 400,
    },
    assigneeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E1E4E8',
    },
    assigneeItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    assigneeInfo: {
        marginLeft: 12,
        flex: 1,
    },
    assigneeName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
    },
    assigneeEmail: {
        fontSize: 13,
        color: '#5E6C84',
        marginTop: 2,
    },
    selectedIndicator: {
        fontSize: 18,
        color: '#0052CC',
        marginLeft: 8,
    },
    assigneeLoadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unassignedAvatar: {
        backgroundColor: '#DFE1E6',
    },
    assigneeAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    searchInput: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    linkItem: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    linkIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    linkIconText: {
        fontSize: 20,
    },
    linkContent: {
        flex: 1,
    },
    linkType: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    linkTitle: {
        fontSize: 15,
        color: '#172B4D',
        fontWeight: '600',
        marginBottom: 4,
    },
    linkStatus: {
        fontSize: 13,
        color: '#5E6C84',
    },
    linkSummary: {
        fontSize: 13,
        color: '#5E6C84',
        marginTop: 4,
        lineHeight: 18,
    },
    statusModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        width: '80%',
        maxHeight: '60%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    currentStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        marginBottom: 12,
    },
    currentStatusLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84',
    },
    currentStatusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    currentStatusText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    currentFieldValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
    },
    statusList: {
        maxHeight: 400,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E1E4E8',
    },
    currentStatusItem: {
        backgroundColor: '#F4F5F7',
        opacity: 0.7,
    },
    statusItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    statusInfo: {
        flex: 1,
    },
    statusName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
    },
    statusDescription: {
        fontSize: 13,
        color: '#5E6C84',
        marginTop: 2,
    },
    statusLoadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noTransitionsText: {
        fontSize: 15,
        color: '#5E6C84',
        textAlign: 'center',
    },
    datePickerContainer: {
        marginVertical: 16,
        alignItems: 'center',
    },
    datePicker: {
        width: '100%',
        marginBottom: 12,
    },
    dateInput: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        marginBottom: 12,
    },
    dateActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    dateButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: '#F4F5F7',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    dateButtonText: {
        fontSize: 14,
        color: '#172B4D',
        fontWeight: '600',
    },
    storyPointsInput: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        marginVertical: 16,
    },
    quickPointsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    quickPointButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        marginVertical: 4,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    quickPointText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
    },
    updateButton: {
        backgroundColor: '#0052CC',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    avatarText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    commentHeaderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    commentCount: {
        fontSize: 14,
        color: '#5E6C84',
        marginLeft: 6,
    },
    replyButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    replyButtonText: {
        fontSize: 13,
        color: '#0052CC',
        fontWeight: '600',
    },
    webWarning: {
        fontSize: 14,
        color: '#5E6C84',
        lineHeight: 20,
        fontStyle: 'italic',
    },
    commentsLoader: {
        marginVertical: 20,
    },
    commentItem: {
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
    },
    commentHeader: {
        marginBottom: 12,
    },
    commentAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4C9AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    commentAvatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    commentAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    commentMeta: {
        flex: 1,
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
    },
    commentDate: {
        fontSize: 12,
        color: '#5E6C84',
        marginTop: 2,
    },
    commentBody: {
        fontSize: 14,
        color: '#172B4D',
        lineHeight: 20,
        marginLeft: 42,
    },
    paragraphText: {
        fontSize: 14,
        color: '#172B4D',
        lineHeight: 20,
        marginBottom: 8,
    },
    mentionText: {
        color: '#0052CC',
        fontWeight: '600',
    },
    linkText: {
        color: '#0052CC',
        textDecorationLine: 'underline',
    },
    codeBlockContainer: {
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
        padding: 12,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    codeBlockText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        color: '#172B4D',
        lineHeight: 18,
    },
    repliesIndicator: {
        marginLeft: 42,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
    },
    repliesCount: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '600',
        fontStyle: 'italic',
    },
    noComments: {
        fontSize: 14,
        color: '#A5ADBA',
        fontStyle: 'italic',
    },
    fixedCommentSection: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
        paddingHorizontal: 15,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 20 : 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    replyIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#EAF3FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    replyingToText: {
        fontSize: 13,
        color: '#0052CC',
        fontWeight: '600',
    },
    cancelReplyText: {
        fontSize: 18,
        color: '#5E6C84',
        fontWeight: '600',
    },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#F4F5F7',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: '#172B4D',
        borderWidth: 1.5,
        borderColor: '#DFE1E6',
        minHeight: 44,
        maxHeight: 80,
        textAlignVertical: 'top',
    },
    postButton: {
        backgroundColor: '#0052CC',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 65,
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    postButtonDisabled: {
        backgroundColor: '#A5ADBA',
        shadowOpacity: 0,
        elevation: 0,
    },
    postButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    bottomPadding: {
        height: 30,
    },
    attachmentsSection: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginHorizontal: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    attachmentsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 12,
    },
    attachmentsList: {
        gap: 10,
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    attachmentThumbnail: {
        width: 50,
        height: 50,
        borderRadius: 4,
        marginRight: 12,
    },
    attachmentIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 4,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    attachmentIcon: {
        fontSize: 24,
    },
    attachmentInfo: {
        flex: 1,
    },
    attachmentFilename: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 4,
    },
    attachmentSize: {
        fontSize: 12,
        color: '#5E6C84',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '90%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E8EBED',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        flex: 1,
        marginRight: 10,
    },
    modalCloseButton: {
        padding: 5,
    },
    modalCloseText: {
        fontSize: 24,
        color: '#5E6C84',
        fontWeight: '400',
    },
    modalImageContainer: {
        maxHeight: 500,
    },
    modalImageContent: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalImage: {
        width: '100%',
        height: 400,
    },
    imageLoadingContainer: {
        width: '100%',
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageLoadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#5E6C84',
    },
    modalUnsupportedContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
    },
    modalUnsupportedIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    modalUnsupportedText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        textAlign: 'center',
        marginBottom: 10,
    },
    modalUnsupportedHint: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center',
    },
    modalActions: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
    },
    modalActionButton: {
        backgroundColor: '#0052CC',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalActionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    editButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    editButtonText: {
        fontSize: 13,
        color: '#0052CC',
        fontWeight: '600',
    },
    emptyDescription: {
        fontSize: 15,
        color: '#5E6C84',
        fontStyle: 'italic',
    },
    inlineAttachmentsSection: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
    },
    inlineAttachmentsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 12,
    },
    inlineAttachmentsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    inlineAttachmentItem: {
        width: 100,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        padding: 8,
        alignItems: 'center',
    },
    inlineAttachmentImage: {
        width: 84,
        height: 84,
        borderRadius: 6,
        marginBottom: 6,
        resizeMode: 'cover',
    },
    inlineAttachmentPlaceholder: {
        width: 84,
        height: 84,
        borderRadius: 6,
        marginBottom: 6,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inlineAttachmentFile: {
        width: 84,
        height: 84,
        borderRadius: 6,
        marginBottom: 6,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    inlineAttachmentIcon: {
        fontSize: 40,
    },
    inlineAttachmentName: {
        fontSize: 11,
        color: '#172B4D',
        textAlign: 'center',
        marginBottom: 4,
        width: '100%',
    },
    inlineAttachmentSize: {
        fontSize: 10,
        color: '#5E6C84',
        textAlign: 'center',
    },
    commentActions: {
        flexDirection: 'row',
        gap: 6,
        marginLeft: 42,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F4F5F7',
    },
    commentActionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        backgroundColor: '#fff',
    },
    deleteActionButton: {
        borderColor: '#FFEBE6',
        backgroundColor: '#FFEBE6',
    },
    commentActionText: {
        fontSize: 12,
        color: '#0052CC',
        fontWeight: '600',
    },
    deleteActionText: {
        fontSize: 12,
        color: '#DE350B',
        fontWeight: '600',
    },
    editCommentContainer: {
        marginTop: 10,
    },
    editCommentInput: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        minHeight: 80,
        maxHeight: 150,
        textAlignVertical: 'top',
    },
    editCommentActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 10,
    },
    editCancelButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    editCancelButtonText: {
        fontSize: 14,
        color: '#5E6C84',
        fontWeight: '600',
    },
    editSaveButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        backgroundColor: '#0052CC',
    },
    editSaveButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    summaryInput: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
        padding: 12,
        fontSize: 15,
        minHeight: 70,
        maxHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 15,
    },
    descriptionInput: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
        padding: 12,
        fontSize: 15,
        minHeight: 150,
        maxHeight: 250,
        textAlignVertical: 'top',
        marginBottom: 15,
    },
    descriptionModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        width: '90%',
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    richEditorWrapper: {
        height: 400,
        marginBottom: 15,
    },
    richToolbar: {
        backgroundColor: '#F4F5F7',
        borderRadius: 6,
        marginBottom: 10,
        height: 50,
    },
    richEditorScroll: {
        flex: 1,
    },
    richEditor: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
    },
    editModalAttachmentsSection: {
        marginTop: 10,
        marginBottom: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#DFE1E6',
    },
    editModalAttachmentsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 10,
    },
    editModalAttachmentsScroll: {
        maxHeight: 100,
    },
    editModalAttachmentThumb: {
        width: 80,
        height: 80,
        marginRight: 10,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F4F5F7',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    editModalAttachmentImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    editModalAttachmentPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    editModalAttachmentFile: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    editModalAttachmentIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    editModalAttachmentName: {
        fontSize: 10,
        color: '#172B4D',
        textAlign: 'center',
    },
});
