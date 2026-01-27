import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { UserAvatar } from '../shared';

interface JiraUser {
    accountId: string;
    displayName: string;
    emailAddress?: string;
    avatarUrls?: { '48x48': string };
}

interface AssigneePickerModalProps {
    visible: boolean;
    currentAssignee: JiraUser | null;
    assignableUsers: JiraUser[];
    loading: boolean;
    assigning: boolean;
    onClose: () => void;
    onSelect: (accountId: string | null) => void;
    onSearch: (query: string) => void;
}

export default function AssigneePickerModal({
    visible,
    currentAssignee,
    assignableUsers,
    loading,
    assigning,
    onClose,
    onSelect,
    onSearch,
}: AssigneePickerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        onSearch(query);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Change Assignee</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0052CC" />
                        </View>
                    ) : (
                        <ScrollView style={styles.list}>
                            {/* Unassign option */}
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => onSelect(null)}
                                disabled={assigning}
                            >
                                <View style={styles.itemContent}>
                                    <View style={[styles.avatar, styles.unassignedAvatar]}>
                                        <Text style={styles.avatarText}>?</Text>
                                    </View>
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>Unassigned</Text>
                                        <Text style={styles.userEmail}>Remove assignee</Text>
                                    </View>
                                </View>
                                {!currentAssignee && <Text style={styles.selectedIndicator}>✓</Text>}
                            </TouchableOpacity>

                            {assignableUsers.map((user) => {
                                const isSelected = currentAssignee?.accountId === user.accountId;
                                return (
                                    <TouchableOpacity
                                        key={user.accountId}
                                        style={styles.item}
                                        onPress={() => onSelect(user.accountId)}
                                        disabled={assigning}
                                    >
                                        <View style={styles.itemContent}>
                                            {user.avatarUrls?.['48x48'] ? (
                                                <Image
                                                    source={{ uri: user.avatarUrls['48x48'] }}
                                                    style={styles.userAvatar}
                                                />
                                            ) : (
                                                <View style={styles.avatar}>
                                                    <Text style={styles.avatarText}>
                                                        {user.displayName.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.userInfo}>
                                                <Text style={styles.userName}>{user.displayName}</Text>
                                                {user.emailAddress && (
                                                    <Text style={styles.userEmail}>
                                                        {user.emailAddress}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        {isSelected && <Text style={styles.selectedIndicator}>✓</Text>}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
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
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#DFE1E6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
    },
    modalCloseButton: {
        padding: 8,
        backgroundColor: '#F4F5F7',
        borderRadius: 6,
    },
    modalCloseText: {
        fontSize: 18,
        color: '#42526E',
        fontWeight: 'bold',
    },
    searchInput: {
        margin: 16,
        padding: 12,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        fontSize: 14,
        color: '#172B4D',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        maxHeight: 400,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        marginHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    unassignedAvatar: {
        backgroundColor: '#7A869A',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 12,
        color: '#7A869A',
    },
    selectedIndicator: {
        fontSize: 18,
        color: '#00875A',
        fontWeight: 'bold',
    },
});
