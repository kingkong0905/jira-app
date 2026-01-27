import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';

interface ConfluenceLinkModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (url: string, title: string) => Promise<void>;
    loading?: boolean;
}

export default function ConfluenceLinkModal({
    visible,
    onClose,
    onAdd,
    loading = false,
}: ConfluenceLinkModalProps) {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!url.trim()) {
            setError('URL is required');
            return;
        }

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            setError('Please enter a valid URL');
            return;
        }

        setError(null);
        setAdding(true);

        try {
            await onAdd(url.trim(), title.trim());
            // Reset form
            setUrl('');
            setTitle('');
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.errorMessages?.[0] || 'Failed to add link');
        } finally {
            setAdding(false);
        }
    };

    const handleClose = () => {
        setUrl('');
        setTitle('');
        setError(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.overlayTouchable}
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Link Confluence Page</Text>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            style={styles.scrollView} 
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                        >
                            <View style={styles.form}>
                                <Text style={styles.label}>Confluence Page URL *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="https://your-domain.atlassian.net/wiki/spaces/..."
                                    placeholderTextColor="#999"
                                    value={url}
                                    onChangeText={(text) => {
                                        setUrl(text);
                                        setError(null);
                                    }}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                    editable={!adding && !loading}
                                />

                                <Text style={styles.label}>Title *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Page title or description"
                                    placeholderTextColor="#999"
                                    value={title}
                                    onChangeText={(text) => {
                                        setTitle(text);
                                        setError(null);
                                    }}
                                    autoCapitalize="sentences"
                                    editable={!adding && !loading}
                                />

                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}

                                <View style={styles.hintContainer}>
                                    <Text style={styles.hintText}>
                                        💡 Tip: You can copy the URL from your Confluence page's address bar
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.cancelButton, (adding || loading) && styles.disabledButton]}
                                onPress={handleClose}
                                disabled={adding || loading}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <View style={{ width: 12 }} />
                            <TouchableOpacity
                                style={[
                                    styles.addButton,
                                    (adding || loading || !url.trim() || !title.trim()) && styles.disabledButton,
                                ]}
                                onPress={handleAdd}
                                disabled={adding || loading || !url.trim() || !title.trim()}
                            >
                                {adding ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.addButtonText}>Add Link</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    overlayTouchable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
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
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#42526E',
        fontWeight: '300',
    },
    scrollView: {
        flexShrink: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    form: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#172B4D',
        backgroundColor: '#F4F5F7',
    },
    errorContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    errorText: {
        fontSize: 14,
        color: '#C62828',
    },
    hintContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
    },
    hintText: {
        fontSize: 13,
        color: '#1976D2',
        lineHeight: 18,
    },
    modalActions: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E1E4E8',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#42526E',
    },
    addButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#0052CC',
        alignItems: 'center',
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    disabledButton: {
        opacity: 0.5,
    },
});
