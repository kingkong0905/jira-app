import React, { ReactNode, useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    Image,
} from 'react-native';

/**
 * Generic Picker Modal Component
 * 
 * Reusable modal for selecting items from a list with optional search functionality.
 * 
 * @example
 * // Priority Picker Example
 * const priorityItems = availablePriorities.map(p => ({
 *   id: p.id,
 *   label: p.name,
 *   emoji: getPriorityEmoji(p.name)
 * }));
 * 
 * <PickerModal
 *   visible={showPriorityPicker}
 *   title="Change Priority"
 *   currentValue={issue.fields.priority?.id}
 *   currentLabel={issue.fields.priority?.name}
 *   items={priorityItems}
 *   loading={loadingPriorities}
 *   updatingItemId={updatingPriorityId}
 *   onClose={() => setShowPriorityPicker(false)}
 *   onSelect={(id, item) => handleUpdatePriority(id, item.label)}
 * />
 * 
 * @example
 * // Assignee Picker Example with Search
 * const userItems = assignableUsers.map(u => ({
 *   id: u.accountId,
 *   label: u.displayName,
 *   description: u.emailAddress,
 *   imageUrl: u.avatarUrls?.['48x48']
 * }));
 * 
 * <PickerModal
 *   visible={showAssigneePicker}
 *   title="Change Assignee"
 *   currentValue={issue.fields.assignee?.accountId}
 *   currentLabel={issue.fields.assignee?.displayName}
 *   items={userItems}
 *   loading={loadingUsers}
 *   searchable={true}
 *   searchPlaceholder="Search users..."
 *   searchValue={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   allowUnselect={true}
 *   unselectLabel="Unassigned"
 *   onClose={() => setShowAssigneePicker(false)}
 *   onSelect={(id) => handleAssignUser(id || null)}
 * />
 */

export interface PickerItem {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    emoji?: string;
    imageUrl?: string;
    metadata?: any;
}

interface PickerModalProps {
    visible: boolean;
    title: string;
    currentValue?: string;
    currentLabel?: string;
    items: PickerItem[];
    loading?: boolean;
    updating?: boolean;
    updatingItemId?: string | null;
    searchable?: boolean;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    onSearch?: (query: string) => Promise<PickerItem[]>; // Async search function
    onClose: () => void;
    onSelect: (itemId: string, item: PickerItem) => void;
    renderItem?: (item: PickerItem, isSelected: boolean) => ReactNode;
    emptyMessage?: string;
    showCurrentValue?: boolean;
    allowUnselect?: boolean;
    unselectLabel?: string;
}

export default function PickerModal({
    visible,
    title,
    currentValue,
    currentLabel,
    items,
    loading = false,
    updating = false,
    updatingItemId = null,
    searchable = false,
    searchPlaceholder = 'Search...',
    searchValue = '',
    onSearchChange,
    onSearch,
    onClose,
    onSelect,
    renderItem,
    emptyMessage = 'No items available',
    showCurrentValue = true,
    allowUnselect = false,
    unselectLabel = 'None',
}: PickerModalProps) {
    const [internalSearchValue, setInternalSearchValue] = useState('');
    const [searchResults, setSearchResults] = useState<PickerItem[]>([]);
    const [searching, setSearching] = useState(false);

    // Use async search if provided, otherwise use internal filtering
    const hasAsyncSearch = !!onSearch;
    const displayItems = hasAsyncSearch ? searchResults : items;
    const isLoading = loading || searching;

    useEffect(() => {
        if (hasAsyncSearch && internalSearchValue) {
            const timer = setTimeout(async () => {
                setSearching(true);
                try {
                    const results = await onSearch(internalSearchValue);
                    setSearchResults(results);
                } catch (error) {
                    console.error('Search error:', error);
                    setSearchResults([]);
                } finally {
                    setSearching(false);
                }
            }, 300); // Debounce 300ms

            return () => clearTimeout(timer);
        } else if (!internalSearchValue && hasAsyncSearch) {
            setSearchResults(items);
        }
    }, [internalSearchValue, hasAsyncSearch]);

    useEffect(() => {
        // Reset search when modal opens
        if (visible) {
            setInternalSearchValue('');
            if (hasAsyncSearch) {
                setSearchResults(items);
            }
        }
    }, [visible]);

    const handleSearchChange = (value: string) => {
        setInternalSearchValue(value);
        if (onSearchChange) {
            onSearchChange(value);
        }
    };

    const defaultRenderItem = (item: PickerItem, isSelected: boolean) => (
        <TouchableOpacity
            key={item.id}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelect(item.id, item)}
            disabled={updating}
        >
            <View style={styles.itemContent}>
                {item.imageUrl && (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                )}
                {item.emoji && (
                    <Text style={styles.itemEmoji}>{item.emoji}</Text>
                )}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    {item.description && (
                        <Text style={styles.itemDescription}>{item.description}</Text>
                    )}
                </View>
            </View>
            {isSelected && <Text style={styles.selectedIndicator}>✓</Text>}
            {updatingItemId === item.id && (
                <ActivityIndicator size="small" color="#0052CC" />
            )}
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Current Value Display */}
                    {showCurrentValue && currentLabel && (
                        <View style={styles.currentValueContainer}>
                            <Text style={styles.currentValueLabel}>Current:</Text>
                            <Text style={styles.currentValue}>{currentLabel}</Text>
                        </View>
                    )}

                    {/* Search Input */}
                    {searchable && (
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder={searchPlaceholder}
                                placeholderTextColor="#999"
                                value={hasAsyncSearch ? internalSearchValue : searchValue}
                                onChangeText={handleSearchChange}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    )}

                    {/* Loading State */}
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0052CC" />
                        </View>
                    ) : displayItems.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>{emptyMessage}</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.itemList}>
                            {/* Unselect Option */}
                            {allowUnselect && (
                                <TouchableOpacity
                                    style={[styles.item, !currentValue && styles.itemSelected]}
                                    onPress={() => onSelect('', { id: '', label: unselectLabel })}
                                    disabled={updating}
                                >
                                    <View style={styles.itemContent}>
                                        <View style={styles.unselectIcon}>
                                            <Text style={styles.unselectIconText}>✕</Text>
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemLabel}>{unselectLabel}</Text>
                                        </View>
                                    </View>
                                    {!currentValue && <Text style={styles.selectedIndicator}>✓</Text>}
                                </TouchableOpacity>
                            )}

                            {/* Items */}
                            {displayItems.map((item) => {
                                const isSelected = item.id === currentValue;
                                return renderItem
                                    ? renderItem(item, isSelected)
                                    : defaultRenderItem(item, isSelected);
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '90%',
        maxHeight: '80%',
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
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
    },
    closeButton: {
        padding: 5,
    },
    closeText: {
        fontSize: 24,
        color: '#5E6C84',
    },
    currentValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#F4F5F7',
        borderBottomWidth: 1,
        borderBottomColor: '#E8EBED',
    },
    currentValueLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84',
        marginRight: 8,
    },
    currentValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
    },
    searchContainer: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E8EBED',
    },
    searchInput: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#172B4D',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center',
    },
    itemList: {
        maxHeight: 400,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    itemSelected: {
        backgroundColor: '#E6F2FF',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    itemImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    itemEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#172B4D',
    },
    itemDescription: {
        fontSize: 13,
        color: '#5E6C84',
        marginTop: 2,
    },
    selectedIndicator: {
        fontSize: 18,
        color: '#0052CC',
        fontWeight: '600',
        marginLeft: 10,
    },
    unselectIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F4F5F7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    unselectIconText: {
        fontSize: 20,
        color: '#5E6C84',
    },
});
