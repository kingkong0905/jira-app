export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
        // Same day - show relative time
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            if (diffInMinutes < 1) {
                return 'Just now';
            }
            return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
        }
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays === 1) {
        return 'Yesterday';
    } else {
        // More than 1 day - show full datetime
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        };
        return date.toLocaleString(undefined, options);
    }
};

export const formatDateOnly = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
};

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validateUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

export const getPriorityEmoji = (priority: string): string => {
    const priorityLower = priority.toLowerCase();
    if (priorityLower.includes('highest') || priorityLower.includes('critical')) return '🔴';
    if (priorityLower.includes('high')) return '🟠';
    if (priorityLower.includes('medium')) return '🟡';
    if (priorityLower.includes('low')) return '🟢';
    if (priorityLower.includes('lowest')) return '🔵';
    return '⚪';
};

export const getStatusColor = (statusKey: string): string => {
    switch (statusKey.toLowerCase()) {
        case 'new':
        case 'indeterminate':
            return '#8777D9';
        case 'done':
        case 'complete':
            return '#00875A';
        default:
            return '#0052CC';
    }
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
