import axios, { AxiosInstance } from 'axios';
import { JiraConfig, JiraIssue, JiraBoard, JiraSprint } from '../types/jira';

interface CacheEntry {
    data: any;
    timestamp: number;
}

class JiraApiService {
    private axiosInstance: AxiosInstance | null = null;
    private config: JiraConfig | null = null;
    private cache: Map<string, CacheEntry> = new Map();
    private pendingRequests: Map<string, Promise<any>> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private abortControllers: Map<string, AbortController> = new Map();

    initialize(config: JiraConfig): void {
        this.config = config;

        // Create base64 encoded auth string (web-compatible)
        const authString = `${config.email}:${config.apiToken}`;
        const base64Auth = typeof Buffer !== 'undefined'
            ? Buffer.from(authString).toString('base64')
            : btoa(authString);

        this.axiosInstance = axios.create({
            baseURL: config.jiraUrl,
            headers: {
                'Authorization': `Basic ${base64Auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
            },
            timeout: 15000, // Reduced to 15s for faster failures
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        // Add response interceptor for error handling
        this.axiosInstance.interceptors.response.use(
            response => response,
            error => {
                if (error.code === 'ECONNABORTED') {
                    console.warn('Request timeout:', error.config?.url);
                }
                return Promise.reject(error);
            }
        );
    }

    private getAxiosInstance(): AxiosInstance {
        if (!this.axiosInstance) {
            throw new Error('Jira API not initialized. Please configure credentials first.');
        }
        return this.axiosInstance;
    }

    private getCacheKey(endpoint: string, params?: any): string {
        return `${endpoint}_${JSON.stringify(params || {})}`;
    }

    private getFromCache(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const age = Date.now() - entry.timestamp;
        if (age > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    clearCache(): void {
        this.cache.clear();
    }

    private clearCacheByPattern(pattern: string): void {
        const keys = Array.from(this.cache.keys());
        keys.forEach(key => {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        });
    }

    cancelPendingRequests(): void {
        this.abortControllers.forEach(controller => controller.abort());
        this.abortControllers.clear();
        this.pendingRequests.clear();
    }

    async testConnection(): Promise<boolean> {
        try {
            const api = this.getAxiosInstance();
            await api.get('/rest/api/3/myself');
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    async getBoards(startAt: number = 0, maxResults: number = 50, searchQuery?: string): Promise<{ boards: JiraBoard[], total: number, isLast: boolean }> {
        try {
            const cacheKey = this.getCacheKey('/rest/agile/1.0/board', { startAt, maxResults, searchQuery });

            // Check cache first
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            // Check for pending request
            if (this.pendingRequests.has(cacheKey)) {
                return this.pendingRequests.get(cacheKey)!;
            }

            const api = this.getAxiosInstance();
            const params: any = {
                startAt,
                maxResults,
            };

            if (searchQuery && searchQuery.trim()) {
                params.name = searchQuery.trim();
            }

            const requestPromise = api.get('/rest/agile/1.0/board', { params })
                .then(response => {
                    const result = {
                        boards: response.data.values || [],
                        total: response.data.total || 0,
                        isLast: response.data.isLast || false,
                    };
                    this.setCache(cacheKey, result);
                    this.pendingRequests.delete(cacheKey);
                    return result;
                })
                .catch(error => {
                    this.pendingRequests.delete(cacheKey);
                    throw error;
                });

            this.pendingRequests.set(cacheKey, requestPromise);
            return requestPromise;
        } catch (error) {
            console.error('Error fetching boards:', error);
            throw error;
        }
    }

    async getBoardById(boardId: number): Promise<JiraBoard | null> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/agile/1.0/board/${boardId}`);
            return response.data || null;
        } catch (error) {
            console.error('Error fetching board by ID:', error);
            return null;
        }
    }

    async getBoardIssues(boardId: number, maxResults: number = 50): Promise<JiraIssue[]> {
        try {
            const cacheKey = this.getCacheKey(`/rest/agile/1.0/board/${boardId}/issue`, { maxResults });

            // Check cache (shorter duration for issues as they change frequently)
            const entry = this.cache.get(cacheKey);
            if (entry && (Date.now() - entry.timestamp) < 60000) { // 1 minute cache
                return entry.data;
            }

            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/agile/1.0/board/${boardId}/issue`, {
                params: {
                    maxResults,
                    fields: 'summary,status,priority,assignee,issuetype,created,updated', // Removed description for performance
                },
            });

            const issues = response.data.issues || [];
            this.setCache(cacheKey, issues);
            return issues;
        } catch (error) {
            console.error('Error fetching board issues:', error);
            throw error;
        }
    }

    async getBoardAssignees(boardId: number): Promise<Array<{ key: string, name: string }>> {
        try {
            const cacheKey = this.getCacheKey(`/rest/agile/1.0/board/${boardId}/assignees`, {});

            // Check cache (5 minute cache for assignees)
            const entry = this.cache.get(cacheKey);
            if (entry && (Date.now() - entry.timestamp) < this.CACHE_DURATION) {
                return entry.data;
            }

            const api = this.getAxiosInstance();
            // Fetch all issues from the board to get unique assignees
            const response = await api.get(`/rest/agile/1.0/board/${boardId}/issue`, {
                params: {
                    maxResults: 1000,
                    fields: 'assignee',
                },
            });

            const issues = response.data.issues || [];
            const uniqueAssignees = new Map<string, string>();

            issues.forEach((issue: any) => {
                if (issue.fields.assignee) {
                    const key = issue.fields.assignee.emailAddress || issue.fields.assignee.displayName;
                    uniqueAssignees.set(key, issue.fields.assignee.displayName);
                }
            });

            const result = Array.from(uniqueAssignees.entries()).map(([key, name]) => ({ key, name }));
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error fetching board assignees:', error);
            return [];
        }
    }

    async getSprintsForBoard(boardId: number): Promise<JiraSprint[]> {
        try {
            const cacheKey = this.getCacheKey(`/rest/agile/1.0/board/${boardId}/sprint`, {});

            // Check cache (5 minute cache for sprints)
            const entry = this.cache.get(cacheKey);
            if (entry && (Date.now() - entry.timestamp) < this.CACHE_DURATION) {
                return entry.data;
            }

            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/agile/1.0/board/${boardId}/sprint`);
            const sprints = response.data.values || [];
            this.setCache(cacheKey, sprints);
            return sprints;
        } catch (error: any) {
            // Board doesn't support sprints (Kanban or other board types)
            if (error?.response?.status === 400 || error?.response?.status === 404) {
                console.log('Board does not support sprints');
                return [];
            }
            console.error('Error fetching sprints:', error);
            throw error;
        }
    }

