import React, { useRef, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    ScrollView,
    ActivityIndicator,
    Linking,
    Platform,
} from 'react-native';
import { linkifyText } from '../../utils/linkify';

interface JiraUser {
    accountId: string;
    displayName: string;
    emailAddress?: string;
    avatarUrls: { '48x48': string };
}

interface JiraComment {
    id: string;
    author: JiraUser;
    body: any;
    created: string;
    updated: string;
    parentId?: string | number;
}

interface JiraAttachment {
    id: string;
    filename: string;
    mimeType: string;
    content: string;
    thumbnail?: string;
    size?: number;
}

interface IssueCommentsSectionProps {
    comments: JiraComment[];
    currentUser: JiraUser | null;
    attachments?: JiraAttachment[];
    loadedImageData?: Record<string, string>;
    authHeaders?: Record<string, string>;
    // Comment input
    commentText: string;
    onCommentTextChange: (text: string) => void;
    onSubmitComment: () => void;
    postingComment?: boolean;
    replyToCommentId: string | null;
    onCancelReply: () => void;
    // Comment actions
    onReply: (commentId: string) => void;
    onEditComment: (comment: JiraComment) => void;
    onDeleteComment: (commentId: string) => void;
    deletingCommentId: string | null;
    // Edit comment
    editingCommentId: string | null;
    editCommentText: string;
    onEditCommentTextChange: (text: string) => void;
    onUpdateComment: () => void;
    onCancelEdit: () => void;
    updatingComment?: boolean;
    // Mention suggestions
    showMentionSuggestions: boolean;
    mentionSuggestions: JiraUser[];
    loadingMentions: boolean;
    onSelectMention: (user: JiraUser) => void;
    // Edit mention suggestions
    showEditMentionSuggestions: boolean;
    editMentionSuggestions: JiraUser[];
    loadingEditMentions: boolean;
    onSelectEditMention: (user: JiraUser) => void;
    // Attachment handling
    onAttachmentPress: (attachment: JiraAttachment) => void;
    // User info popup
    onMentionPress?: (accountId: string, displayName: string) => void;
}

