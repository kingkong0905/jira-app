import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Linking,
    Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { VideoView, useVideoPlayer } from 'expo-video';

interface JiraAttachment {
    id: string;
    filename: string;
    mimeType: string;
    content: string;
    thumbnail?: string;
    size?: number;
}

interface AttachmentPreviewModalProps {
    visible: boolean;
    attachment: JiraAttachment | null;
    loadedImageData?: Record<string, string>;
    authHeaders: Record<string, string>;
    onClose: () => void;
}

export default function AttachmentPreviewModal({
    visible,
    attachment,
    loadedImageData = {},
    authHeaders,
    onClose,
}: AttachmentPreviewModalProps) {
    const [videoStatus, setVideoStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');

    // Create video player for video attachments with auth headers
    const videoPlayer = useVideoPlayer(
        attachment?.mimeType.startsWith('video/') && attachment?.content
            ? { uri: attachment.content, headers: authHeaders }
            : { uri: '' }
    );

    // Monitor video player status
    useEffect(() => {
        if (!attachment?.mimeType.startsWith('video/')) return;

        const statusSubscription = videoPlayer.addListener('statusChange', (payload) => {
            if (payload.error) {
                console.error('Video player error:', payload.error);
                setVideoStatus('error');
            } else if (payload.status === 'readyToPlay') {
                setVideoStatus('ready');
            } else if (payload.status === 'loading') {
                setVideoStatus('loading');
            }
        });

        return () => {
            statusSubscription.remove();
        };
    }, [attachment?.id, videoPlayer]);

    // Reset video status when attachment changes
    useEffect(() => {
        if (attachment?.mimeType.startsWith('video/')) {
            setVideoStatus('loading');
        }
    }, [attachment?.id]);

    const getFileIcon = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
        return '📎';
    };

    const renderContent = () => {
        if (!attachment) return null;

        // Image Preview
        if (attachment.mimeType.startsWith('image/')) {
            return (
                <ScrollView
                    style={styles.modalImageContainer}
                    contentContainerStyle={styles.modalImageContent}
                >
                    <Image
                        source={
                            loadedImageData[attachment.id]
                                ? { uri: loadedImageData[attachment.id] }
                                : { uri: attachment.content, headers: authHeaders }
                        }
                        style={styles.modalImage}
                        resizeMode="contain"
                        onError={(error) => console.error('Image load error:', error.nativeEvent)}
                    />
                </ScrollView>
            );
        }

        // PDF Preview
        if (attachment.mimeType === 'application/pdf') {
            return (
                <View style={styles.modalPdfContainer}>
                    <WebView
                        source={{
                            uri: attachment.content,
                            headers: authHeaders,
                        }}
                        style={styles.modalWebView}
                        originWhitelist={['*']}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={styles.imageLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                                <Text style={styles.imageLoadingText}>Loading PDF...</Text>
                            </View>
                        )}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('WebView PDF error:', nativeEvent);
                        }}
                        onHttpError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error(
                                'WebView HTTP error:',
                                nativeEvent.statusCode,
                                nativeEvent.description
                            );
                        }}
                    />
                </View>
            );
        }

        // Video Preview
        if (attachment.mimeType.startsWith('video/')) {
            return (
                <View style={styles.modalVideoContainer}>
                    {(videoStatus === 'loading' || !authHeaders.Authorization) && (
                        <View style={styles.videoLoadingOverlay}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.videoLoadingText}>Loading video...</Text>
                        </View>
                    )}
                    {videoStatus === 'error' && (
                        <View style={styles.videoErrorOverlay}>
                            <Text style={styles.videoErrorIcon}>⚠️</Text>
                            <Text style={styles.videoErrorText}>Failed to load video</Text>
                            <Text style={styles.videoErrorHint}>
                                Tap "Open File" below to view in browser
                            </Text>
                        </View>
                    )}
                    <VideoView
                        style={styles.modalVideo}
                        player={videoPlayer}
                        nativeControls
                        contentFit="contain"
                    />
                </View>
            );
        }

        // Unsupported File Type
        return (
            <View style={styles.modalUnsupportedContainer}>
                <Text style={styles.modalUnsupportedIcon}>{getFileIcon(attachment.mimeType)}</Text>
                <Text style={styles.modalUnsupportedText}>{attachment.filename}</Text>
                <Text style={styles.modalUnsupportedHint}>Click below to open in browser</Text>
            </View>
        );
    };

    if (!attachment) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle} numberOfLines={1}>
                            {attachment.filename}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {renderContent()}

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.modalActionButton}
                            onPress={() => {
                                if (attachment) {
                                    Linking.openURL(attachment.content);
                                }
                            }}
                        >
                            <Text style={styles.modalActionText}>
                                {attachment.mimeType.startsWith('image/')
                                    ? 'Open in Browser'
                                    : 'Open File'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 800,
        height: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F4F5F7',
        borderBottomWidth: 1,
        borderBottomColor: '#DFE1E6',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        flex: 1,
        marginRight: 16,
    },
    modalCloseButton: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    modalCloseText: {
        fontSize: 20,
        color: '#42526E',
        fontWeight: 'bold',
    },
    modalImageContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalImageContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    imageLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    imageLoadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#fff',
    },
    modalPdfContainer: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    modalWebView: {
        flex: 1,
    },
    modalVideoContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    modalVideo: {
        width: '100%',
        height: '100%',
    },
    videoLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    videoLoadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#fff',
    },
    videoErrorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        padding: 20,
    },
    videoErrorIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    videoErrorText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
        marginBottom: 8,
    },
    videoErrorHint: {
        fontSize: 14,
        color: '#B3D4FF',
        textAlign: 'center',
    },
    modalUnsupportedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
        padding: 32,
    },
    modalUnsupportedIcon: {
        fontSize: 80,
        marginBottom: 24,
    },
    modalUnsupportedText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalUnsupportedHint: {
        fontSize: 14,
        color: '#7A869A',
        textAlign: 'center',
    },
    modalActions: {
        padding: 16,
        backgroundColor: '#F4F5F7',
        borderTopWidth: 1,
        borderTopColor: '#DFE1E6',
    },
    modalActionButton: {
        backgroundColor: '#0052CC',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    modalActionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
