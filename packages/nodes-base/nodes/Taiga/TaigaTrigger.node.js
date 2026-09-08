import { NodeConnectionTypes, } from 'n8n-workflow';
import { getAutomaticSecret, taigaApiRequest } from './GenericFunctions';
import { verifySignature } from './TaigaTriggerHelpers';
export class TaigaTrigger {
    description = {
        displayName: 'Taiga Trigger',
        name: 'taigaTrigger',
        icon: 'file:taiga.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{"project:" + $parameter["projectSlug"]}}',
        description: 'Handle Taiga events via webhook',
        defaults: {
            name: 'Taiga Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'taigaApi',
                required: true,
            },
        ],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'onReceived',
                path: 'webhook',
            },
        ],
        properties: [
            {
                displayName: 'Project Name or ID',
                name: 'projectId',
                type: 'options',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                typeOptions: {
                    loadOptionsMethod: 'getUserProjects',
                },
                default: '',
                required: true,
            },
            {
                displayName: 'Resources',
                name: 'resources',
                type: 'multiOptions',
                required: true,
                default: ['all'],
                options: [
                    {
                        name: 'All',
                        value: 'all',
                    },
                    {
                        name: 'Issue',
                        value: 'issue',
                    },
                    {
                        name: 'Milestone (Sprint)',
                        value: 'milestone',
                    },
                    {
                        name: 'Task',
                        value: 'task',
                    },
                    {
                        name: 'User Story',
                        value: 'userstory',
                    },
                    {
                        name: 'Wikipage',
                        value: 'wikipage',
                    },
                ],
                description: 'Resources to listen to',
            },
            {
                displayName: 'Operations',
                name: 'operations',
                type: 'multiOptions',
                required: true,
                default: ['all'],
                description: 'Operations to listen to',
                options: [
                    {
                        name: 'All',
                        value: 'all',
                    },
                    {
                        name: 'Create',
                        value: 'create',
                    },
                    {
                        name: 'Delete',
                        value: 'delete',
                    },
                    {
                        name: 'Update',
                        value: 'change',
                    },
                ],
            },
        ],
    };
    methods = {
        loadOptions: {
            // Get all the available projects to display them to user so that they can
            // select them easily
            async getUserProjects() {
                const returnData = [];
                const { id } = await taigaApiRequest.call(this, 'GET', '/users/me');
                const projects = await taigaApiRequest.call(this, 'GET', '/projects', {}, { member: id });
                for (const project of projects) {
                    const projectName = project.name;
                    const projectId = project.id;
                    returnData.push({
                        name: projectName,
                        value: projectId,
                    });
                }
                return returnData;
            },
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const endpoint = '/webhooks';
                const webhooks = await taigaApiRequest.call(this, 'GET', endpoint);
                for (const webhook of webhooks) {
                    if (webhook.url === webhookUrl) {
                        webhookData.webhookId = webhook.id;
                        webhookData.key = webhook.key;
                        return true;
                    }
                }
                return false;
            },
            async create() {
                const credentials = await this.getCredentials('taigaApi');
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const projectId = this.getNodeParameter('projectId');
                const key = getAutomaticSecret(credentials);
                const body = {
                    name: `n8n-webhook:${webhookUrl}`,
                    url: webhookUrl,
                    key,
                    project: projectId,
                };
                const { id } = await taigaApiRequest.call(this, 'POST', '/webhooks', body);
                webhookData.webhookId = id;
                webhookData.key = key;
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                try {
                    await taigaApiRequest.call(this, 'DELETE', `/webhooks/${webhookData.webhookId}`);
                }
                catch (error) {
                    return false;
                }
                delete webhookData.webhookId;
                delete webhookData.key;
                return true;
            },
        },
    };
    async webhook() {
        if (!verifySignature.call(this)) {
            const res = this.getResponseObject();
            res.status(401).send('Unauthorized').end();
            return { noWebhookResponse: true };
        }
        const body = this.getRequestObject().body;
        const operations = this.getNodeParameter('operations', []);
        const resources = this.getNodeParameter('resources', []);
        if (!operations.includes('all') && !operations.includes(body.action)) {
            return {};
        }
        if (!resources.includes('all') && !resources.includes(body.type)) {
            return {};
        }
        return {
            workflowData: [this.helpers.returnJsonArray(body)],
        };
    }
}
//# sourceMappingURL=TaigaTrigger.node.js.map