export default function IssueCommentsSection({
    comments,
    currentUser,
    attachments = [],
    loadedImageData = {},
    authHeaders = {},
    commentText,
    onCommentTextChange,
    onSubmitComment,
    postingComment = false,
    replyToCommentId,
    onCancelReply,
    onReply,
    onEditComment,
    onDeleteComment,
    deletingCommentId,
    editingCommentId,
    editCommentText,
    onEditCommentTextChange,
    onUpdateComment,
    onCancelEdit,
    updatingComment = false,
    showMentionSuggestions,
    mentionSuggestions,
    loadingMentions,
    onSelectMention,
    showEditMentionSuggestions,
    editMentionSuggestions,
    loadingEditMentions,
    onSelectEditMention,
    onAttachmentPress,
    onMentionPress,
}: IssueCommentsSectionProps) {
    const [loadingAttachments, setLoadingAttachments] = useState<Record<string, boolean>>({});
    const commentInputRef = useRef<TextInput>(null);
    const editCommentInputRef = useRef<TextInput>(null);

    const handleImageLoadStart = (attachmentId: string) => {
        setLoadingAttachments(prev => ({ ...prev, [attachmentId]: true }));
    };

    const handleImageLoadEnd = (attachmentId: string) => {
        setLoadingAttachments(prev => ({ ...prev, [attachmentId]: false }));
    };

    const getFileIcon = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
        return '📎';
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const renderCommentText = (comment: JiraComment) => {
        // Handle both simple string and ADF (Atlassian Document Format) content
        if (typeof comment.body === 'string') {
            return (
                <Text style={styles.commentBody}>
                    {linkifyText(comment.body, { linkStyle: styles.linkText })}
                </Text>
            );
        }

        // Extract text from ADF format
        if (comment.body?.content) {
            console.log('=== COMMENT BODY DEBUG ===');
            console.log('Comment ID:', comment.id);
            console.log('Body structure:', JSON.stringify(comment.body, null, 2));
            return (
                <View style={styles.commentBody}>
                    {comment.body.content.map((node: any, nodeIndex: number) => {
                        console.log('Processing node type:', node.type);
                        if (node.type === 'paragraph' && node.content) {
                            // Check if paragraph contains mediaInline or other non-text items that need View
                            const hasMediaInline = node.content.some((item: any) =>
                                item.type === 'mediaInline' || item.type === 'inlineCard'
                            );

                            // If paragraph has media inline, use View with flex, otherwise use Text for proper wrapping
                            if (hasMediaInline) {
                                return (
                                    <View key={nodeIndex} style={styles.paragraphContainer}>
                                        {node.content.map((item: any, itemIndex: number) => {
                                            if (item.type === 'text') {
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
                                                return (
                                                    <Text key={itemIndex} style={styles.paragraphText}>
                                                        {linkifyText(item.text || '', { linkStyle: styles.linkText })}
                                                    </Text>
                                                );
                                            } else if (item.type === 'mention') {
                                                const mentionText = item.attrs?.text?.replace('@', '') || 'user';
                                                const accountId = item.attrs?.id || '';
                                                return (
                                                    <Text
                                                        key={itemIndex}
                                                        style={styles.mentionInlineChip}
                                                        onPress={() => onMentionPress?.(accountId, mentionText)}
                                                    >
                                                        {mentionText}
                                                    </Text>
                                                );
                                            } else if (item.type === 'inlineCard') {
                                                const url = item.attrs?.url || '';
                                                return (
                                                    <Text
                                                        key={itemIndex}
                                                        style={styles.linkText}
                                                        onPress={() => Linking.openURL(url)}
                                                    >
                                                        {url}
                                                    </Text>
                                                );
                                            } else if (item.type === 'mediaInline') {
                                                // Handle inline media attachments (like file icons in comments)
                                                const mediaId = item.attrs?.id;
                                                const mediaType = item.attrs?.type || 'file';

                                                console.log('=== MEDIA INLINE DEBUG ===');
                                                console.log('mediaInline attrs:', JSON.stringify(item.attrs, null, 2));
                                                console.log('Looking for attachment with ID:', mediaId);
                                                console.log('Total attachments available:', attachments?.length || 0);
                                                if (attachments?.length) {
                                                    console.log('Attachment IDs:', attachments.map((a: any) => a.id));
                                                }

                                                // Try to find attachment by ID first, but this usually won't work
                                                // because mediaInline uses UUIDs while attachments have numeric IDs
                                                let attachment = attachments?.find((a: any) => a.id === mediaId);

                                                console.log('Found attachment:', attachment ? attachment.filename : 'NOT FOUND');
                                                if (attachment) {
                                                    console.log('Full attachment object:', JSON.stringify(attachment, null, 2));
                                                }

                                                // If not found, create a generic placeholder
                                                // The actual file should be accessible via the issue's attachments
                                                if (!attachment && mediaId) {
                                                    console.log('Creating placeholder for mediaInline - file may be in attachments but not matched');
                                                    attachment = {
                                                        id: mediaId,
                                                        filename: 'File Attachment',
                                                        mimeType: 'application/octet-stream',
                                                        content: '', // Empty - will need special handling
                                                    };
                                                }

                                                if (attachment) {
                                                    return (
                                                        <TouchableOpacity
                                                            key={itemIndex}
                                                            onPress={() => {
                                                                if (attachment.content) {
                                                                    onAttachmentPress(attachment);
                                                                } else {
                                                                    console.warn('Attachment has no content URL');
                                                                }
                                                            }}
                                                            style={styles.inlineAttachmentButton}
                                                        >
                                                            <Text style={styles.inlineAttachmentIcon}>
                                                                {getFileIcon(attachment.mimeType)}
                                                            </Text>
                                                            <Text style={styles.inlineAttachmentText}>
                                                                {attachment.filename}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                }
                                                return null;
                                            }
                                            return null;
                                        })}
                                    </View>
                                );
                            } else {
                                // Normal paragraph without media - use Text for proper text wrapping
                                return (
                                    <Text key={nodeIndex} style={styles.paragraphText}>
                                        {node.content.map((item: any, itemIndex: number) => {
                                            if (item.type === 'text') {
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
                                                return (
                                                    <Text key={itemIndex}>
                                                        {linkifyText(item.text || '', { linkStyle: styles.linkText })}
                                                    </Text>
                                                );
                                            } else if (item.type === 'mention') {
                                                const mentionText = item.attrs?.text?.replace('@', '') || 'user';
                                                const accountId = item.attrs?.id || '';
                                                return (
                                                    <Text
                                                        key={itemIndex}
                                                        style={styles.mentionInlineChip}
                                                        onPress={() => onMentionPress?.(accountId, mentionText)}
                                                    >
                                                        {mentionText}
                                                    </Text>
                                                );
                                            }
                                            return null;
                                        })}
                                    </Text>
                                );
                            }
                        } else if (node.type === 'mediaSingle' && node.content) {
                            const mediaNode = node.content.find((n: any) => n.type === 'media');
                            if (mediaNode && mediaNode.attrs) {
                                console.log('=== MEDIA NODE DEBUG ===');
                                console.log('mediaNode.attrs:', JSON.stringify(mediaNode.attrs, null, 2));
                                console.log('Available attachments:', attachments?.length || 0);

                                const altText = mediaNode.attrs.alt || '';
                                const mediaId = mediaNode.attrs.id;
                                const mediaUrl = mediaNode.attrs.url;
                                const mediaCollection = mediaNode.attrs.collection;

                                console.log('altText:', altText);
                                console.log('mediaId:', mediaId);
                                console.log('mediaUrl:', mediaUrl);
                                console.log('mediaCollection:', mediaCollection);

                                // Try to find attachment by ID first, then by filename
                                let attachment = attachments?.find(
                                    (a: any) => {
                                        console.log('Checking attachment:', a.id, a.filename);
                                        return (mediaId && a.id === mediaId) ||
                                            a.filename === altText ||
                                            a.filename.includes(altText) ||
                                            altText.includes(a.filename);
                                    }
                                );

                                console.log('Found attachment:', attachment ? attachment.id : 'NOT FOUND');

                                // If not found in attachments array, create a temporary attachment object from media node
                                if (!attachment && (mediaId || mediaUrl)) {
                                    console.log('Creating temporary attachment');
                                    attachment = {
                                        id: mediaId || `temp-${Date.now()}`,
                                        filename: altText || 'attachment',
                                        mimeType: altText.endsWith('.pdf') ? 'application/pdf' :
                                            altText.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/jpeg' : 'application/octet-stream',
                                        content: mediaUrl || '',
                                    };
                                    console.log('Temp attachment created:', attachment);
                                }

                                if (attachment) {
                                    const isImage = attachment.mimeType.startsWith('image/');
                                    const isVideo = attachment.mimeType.startsWith('video/');
                                    const isPdf = attachment.mimeType === 'application/pdf';

                                    return (
                                        <TouchableOpacity
                                            key={nodeIndex}
                                            onPress={() => onAttachmentPress(attachment)}
                                            style={styles.commentAttachmentContainer}
                                        >
                                            {isImage ? (
                                                <View style={styles.commentImageWrapper}>
                                                    {loadingAttachments[attachment.id] && (
                                                        <View style={styles.imageLoadingOverlay}>
                                                            <ActivityIndicator size="large" color="#0052CC" />
                                                        </View>
                                                    )}
                                                    <Image
                                                        source={
                                                            loadedImageData[attachment.id]
                                                                ? { uri: loadedImageData[attachment.id] }
                                                                : { uri: attachment.content, headers: authHeaders }
                                                        }
                                                        style={styles.commentAttachmentImage}
                                                        resizeMode="cover"
                                                        onLoadStart={() => handleImageLoadStart(attachment.id)}
                                                        onLoadEnd={() => handleImageLoadEnd(attachment.id)}
                                                        onError={() => handleImageLoadEnd(attachment.id)}
                                                    />
                                                </View>
                                            ) : (
                                                <View style={styles.commentAttachmentPlaceholder}>
                                                    <Text style={styles.commentAttachmentIcon}>
                                                        {getFileIcon(attachment.mimeType)}
                                                    </Text>
                                                    <View style={styles.commentAttachmentInfo}>
                                                        <Text
                                                            style={styles.commentAttachmentName}
                                                            numberOfLines={1}
                                                        >
                                                            {attachment.filename}
                                                        </Text>
                                                        <Text style={styles.commentAttachmentSize}>
                                                            {isImage && 'Image • '}
                                                            {isVideo && 'Video • '}
                                                            {isPdf && 'PDF • '}
                                                            {attachment.size
                                                                ? `${(attachment.size / 1024).toFixed(1)} KB`
                                                                : 'Size unknown'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                }
                            }
                            return null;
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

    // Build comment tree structure
    const buildCommentTree = (
        comments: JiraComment[]
    ): (JiraComment & { replies: JiraComment[] })[] => {
        const commentMap = new Map<string, JiraComment & { replies: JiraComment[] }>();
        const rootComments: (JiraComment & { replies: JiraComment[] })[] = [];

        // First pass: create map with empty replies array
        comments.forEach((comment) => {
            commentMap.set(comment.id, { ...comment, replies: [] });
        });

        // Second pass: build tree structure
        comments.forEach((comment) => {
            const commentWithReplies = commentMap.get(comment.id)!;
            if (comment.parentId) {
                const parent = commentMap.get(String(comment.parentId));
                if (parent) {
                    parent.replies.push(commentWithReplies);
                } else {
                    rootComments.push(commentWithReplies);
                }
            } else {
                rootComments.push(commentWithReplies);
            }
        });

        return rootComments;
    };

    const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

    // Render comment with its replies recursively
    const renderComment = (
        comment: JiraComment & { replies: JiraComment[] },
        depth: number = 0
    ) => {
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
                            <Text style={styles.commentAuthor}>{comment.author.displayName}</Text>
                            <Text style={styles.commentDate}>{formatDate(comment.created)}</Text>
                        </View>
                    </View>
                    {editingCommentId === comment.id ? (
                        <View style={styles.editCommentContainer}>
                            {showEditMentionSuggestions && (
                                <View style={styles.mentionSuggestionsPopup}>
                                    {loadingEditMentions ? (
                                        <View style={styles.mentionLoadingContainer}>
                                            <ActivityIndicator size="small" color="#0052CC" />
                                            <Text style={styles.mentionLoadingText}>Loading...</Text>
                                        </View>
                                    ) : editMentionSuggestions.length > 0 ? (
                                        <ScrollView style={styles.mentionSuggestionsList}>
                                            {editMentionSuggestions.map((user) => (
                                                <TouchableOpacity
                                                    key={user.accountId}
                                                    style={styles.mentionSuggestionItem}
                                                    onPress={() => onSelectEditMention(user)}
                                                >
                                                    {user.avatarUrls?.['48x48'] ? (
                                                        <Image
                                                            source={{ uri: user.avatarUrls['48x48'] }}
                                                            style={styles.mentionUserAvatar}
                                                        />
                                                    ) : (
                                                        <View
                                                            style={[
                                                                styles.mentionUserAvatar,
                                                                styles.mentionAvatarPlaceholder,
                                                            ]}
                                                        >
                                                            <Text style={styles.mentionAvatarText}>
                                                                {user.displayName.charAt(0).toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.mentionUserInfo}>
                                                        <Text style={styles.mentionUserName}>
                                                            {user.displayName}
                                                        </Text>
                                                        <Text style={styles.mentionUserEmail}>
                                                            {user.emailAddress}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    ) : (
                                        <Text style={styles.mentionNoResults}>No users found</Text>
                                    )}
                                </View>
                            )}
                            <TextInput
                                ref={editCommentInputRef}
                                style={styles.editCommentInput}
                                value={editCommentText}
                                onChangeText={onEditCommentTextChange}
                                placeholder="Edit your comment..."
                                multiline
                                numberOfLines={4}
                            />
                            <View style={styles.editCommentActions}>
                                <TouchableOpacity onPress={onCancelEdit} style={styles.editCancelButton}>
                                    <Text style={styles.editCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={onUpdateComment}
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
                                    onPress={() => onReply(comment.id)}
                                    style={styles.commentActionButton}
                                >
                                    <Text style={styles.commentActionText}>↩️ Reply</Text>
                                </TouchableOpacity>
                                {currentUser && comment.author.accountId === currentUser.accountId && (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => onEditComment(comment)}
                                            style={styles.commentActionButton}
                                        >
                                            <Text style={styles.commentActionText}>✏️ Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => onDeleteComment(comment.id)}
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
                            <Text style={styles.repliesCount}>
                                {comment.replies.length}{' '}
                                {comment.replies.length === 1 ? 'reply' : 'replies'}
                            </Text>
                        </View>
                    )}
                </View>
                {comment.replies.length > 0 &&
                    depth < maxDepth &&
                    comment.replies.map((reply) =>
                        renderComment(reply as JiraComment & { replies: JiraComment[] }, depth + 1)
                    )}
            </View>
        );
    };

    const replyToComment = comments.find((c) => c.id === replyToCommentId);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Comments ({comments.length})</Text>

            {/* Comment Input */}
            <View style={styles.commentInputSection}>
                {replyToCommentId && replyToComment && (
                    <View style={styles.replyBanner}>
                        <Text style={styles.replyBannerText}>
                            Replying to {replyToComment.author.displayName}
                        </Text>
                        <TouchableOpacity onPress={onCancelReply}>
                            <Text style={styles.replyBannerClose}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {showMentionSuggestions && (
                    <View style={styles.mentionSuggestionsPopup}>
                        {loadingMentions ? (
                            <View style={styles.mentionLoadingContainer}>
                                <ActivityIndicator size="small" color="#0052CC" />
                                <Text style={styles.mentionLoadingText}>Loading...</Text>
                            </View>
                        ) : mentionSuggestions.length > 0 ? (
                            <ScrollView style={styles.mentionSuggestionsList}>
                                {mentionSuggestions.map((user) => (
                                    <TouchableOpacity
                                        key={user.accountId}
                                        style={styles.mentionSuggestionItem}
                                        onPress={() => onSelectMention(user)}
                                    >
                                        {user.avatarUrls?.['48x48'] ? (
                                            <Image
                                                source={{ uri: user.avatarUrls['48x48'] }}
                                                style={styles.mentionUserAvatar}
                                            />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.mentionUserAvatar,
                                                    styles.mentionAvatarPlaceholder,
                                                ]}
                                            >
                                                <Text style={styles.mentionAvatarText}>
                                                    {user.displayName.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.mentionUserInfo}>
                                            <Text style={styles.mentionUserName}>{user.displayName}</Text>
                                            <Text style={styles.mentionUserEmail}>{user.emailAddress}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.mentionNoResults}>No users found</Text>
                        )}
                    </View>
                )}

                <TextInput
                    ref={commentInputRef}
                    style={styles.commentInput}
                    value={commentText}
                    onChangeText={onCommentTextChange}
                    placeholder="Add a comment... (type @ to mention)"
                    multiline
                    numberOfLines={4}
                />
                <TouchableOpacity
                    onPress={onSubmitComment}
                    style={[
                        styles.addCommentButton,
                        (!commentText.trim() || postingComment) && styles.addCommentButtonDisabled,
                    ]}
                    disabled={!commentText.trim() || postingComment}
                >
                    <Text style={styles.addCommentButtonText}>
                        {postingComment ? 'Posting...' : 'Post Comment'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Comment Tree */}
            <View style={styles.commentsList}>
                {commentTree.map((comment) => renderComment(comment))}
            </View>

            {comments.length === 0 && (
                <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 16,
    },
    commentInputSection: {
        marginBottom: 20,
    },
    replyBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#E6FCFF',
        padding: 10,
        borderRadius: 6,
        marginBottom: 8,
    },
    replyBannerText: {
        fontSize: 14,
        color: '#0052CC',
        fontWeight: '500',
    },
    replyBannerClose: {
        fontSize: 18,
        color: '#0052CC',
        fontWeight: 'bold',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
        padding: 12,
        fontSize: 14,
        color: '#172B4D',
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 8,
    },
    addCommentButton: {
        backgroundColor: '#0052CC',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    addCommentButtonDisabled: {
        backgroundColor: '#B3D4FF',
    },
    addCommentButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    commentsList: {
        marginTop: 8,
    },
    commentItem: {
        backgroundColor: '#F4F5F7',
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
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
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    commentAvatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    commentAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
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
        color: '#7A869A',
    },
    commentBody: {
        fontSize: 14,
        color: '#42526E',
        lineHeight: 20,
        marginBottom: 8,
    },
    paragraphContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 4,
    },
    paragraphText: {
        fontSize: 14,
        color: '#42526E',
        lineHeight: 20,
        marginBottom: 4,
    },
    linkText: {
        color: '#0052CC',
        textDecorationLine: 'underline',
    },
    mentionInlineChip: {
        color: '#0052CC',
        backgroundColor: '#E6FCFF',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 3,
        fontWeight: '500',
    },
    commentAttachmentContainer: {
        marginVertical: 8,
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    commentImageWrapper: {
        width: '100%',
        position: 'relative',
    },
    imageLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 1,
    },
    commentAttachmentImage: {
        width: '100%',
        height: 150,
    },
    commentAttachmentPlaceholder: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    commentAttachmentIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    commentAttachmentInfo: {
        flex: 1,
    },
    commentAttachmentName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 4,
    },
    commentAttachmentSize: {
        fontSize: 12,
        color: '#7A869A',
    },
    codeBlockContainer: {
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
        padding: 8,
        marginVertical: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#DFE1E6',
    },
    codeBlockText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 12,
        color: '#172B4D',
    },
    commentActions: {
        flexDirection: 'row',
        gap: 12,
    },
    commentActionButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    deleteActionButton: {
        borderColor: '#FF5630',
    },
    commentActionText: {
        fontSize: 13,
        color: '#42526E',
    },
    deleteActionText: {
        fontSize: 13,
        color: '#FF5630',
    },
    repliesIndicator: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#DFE1E6',
    },
    repliesCount: {
        fontSize: 12,
        color: '#7A869A',
        fontStyle: 'italic',
    },
    editCommentContainer: {
        marginBottom: 8,
    },
    editCommentInput: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        color: '#172B4D',
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    editCommentActions: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
    },
    editCancelButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    editCancelButtonText: {
        color: '#42526E',
        fontSize: 14,
    },
    editSaveButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#0052CC',
        borderRadius: 4,
    },
    editSaveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    mentionSuggestionsPopup: {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 6,
        marginBottom: 8,
        maxHeight: 200,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 1000,
    },
    mentionLoadingContainer: {
        padding: 16,
        alignItems: 'center',
    },
    mentionLoadingText: {
        marginTop: 8,
        fontSize: 14,
        color: '#7A869A',
    },
    mentionSuggestionsList: {
        maxHeight: 200,
    },
    mentionSuggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    mentionUserAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    mentionAvatarPlaceholder: {
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mentionAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    mentionUserInfo: {
        flex: 1,
    },
    mentionUserName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 2,
    },
    mentionUserEmail: {
        fontSize: 12,
        color: '#7A869A',
    },
    mentionNoResults: {
        padding: 16,
        textAlign: 'center',
        fontSize: 14,
        color: '#7A869A',
    },
    noCommentsText: {
        fontSize: 14,
        color: '#7A869A',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 20,
    },
    inlineAttachmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginHorizontal: 2,
    },
    inlineAttachmentIcon: {
        fontSize: 16,
        marginRight: 4,
    },
    inlineAttachmentText: {
        fontSize: 13,
        color: '#0052CC',
        fontWeight: '500',
    },
});
