import axios, { AxiosInstance } from 'axios';
import { JiraConfig, JiraIssue, JiraBoard, JiraSprint } from '../types/jira';

class JiraApiService {
    private axiosInstance: AxiosInstance | null = null;
    private config: JiraConfig | null = null;

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
            },
            timeout: 30000,
        });
    }

    private getAxiosInstance(): AxiosInstance {
        if (!this.axiosInstance) {
            throw new Error('Jira API not initialized. Please configure credentials first.');
        }
        return this.axiosInstance;
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
            const api = this.getAxiosInstance();
            const params: any = {
                startAt,
                maxResults,
            };

            if (searchQuery && searchQuery.trim()) {
                params.name = searchQuery.trim();
            }

            const response = await api.get('/rest/agile/1.0/board', { params });
            return {
                boards: response.data.values || [],
                total: response.data.total || 0,
                isLast: response.data.isLast || false,
            };
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
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/agile/1.0/board/${boardId}/issue`, {
                params: {
                    maxResults,
                    fields: 'summary,description,status,priority,assignee,issuetype,created,updated',
                },
            });
            return response.data.issues || [];
        } catch (error) {
            console.error('Error fetching board issues:', error);
            throw error;
        }
    }

    async getBoardAssignees(boardId: number): Promise<Array<{ key: string, name: string }>> {
        try {
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

            return Array.from(uniqueAssignees.entries()).map(([key, name]) => ({ key, name }));
        } catch (error) {
            console.error('Error fetching board assignees:', error);
            return [];
        }
    }

    async getSprintsForBoard(boardId: number): Promise<JiraSprint[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/agile/1.0/board/${boardId}/sprint`);
            return response.data.values || [];
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
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/issue/${issueKey}`, {
                params: {
                    fields: 'summary,description,status,priority,assignee,issuetype,created,updated,reporter,attachment,duedate,customfield_10016',
                },
            });
            return response.data;
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
        } catch (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }
    }

    async searchIssues(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.post('/rest/api/3/search', {
                jql,
                maxResults,
                fields: ['summary', 'description', 'status', 'priority', 'assignee', 'issuetype', 'created', 'updated'],
            });
            return response.data.issues || [];
        } catch (error) {
            console.error('Error searching issues:', error);
            throw error;
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

    async assignIssue(issueKey: string, accountId: string | null): Promise<void> {
        try {
            const api = this.getAxiosInstance();
            await api.put(`/rest/api/3/issue/${issueKey}/assignee`, {
                accountId: accountId, // null to unassign
            });
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
        } catch (error) {
            console.error('Error transitioning issue:', error);
            throw error;
        }
    }

    async getProjectIssueTypes(projectKey: string): Promise<any[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/project/${projectKey}`);
            return response.data.issueTypes || [];
        } catch (error) {
            console.error('Error fetching issue types:', error);
            return [];
        }
    }

    async getPriorities(): Promise<any[]> {
        try {
            const api = this.getAxiosInstance();
            const response = await api.get(`/rest/api/3/priority`);
            return response.data || [];
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
        } catch (error) {
            console.error('Error updating issue field:', error);
            throw error;
        }
    }

    reset(): void {
        this.axiosInstance = null;
        this.config = null;
    }
}

export const jiraApi = new JiraApiService();
