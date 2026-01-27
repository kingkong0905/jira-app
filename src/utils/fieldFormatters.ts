/**
 * Field Formatters
 * Utility functions for formatting and styling issue fields
 */

export function getStatusColor(statusCategory: string): string {
    const colors: { [key: string]: string } = {
        done: '#36B37E',
        indeterminate: '#0065FF',
        new: '#6554C0',
        todo: '#6554C0',
        default: '#5E6C84',
    };
    return colors[statusCategory.toLowerCase()] || colors.default;
}

export function getPriorityEmoji(priority?: string): string {
    if (!priority) return '📋';
    const emojiMap: { [key: string]: string } = {
        highest: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        lowest: '🔵',
    };
    return emojiMap[priority.toLowerCase()] || '📋';
}

export function getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
    return '📎';
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getLinkIcon(linkType: string): string {
    const iconMap: { [key: string]: string } = {
        'relates to': '🔗',
        'blocks': '🚫',
        'is blocked by': '⛔',
        'duplicates': '📋',
        'is duplicated by': '📋',
        'clones': '📑',
        'is cloned by': '📑',
        'causes': '⚠️',
        'is caused by': '⚠️',
        'default': '🔗',
    };
    return iconMap[linkType.toLowerCase()] || iconMap.default;
}

export function getUserInitials(displayName: string): string {
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
}

export function getAvatarColor(accountId: string): string {
    const colors = [
        '#0052CC', // Blue
        '#36B37E', // Green
        '#FF5630', // Red
        '#6554C0', // Purple
        '#FF991F', // Orange
        '#00B8D9', // Cyan
        '#FFAB00', // Yellow
        '#FF8B00', // Dark Orange
    ];

    // Generate a consistent color based on accountId
    let hash = 0;
    for (let i = 0; i < accountId.length; i++) {
        hash = accountId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}