    async getActiveSprint(boardId: number): Promise<JiraSprint | null> {
        try {
            const sprints = await this.getSprintsForBoard(boardId);
            return sprints.find(sprint => sprint.state === 'active') || null;
        } catch (error) {
            console.error('Error fetching active sprint:', error);
            return null;
        }
    }

    async getSprintIssues(boardId: number, sprintId: number, assignee?: string): Promise<JiraIssue[]> {
        try {
            const api = this.getAxiosInstance();
            const params: any = {
                maxResults: 100,
                fields: 'summary,description,status,priority,assignee,issuetype,created,updated,sprint',
            };

            // Add JQL filter for assignee if specified
            if (assignee && assignee !== 'all') {
                if (assignee === 'unassigned') {
                    params.jql = 'assignee is EMPTY';
                } else {
                    params.jql = `assignee = "${assignee}"`;
                }
            }

            const response = await api.get(`/rest/agile/1.0/board/${boardId}/sprint/${sprintId}/issue`, {
                params,
            });
            return response.data.issues || [];
        } catch (error) {
            console.error('Error fetching sprint issues:', error);
            throw error;
        }
    }

    async getBacklogIssues(boardId: number, assignee?: string): Promise<JiraIssue[]> {
        try {
            const api = this.getAxiosInstance();
            const params: any = {
                maxResults: 100,
                fields: 'summary,description,status,priority,assignee,issuetype,created,updated,sprint',
            };

            // Add JQL filter for assignee if specified
            if (assignee && assignee !== 'all') {
                if (assignee === 'unassigned') {
                    params.jql = 'assignee is EMPTY';
                } else {
                    params.jql = `assignee = \"${assignee}\"`;
                }
            }

            const response = await api.get(`/rest/agile/1.0/board/${boardId}/backlog`, {
                params,
            });
            return response.data.issues || [];
        } catch (error) {
            console.error('Error fetching backlog issues:', error);
            throw error;
        }
    }

