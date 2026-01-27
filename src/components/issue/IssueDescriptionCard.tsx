import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Linking,
    Platform,
} from 'react-native';

interface JiraAttachment {
    id: string;
    filename: string;
    mimeType: string;
    content: string;
    thumbnail?: string;
}

interface IssueDescriptionCardProps {
    description: any;
    attachments?: JiraAttachment[];
    loadedImageData?: Record<string, string>;
    authHeaders?: Record<string, string>;
    onAttachmentPress: (attachment: JiraAttachment) => void;
    onEditPress?: () => void;
    canEdit?: boolean;
}

export default function IssueDescriptionCard({
    description,
    attachments = [],
    loadedImageData = {},
    authHeaders = {},
    onAttachmentPress,
    onEditPress,
    canEdit = true,
}: IssueDescriptionCardProps) {
    const [loadingAttachments, setLoadingAttachments] = useState<Record<string, boolean>>({});

    const handleImageLoadStart = (attachmentId: string) => {
        setLoadingAttachments(prev => ({ ...prev, [attachmentId]: true }));
    };

    const handleImageLoadEnd = (attachmentId: string) => {
        setLoadingAttachments(prev => ({ ...prev, [attachmentId]: false }));
    };

    // Handle simple string
    if (typeof description === 'string') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Description</Text>
                    {canEdit && onEditPress && (
                        <TouchableOpacity onPress={onEditPress} style={styles.editButton}>
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.description}>{description}</Text>
            </View>
        );
    }

    // Helper function to render inline content (text, mentions, links, etc.)
    const renderInlineContent = (content: any[], baseStyle?: any) => {
        return content.map((item: any, itemIndex: number) => {
            if (item.type === 'text') {
                // Apply formatting marks (bold, italic, etc.)
                let textStyle = baseStyle || {};
                if (item.marks) {
                    item.marks.forEach((mark: any) => {
                        if (mark.type === 'strong') {
                            textStyle = { ...textStyle, fontWeight: 'bold' };
                        } else if (mark.type === 'em') {
                            textStyle = { ...textStyle, fontStyle: 'italic' };
                        } else if (mark.type === 'code') {
                            textStyle = {
                                ...textStyle,
                                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                backgroundColor: '#f4f4f4',
                            };
                        } else if (mark.type === 'link') {
                            return (
                                <Text
                                    key={itemIndex}
                                    style={[textStyle, styles.linkText]}
                                    onPress={() => Linking.openURL(mark.attrs?.href)}
                                >
                                    {item.text || mark.attrs?.href}
                                </Text>
                            );
                        }
                    });
                }
                return (
                    <Text key={itemIndex} style={textStyle}>
                        {item.text || ''}
                    </Text>
                );
            } else if (item.type === 'mention') {
                return (
                    <Text key={itemIndex} style={styles.mentionText}>
                        {item.attrs?.text || '@user'}
                    </Text>
                );
            } else if (item.type === 'inlineCard') {
                const url = item.attrs?.url || '';
                return (
                    <Text
                        key={itemIndex}
                        style={styles.linkText}
                        onPress={() => url && Linking.openURL(url)}
                    >
                        {url || '[Card]'}
                    </Text>
                );
            } else if (item.type === 'hardBreak') {
                return <Text key={itemIndex}>{'\n'}</Text>;
            }
            return null;
        });
    };

    // Function to render ordered or bullet lists
    const renderList = (listNode: any, listIndex: number) => {
        const isOrdered = listNode.type === 'orderedList';
        const startNumber = listNode.attrs?.order || 1;

        return listNode.content?.map((listItemNode: any, itemIndex: number) => {
            if (listItemNode.type === 'listItem') {
                const bullet = isOrdered ? `${startNumber + itemIndex}. ` : '• ';
                return (
                    <View key={itemIndex} style={styles.listItemContainer}>
                        <Text style={styles.listBullet}>{bullet}</Text>
                        <View style={styles.listItemContent}>
                            {listItemNode.content?.map((node: any, nodeIndex: number) => {
                                if (node.type === 'paragraph' && node.content) {
                                    return (
                                        <Text key={nodeIndex} style={styles.listItemText}>
                                            {renderInlineContent(node.content)}
                                        </Text>
                                    );
                                } else if (node.type === 'bulletList' || node.type === 'orderedList') {
                                    // Nested list
                                    return (
                                        <View key={nodeIndex} style={styles.nestedList}>
                                            {renderList(node, nodeIndex)}
                                        </View>
                                    );
                                }
                                return null;
                            })}
                        </View>
                    </View>
                );
            }
            return null;
        });
    };

    // Render ADF content
    const renderContent = () => {
        // Handle ADF (Atlassian Document Format)
        if (description?.content && Array.isArray(description.content)) {
            return (
                <View>
                    {description.content.map((node: any, nodeIndex: number) => {
                        if (node.type === 'paragraph' && node.content) {
                            return (
                                <Text key={nodeIndex} style={styles.descriptionParagraph}>
                                    {renderInlineContent(node.content)}
                                </Text>
                            );
                        } else if (node.type === 'heading' && node.content) {
                            const level = node.attrs?.level || 1;
                            const headingStyle =
                                level === 1
                                    ? styles.heading1
                                    : level === 2
                                        ? styles.heading2
                                        : level === 3
                                            ? styles.heading3
                                            : level === 4
                                                ? styles.heading4
                                                : styles.heading5;
                            return (
                                <Text key={nodeIndex} style={headingStyle}>
                                    {renderInlineContent(node.content, headingStyle)}
                                </Text>
                            );
                        } else if (node.type === 'bulletList' || node.type === 'orderedList') {
                            return (
                                <View key={nodeIndex} style={styles.listContainer}>
                                    {renderList(node, nodeIndex)}
                                </View>
                            );
                        } else if (node.type === 'mediaSingle' && node.content) {
                            // Handle embedded media (images/attachments)
                            const mediaNode = node.content.find((n: any) => n.type === 'media');

                            if (mediaNode && mediaNode.attrs) {
                                const mediaType = mediaNode.attrs.type || 'file';
                                const altText = mediaNode.attrs.alt || '';

                                // Find the attachment by matching filename in alt text
                                const attachment = attachments?.find(
                                    (a: any) =>
                                        a.filename === altText ||
                                        a.filename.includes(altText) ||
                                        altText.includes(a.filename)
                                );

                                if (attachment && mediaType === 'file') {
                                    const isImage = attachment.mimeType.startsWith('image/');
                                    const isVideo = attachment.mimeType.startsWith('video/');

                                    if (isImage) {
                                        return (
                                            <TouchableOpacity
                                                key={nodeIndex}
                                                onPress={() => onAttachmentPress(attachment)}
                                                style={styles.descriptionImageContainer}
                                            >
                                                {loadingAttachments[attachment.id] && !loadedImageData[attachment.id] && (
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
                                                    style={styles.descriptionImage}
                                                    resizeMode="contain"
                                                    onLoadStart={() => handleImageLoadStart(attachment.id)}
                                                    onLoadEnd={() => handleImageLoadEnd(attachment.id)}
                                                    onError={() => handleImageLoadEnd(attachment.id)}
                                                />
                                            </TouchableOpacity>
                                        );
                                    } else if (isVideo) {
                                        return (
                                            <TouchableOpacity
                                                key={nodeIndex}
                                                onPress={() => onAttachmentPress(attachment)}
                                                style={styles.descriptionVideoContainer}
                                            >
                                                <View style={styles.descriptionVideoPlaceholder}>
                                                    <Text style={styles.descriptionVideoIcon}>🎥</Text>
                                                    <Text style={styles.descriptionVideoText}>
                                                        {attachment.filename}
                                                    </Text>
                                                    <Text style={styles.descriptionVideoHint}>Tap to play</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }
                                }
                                return null;
                            }
                        } else if (node.type === 'mediaGroup' && node.content) {
                            // Handle media groups (multiple files)
                            return (
                                <View key={nodeIndex} style={styles.mediaGroupContainer}>
                                    {node.content.map((mediaItem: any, mediaIndex: number) => {
                                        if (mediaItem.type === 'media' && mediaItem.attrs) {
                                            const altText = mediaItem.attrs.alt || '';
                                            const attachment = attachments?.find(
                                                (a: any) =>
                                                    a.filename === altText ||
                                                    a.filename.includes(altText) ||
                                                    altText.includes(a.filename)
                                            );

                                            if (attachment) {
                                                const isImage = attachment.mimeType.startsWith('image/');
                                                const isVideo = attachment.mimeType.startsWith('video/');

                                                if (isImage) {
                                                    return (
                                                        <TouchableOpacity
                                                            key={mediaIndex}
                                                            onPress={() => onAttachmentPress(attachment)}
                                                            style={styles.descriptionImageContainer}
                                                        >
                                                            {loadingAttachments[attachment.id] && !loadedImageData[attachment.id] && (
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
                                                                style={styles.descriptionImage}
                                                                resizeMode="contain"
                                                                onLoadStart={() => handleImageLoadStart(attachment.id)}
                                                                onLoadEnd={() => handleImageLoadEnd(attachment.id)}
                                                                onError={() => handleImageLoadEnd(attachment.id)}
                                                            />
                                                        </TouchableOpacity>
                                                    );
                                                } else if (isVideo) {
                                                    return (
                                                        <TouchableOpacity
                                                            key={mediaIndex}
                                                            onPress={() => onAttachmentPress(attachment)}
                                                            style={styles.descriptionVideoContainer}
                                                        >
                                                            <View style={styles.descriptionVideoPlaceholder}>
                                                                <Text style={styles.descriptionVideoIcon}>🎥</Text>
                                                                <Text style={styles.descriptionVideoText}>
                                                                    {attachment.filename}
                                                                </Text>
                                                                <Text style={styles.descriptionVideoHint}>
                                                                    Tap to play
                                                                </Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    );
                                                }
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Description</Text>
                {canEdit && onEditPress && (
                    <TouchableOpacity onPress={onEditPress} style={styles.editButton}>
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                )}
            </View>
            {renderContent()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 16,
        paddingTop: 24,
        marginBottom: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#172B4D',
    },
    editButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
    },
    editButtonText: {
        fontSize: 14,
        color: '#0052CC',
        fontWeight: '500',
    },
    description: {
        fontSize: 14,
        color: '#42526E',
        lineHeight: 20,
    },
    descriptionParagraph: {
        fontSize: 14,
        color: '#42526E',
        lineHeight: 20,
        marginBottom: 8,
    },
    heading1: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#172B4D',
        marginVertical: 12,
    },
    heading2: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#172B4D',
        marginVertical: 10,
    },
    heading3: {
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
        marginVertical: 8,
    },
    heading4: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginVertical: 6,
    },
    heading5: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
        marginVertical: 4,
    },
    linkText: {
        color: '#0052CC',
        textDecorationLine: 'underline',
    },
    mentionText: {
        color: '#0052CC',
        backgroundColor: '#E6FCFF',
        paddingHorizontal: 4,
        borderRadius: 2,
    },
    listContainer: {
        marginVertical: 8,
    },
    listItemContainer: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    listBullet: {
        fontSize: 14,
        color: '#42526E',
        marginRight: 8,
        minWidth: 20,
    },
    listItemContent: {
        flex: 1,
    },
    listItemText: {
        fontSize: 14,
        color: '#42526E',
        lineHeight: 20,
    },
    nestedList: {
        marginLeft: 20,
        marginTop: 4,
    },
    codeBlockContainer: {
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
        padding: 12,
        marginVertical: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#DFE1E6',
    },
    codeBlockText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 13,
        color: '#172B4D',
    },
    descriptionImageContainer: {
        marginVertical: 12,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F4F5F7',
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
    descriptionImage: {
        width: '100%',
        height: 200,
    },
    descriptionImagePlaceholder: {
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    descriptionImagePlaceholderText: {
        marginTop: 8,
        fontSize: 14,
        color: '#7A869A',
    },
    descriptionVideoContainer: {
        marginVertical: 12,
        borderRadius: 8,
        overflow: 'hidden',
    },
    descriptionVideoPlaceholder: {
        padding: 20,
        backgroundColor: '#F4F5F7',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderStyle: 'dashed',
    },
    descriptionVideoIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    descriptionVideoText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 4,
    },
    descriptionVideoHint: {
        fontSize: 12,
        color: '#7A869A',
    },
    mediaGroupContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 8,
        gap: 8,
    },
});
