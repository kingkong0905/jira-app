export interface JiraConfig {
    email: string;
    jiraUrl: string;
    apiToken: string;
}

export interface JiraIssue {
    id: string;
    key: string;
    fields: {
        summary: string;
        description?: string;
        status: {
            name: string;
            statusCategory: {
                key?: string;
                colorName: string;
            };
        };
        priority?: {
            name: string;
            iconUrl: string;
        };
        assignee?: {
            accountId: string;
            displayName: string;
            emailAddress?: string;
            avatarUrls: {
                '48x48': string;
            };
        };
        reporter?: {
            accountId: string;
            displayName: string;
            emailAddress?: string;
            avatarUrls: {
                '48x48': string;
            };
        };
        issuetype: {
            name: string;
            iconUrl: string;
        };
        created: string;
        updated: string;
        duedate?: string;
        customfield_10016?: number; // Story Points (common custom field ID)
        customfield_10020?: any; // Sprint field (can be array or object)
        sprint?: {
            id: number;
            name: string;
            state: string;
        };
        attachment?: JiraAttachment[];
        parent?: {
            id: string;
            key: string;
            fields?: {
                summary: string;
                status: {
                    name: string;
                    statusCategory: {
                        key?: string;
                        colorName: string;
                    };
                };
                assignee?: {
                    accountId: string;
                    displayName: string;
                    emailAddress?: string;
                    avatarUrls: {
                        '48x48': string;
                    };
                };
            };
        };
    };
}

export interface JiraBoard {
    id: number;
    name: string;
    type: string;
    location?: {
        projectKey: string;
        projectName: string;
    };
}

export interface JiraSprint {
    id: number;
    name: string;
    state: string;
    startDate?: string;
    endDate?: string;
    goal?: string;
}

export interface JiraAttachment {
    id: string;
    filename: string;
    mimeType: string;
    content: string;
    thumbnail?: string;
    size: number;
    author?: {
        displayName: string;
    };
    created?: string;
}

export interface JiraComment {
    id: string;
    author: {
        accountId: string;
        displayName: string;
        avatarUrls: {
            '48x48': string;
        };
    };
    body: string;
    created: string;
    updated: string;
    parentId?: string | number;
    parent?: { id: string };
}

export interface JiraUser {
    accountId: string;
    displayName: string;
    emailAddress?: string;
    avatarUrls: {
        '48x48': string;
    };
}