    async getIssueDetails(issueKey: string): Promise<JiraIssue> {
        try {
            const cacheKey = this.getCacheKey(`/rest/api/3/issue/${issueKey}`, {});

            // Check cache (2 minute cache for issue details)
            const entry = this.cache.get(cacheKey);
            if (entry && (Date.now() - entry.timestamp) < 120000) { // 2 minutes
                return entry.data;
            }

            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/issue/${issueKey}`, {
                params: {
                    fields: 'summary,description,status,priority,assignee,issuetype,created,updated,reporter,attachment,duedate,customfield_10016,customfield_10020',
                },
            });

            const issue = response.data;
            this.setCache(cacheKey, issue);
            return issue;
        } catch (error) {
            console.error('Error fetching issue details:', error);
            throw error;
        }
    }

    async getIssueComments(issueKey: string): Promise<any[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/issue/${issueKey}/comment`, {
                params: {
                    expand: 'renderedBody',
                },
            });
            const comments = response.data.comments || [];
            console.log('Raw comments from API:', JSON.stringify(comments.map((c: any) => ({
                id: c.id,
                parent: c.parent,
                jsdPublic: c.jsdPublic,
            })), null, 2));
            return comments;
        } catch (error) {
            console.error('Error fetching issue comments:', error);
            throw error;
        }
    }

    async addComment(issueKey: string, commentText: string, parentCommentId?: string, mentionedUser?: { accountId: string, displayName: string }): Promise<any> {
        try {
            const api = this.getAxiosInstance();

            // Build content with mention if provided
            const content: any[] = [];

            if (mentionedUser) {
                // Add mention node
                content.push({
                    type: 'paragraph',
                    content: [
                        {
                            type: 'mention',
                            attrs: {
                                id: mentionedUser.accountId,
                                text: `@${mentionedUser.displayName}`,
                            },
                        },
                        {
                            type: 'text',
                            text: ' ',
                        },
                    ],
                });
            }

            // Add comment text
            content.push({
                type: 'paragraph',
                content: [
                    {
                        type: 'text',
                        text: commentText,
                    },
                ],
            });

            const payload: any = {
                body: {
                    type: 'doc',
                    version: 1,
                    content,
                },
            };

            // Add parent field for reply (only works in Jira Service Management)
            if (parentCommentId) {
                payload.parent = { id: parentCommentId };
                console.log('Adding comment with parent ID:', parentCommentId);
                console.log('Full payload:', JSON.stringify(payload, null, 2));
            }

            console.log('Posting comment to:', `/rest/api/3/issue/${issueKey}/comment`);
            const response = await api.post(`/rest/api/3/issue/${issueKey}/comment`, payload);
            console.log('Comment created, response:', JSON.stringify(response.data, null, 2));

            // Clear issue details cache when comment is added
            this.clearCacheByPattern(`/rest/api/3/issue/${issueKey}`);

            return response.data;
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    async updateComment(issueKey: string, commentId: string, commentText: string): Promise<any> {
        try {
            const api = this.getAxiosInstance();
            const payload = {
                body: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: commentText,
                                },
                            ],
                        },
                    ],
                },
            };

            const response = await api.put(`/rest/api/3/issue/${issueKey}/comment/${commentId}`, payload);

            // Clear issue details cache when comment is updated
            this.clearCacheByPattern(`/rest/api/3/issue/${issueKey}`);

            return response.data;
        } catch (error) {
            console.error('Error updating comment:', error);
            throw error;
        }
    }

    async deleteComment(issueKey: string, commentId: string): Promise<void> {
        try {
            const api = this.getAxiosInstance();
            await api.delete(`/rest/api/3/issue/${issueKey}/comment/${commentId}`);

            // Clear issue details cache when comment is deleted
            this.clearCacheByPattern(`/rest/api/3/issue/${issueKey}`);
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    }

    async searchIssues(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.post('/rest/api/3/search/jql', {
                jql,
                maxResults,
                fields: ['summary', 'description', 'status', 'priority', 'assignee', 'issuetype', 'created', 'updated'],
            });
            return response.data.issues || [];
        } catch (error: any) {
            console.error('Error searching issues:', error);
            console.error('JQL query:', jql);
            console.error('Error response:', error?.response?.data);
            return []; // Return empty array instead of throwing
        }
    }

    async completeSprint(sprintId: number): Promise<void> {
        try {
            const api = this.getAxiosInstance();
            await api.post(`/rest/agile/1.0/sprint/${sprintId}`, {
                state: 'closed'
            });
        } catch (error) {
            console.error('Error completing sprint:', error);
            throw error;
        }
    }

    async fetchAttachment(url: string): Promise<string> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(url, {
                responseType: 'arraybuffer',
            });

            // Convert to base64 safely for large files
            if (typeof Buffer !== 'undefined') {
                // Node.js environment
                return Buffer.from(response.data).toString('base64');
            } else {
                // Browser environment - handle large arrays without stack overflow
                const uint8Array = new Uint8Array(response.data);
                let binary = '';
                const chunkSize = 8192; // Process in chunks to avoid stack overflow

                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                    binary += String.fromCharCode.apply(null, Array.from(chunk));
                }

                return btoa(binary);
            }
        } catch (error) {
            console.error('Error fetching attachment:', error);
            throw error;
        }
    }

    async getAssignableUsers(issueKey: string, query?: string): Promise<Array<{
        accountId: string;
        displayName: string;
        emailAddress?: string;
        avatarUrls: { '48x48': string };
    }>> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/user/assignable/search`, {
                params: {
                    issueKey,
                    query,
                    maxResults: 50,
                },
            });
            return response.data || [];
        } catch (error) {
            console.error('Error fetching assignable users:', error);
            throw error;
        }
    }

    async getAssignableUsersForProject(projectKey: string, query?: string): Promise<Array<{
        accountId: string;
        displayName: string;
        emailAddress?: string;
        avatarUrls: { '48x48': string };
    }>> {
        try {
            // Only cache if no query (empty search should be cached)
            let cacheKey = null;
            if (!query) {
                cacheKey = this.getCacheKey(`/rest/api/3/user/assignable/search`, { project: projectKey });

                // Check cache (5 minute cache for users)
                const entry = this.cache.get(cacheKey);
                if (entry && (Date.now() - entry.timestamp) < this.CACHE_DURATION) {
                    return entry.data;
                }
            }

            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/user/assignable/search`, {
                params: {
                    project: projectKey,
                    query,
                    maxResults: 100,
                },
            });

            const users = response.data || [];

            // Cache only if no query
            if (cacheKey) {
                this.setCache(cacheKey, users);
            }

            return users;
        } catch (error) {
            console.error('Error fetching assignable users for project:', error);
            return []; // Return empty array instead of throwing
        }
    }

    async assignIssue(issueKey: string, accountId: string | null): Promise<void> {
        try {
            const api = this.getAxiosInstance();
            await api.put(`/rest/api/3/issue/${issueKey}/assignee`, {
                accountId: accountId, // null to unassign
            });

            // Clear caches after assigning issue
            this.clearCacheByPattern(`/rest/api/3/issue/${issueKey}`);
            this.clearCacheByPattern('/rest/agile/1.0/board');
        } catch (error) {
            console.error('Error assigning issue:', error);
            throw error;
        }
    }

    async getIssueLinks(issueKey: string): Promise<any[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/issue/${issueKey}`, {
                params: {
                    fields: 'issuelinks',
                },
            });
            return response.data.fields.issuelinks || [];
        } catch (error) {
            console.error('Error fetching issue links:', error);
            return [];
        }
    }

    async getRemoteLinks(issueKey: string): Promise<any[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/issue/${issueKey}/remotelink`);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching remote links:', error);
            return [];
        }
    }

    async getAvailableTransitions(issueKey: string): Promise<any[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/issue/${issueKey}/transitions`);
            return response.data.transitions || [];
        } catch (error) {
            console.error('Error fetching transitions:', error);
            return [];
        }
    }

    async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
        try {
            const api = this.getAxiosInstance();
            await api.post(`/rest/api/3/issue/${issueKey}/transitions`, {
                transition: {
                    id: transitionId,
                },
            });

            // Clear caches after transitioning issue (status changed)
            this.clearCacheByPattern(`/rest/api/3/issue/${issueKey}`);
            this.clearCacheByPattern('/rest/agile/1.0/board');
        } catch (error) {
            console.error('Error transitioning issue:', error);
            throw error;
        }
    }

    async getProjectIssueTypes(projectKey: string): Promise<any[]> {
        try {
            const cacheKey = this.getCacheKey(`/rest/api/3/project/${projectKey}/issueTypes`, {});

            // Check cache (5 minute cache for issue types)
            const entry = this.cache.get(cacheKey);
            if (entry && (Date.now() - entry.timestamp) < this.CACHE_DURATION) {
                return entry.data;
            }

            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/project/${projectKey}`);
            const issueTypes = response.data.issueTypes || [];
            this.setCache(cacheKey, issueTypes);
            return issueTypes;
        } catch (error) {
            console.error('Error fetching issue types:', error);
            return [];
        }
    }

    async getPriorities(): Promise<any[]> {
        try {
            const cacheKey = this.getCacheKey(`/rest/api/3/priority`, {});

            // Check cache (30 minute cache for priorities - rarely change)
            const entry = this.cache.get(cacheKey);
            if (entry && (Date.now() - entry.timestamp) < 1800000) { // 30 minutes
                return entry.data;
            }

            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/priority`);
            const priorities = response.data || [];
            this.setCache(cacheKey, priorities);
            return priorities;
        } catch (error) {
            console.error('Error fetching priorities:', error);
            return [];
        }
    }

    async getCurrentUser(): Promise<any> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get('/rest/api/3/myself');
            return response.data;
        } catch (error) {
            console.error('Error fetching current user:', error);
            return null;
        }
    }

    async updateIssueField(issueKey: string, fields: any): Promise<void> {
        try {
            const api = this.getAxiosInstance();
            await api.put(`/rest/api/3/issue/${issueKey}`, {
                fields,
            });

            // Clear caches after updating issue
            this.clearCacheByPattern(`/rest/api/3/issue/${issueKey}`);
            this.clearCacheByPattern('/rest/agile/1.0/board');
        } catch (error) {
            console.error('Error updating issue field:', error);
            throw error;
        }
    }

    async createIssue(projectId: string, data: {
        issueType: string;
        summary: string;
        description?: string;
        assignee?: string | null;
        priority?: string | null;
        dueDate?: string;
        storyPoints?: number;
        sprintId?: number;
        parent?: string;
    }): Promise<any> {
        try {
            const api = this.getAxiosInstance();

            const fields: any = {
                project: { key: projectId },
                issuetype: { id: data.issueType },
                summary: data.summary,
            };

            // Add parent if provided
            if (data.parent) {
                fields.parent = { key: data.parent };
            }

            // Add description if provided
            if (data.description) {
                // Strip HTML tags from rich text editor
                const plainText = data.description.replace(/<[^>]*>/g, '').trim();
                if (plainText) {
                    fields.description = {
                        type: 'doc',
                        version: 1,
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: plainText,
                                    },
                                ],
                            },
                        ],
                    };
                }
            }

            // Add assignee
            if (data.assignee) {
                fields.assignee = { accountId: data.assignee };
            } else {
                fields.assignee = null; // Unassigned
            }

            // Add priority
            if (data.priority) {
                fields.priority = { id: data.priority };
            }

            // Add due date
            if (data.dueDate) {
                fields.duedate = data.dueDate; // Format: YYYY-MM-DD
            }

            // Add story points (custom field)
            if (data.storyPoints !== undefined) {
                fields.customfield_10016 = data.storyPoints;
            }

            const payload = { fields };

            console.log('Creating issue with payload:', JSON.stringify(payload, null, 2));
            const response = await api.post('/rest/api/3/issue', payload);

            // Clear relevant caches after creating issue
            this.clearCacheByPattern('/rest/agile/1.0/board');
            this.clearCacheByPattern('/rest/api/3/issue');

            // If sprint is specified, add issue to sprint
            if (data.sprintId && response.data.key) {
                try {
                    await api.post(`/rest/agile/1.0/sprint/${data.sprintId}/issue`, {
                        issues: [response.data.key],
                    });
                    console.log(`Added issue ${response.data.key} to sprint ${data.sprintId}`);
                } catch (sprintError) {
                    console.error('Error adding issue to sprint:', sprintError);
                    // Don't throw - issue was created successfully
                }
            }

            return response.data;
        } catch (error) {
            console.error('Error creating issue:', error);
            throw error;
        }
    }

    async getProjectForBoard(boardId: number): Promise<any> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/agile/1.0/board/${boardId}/configuration`);
            return response.data?.location;
        } catch (error) {
            console.error('Error fetching project for board:', error);
            return null;
        }
    }

    async getIssueTypesForProject(projectId: string): Promise<any[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/project/${projectId}`);
            return response.data?.issueTypes || [];
        } catch (error) {
            console.error('Error fetching issue types:', error);
            return [];
        }
    }

    async generateDescription(summary: string, issueType?: string): Promise<string> {
        // Generate a structured, intelligent description template based on issue type
        // Note: Atlassian Intelligence API may not be available in all Jira instances
        // This provides a smart, context-aware template instead

        const typeLower = issueType?.toLowerCase() || '';

        // Generate description based on issue type
        if (typeLower.includes('bug')) {
            return `## Problem Description\n${summary}\n\n## Steps to Reproduce\n1. Navigate to...\n2. Click on...\n3. Observe that...\n\n## Expected Behavior\nDescribe what should happen\n\n## Actual Behavior\nDescribe what actually happens\n\n## Environment\n- Browser/Device:\n- Version:\n- Operating System:\n\n## Additional Context\nAdd any other context about the problem here, including screenshots if available.`;
        } else if (typeLower.includes('story') || typeLower.includes('user story')) {
            return `## User Story\nAs a [type of user]\nI want [goal]\nSo that [benefit]\n\n## Description\n${summary}\n\n## Acceptance Criteria\n- [ ] Given [context], when [action], then [outcome]\n- [ ] The feature should [requirement]\n- [ ] Users can [capability]\n\n## Technical Notes\n- Consider [technical aspect]\n- Dependencies: [list any dependencies]\n\n## Design Notes\n- UI/UX considerations\n- Accessibility requirements`;
        } else if (typeLower.includes('task')) {
            return `## Objective\n${summary}\n\n## Description\nProvide detailed information about this task.\n\n## Steps to Complete\n1. First step\n2. Second step\n3. Third step\n\n## Acceptance Criteria\n- [ ] Task requirement 1\n- [ ] Task requirement 2\n- [ ] Task requirement 3\n\n## Dependencies\nList any dependencies or blockers\n\n## Additional Notes\nAny other relevant information`;
        } else if (typeLower.includes('epic')) {
            return `## Epic Overview\n${summary}\n\n## Goals & Objectives\n- Primary goal 1\n- Primary goal 2\n- Primary goal 3\n\n## User Value\nDescribe the value this epic brings to users\n\n## Scope\n### In Scope\n- Feature 1\n- Feature 2\n\n### Out of Scope\n- Item 1\n- Item 2\n\n## Success Metrics\n- Metric 1: [target]\n- Metric 2: [target]\n\n## Timeline & Milestones\n- Phase 1: [description]\n- Phase 2: [description]`;
        } else if (typeLower.includes('sub-task') || typeLower.includes('subtask')) {
            return `## Sub-task Description\n${summary}\n\n## Details\nProvide specific details about this sub-task.\n\n## Acceptance Criteria\n- [ ] Criterion 1\n- [ ] Criterion 2\n\n## Implementation Notes\nTechnical details or approach\n\n## Testing Notes\nHow to verify this sub-task is complete`;
        } else {
            // Generic template for other issue types
            return `## Overview\n${summary}\n\n## Description\nProvide detailed information about this ${issueType || 'issue'}.\n\n## Acceptance Criteria\n- [ ] Requirement 1\n- [ ] Requirement 2\n- [ ] Requirement 3\n\n## Technical Considerations\n- Consideration 1\n- Consideration 2\n\n## Additional Notes\nAdd any relevant notes, attachments, or links here.`;
        }
    }

    async moveIssueToSprint(issueKey: string, sprintId: number | null): Promise<void> {
        try {
            const api = this.getAxiosInstance();

            if (sprintId === null) {
                // Move to backlog - clear sprint field
                await api.put(`/rest/api/3/issue/${issueKey}`, {
                    fields: {
                        customfield_10020: null
                    }
                });
            } else {
                // Move to sprint using Agile API
                await api.post(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
                    issues: [issueKey]
                });
            }

            // Clear caches after moving issue
            this.clearCacheByPattern(`/rest/api/3/issue/${issueKey}`);
            this.clearCacheByPattern('/rest/agile/1.0/board');
            this.clearCacheByPattern('/rest/agile/1.0/sprint');
        } catch (error) {
            console.error('Error moving issue to sprint:', error);
            throw error;
        }
    }

    reset(): void {
        this.axiosInstance = null;
        this.config = null;
        this.cache.clear();
        this.pendingRequests.clear();
        this.cancelPendingRequests();
    }
}

export const jiraApi = new JiraApiService();
