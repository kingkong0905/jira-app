import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';

interface JiraUser {
    accountId: string;
    displayName: string;
    emailAddress?: string;
    avatarUrls?: { '48x48': string };
    accountType?: string;
    active?: boolean;
    timeZone?: string;
}

interface UserInfoModalProps {
    visible: boolean;
    user: JiraUser | null;
    loading?: boolean;
    onClose: () => void;
}

export default function UserInfoModal({
    visible,
    user,
    loading = false,
    onClose,
}: UserInfoModalProps) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.content} onStartShouldSetResponder={() => true}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0052CC" />
                            <Text style={styles.loadingText}>Loading user info...</Text>
                        </View>
                    ) : user ? (
                        <>
                            <View style={styles.header}>
                                {user.avatarUrls?.['48x48'] ? (
                                    <Image
                                        source={{ uri: user.avatarUrls['48x48'] }}
                                        style={styles.avatarLarge}
                                    />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {user.displayName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={onClose}
                                >
                                    <Text style={styles.closeText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.body}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Name</Text>
                                    <Text style={styles.value}>{user.displayName}</Text>
                                </View>

                                {user.emailAddress && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Email</Text>
                                        <Text style={styles.value}>{user.emailAddress}</Text>
                                    </View>
                                )}

                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Account ID</Text>
                                    <Text style={styles.valueSmall}>{user.accountId}</Text>
                                </View>

                                {user.accountType && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Account Type</Text>
                                        <Text style={styles.value}>{user.accountType}</Text>
                                    </View>
                                )}

                                {user.timeZone && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Time Zone</Text>
                                        <Text style={styles.value}>{user.timeZone}</Text>
                                    </View>
                                )}

                                {user.active !== undefined && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Status</Text>
                                        <Text style={styles.value}>
                                            {user.active ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </>
                    ) : (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>User information not available</Text>
                            <TouchableOpacity style={styles.closeButtonSecondary} onPress={onClose}>
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#7A869A',
    },
    header: {
        position: 'relative',
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 24,
        backgroundColor: '#F4F5F7',
        borderBottomWidth: 1,
        borderBottomColor: '#DFE1E6',
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    closeText: {
        fontSize: 18,
        color: '#42526E',
        fontWeight: 'bold',
    },
    body: {
        padding: 20,
    },
    infoRow: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#7A869A',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        color: '#172B4D',
        fontWeight: '500',
    },
    valueSmall: {
        fontSize: 14,
        color: '#42526E',
        fontFamily: 'monospace',
    },
    errorContainer: {
        padding: 40,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#7A869A',
        marginBottom: 24,
        textAlign: 'center',
    },
    closeButtonSecondary: {
        backgroundColor: '#0052CC',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 6,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
