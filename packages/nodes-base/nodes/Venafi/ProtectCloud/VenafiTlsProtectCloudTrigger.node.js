import { NodeConnectionTypes, } from 'n8n-workflow';
import { venafiApiRequest } from './GenericFunctions';
export class VenafiTlsProtectCloudTrigger {
    description = {
        displayName: 'Venafi TLS Protect Cloud Trigger',
        name: 'venafiTlsProtectCloudTrigger',
        icon: 'file:../venafi.svg',
        group: ['trigger'],
        version: 1,
        description: 'Starts the workflow when Venafi events occur',
        defaults: {
            name: 'Venafi TLS Protect Cloud Trigger',
        },
        credentials: [
            {
                name: 'venafiTlsProtectCloudApi',
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
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        properties: [
            {
                // eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                typeOptions: {
                    loadOptionsMethod: 'getActivityTypes',
                },
                required: true,
                default: [],
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
            {
                // eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
                displayName: 'Trigger On',
                name: 'triggerOn',
                type: 'multiOptions',
                typeOptions: {
                    loadOptionsMethod: 'getActivitySubTypes',
                    loadOptionsDependsOn: ['resource'],
                },
                required: true,
                default: [],
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
        ],
    };
    methods = {
        loadOptions: {
            async getActivityTypes() {
                const activitytypes = await venafiApiRequest.call(this, 'GET', '/v1/activitytypes');
                return activitytypes.map(({ key, readableName }) => ({
                    name: readableName,
                    value: key,
                }));
            },
            async getActivitySubTypes() {
                const resource = this.getCurrentNodeParameter('resource');
                const activitytypes = await venafiApiRequest.call(this, 'GET', '/v1/activitytypes');
                const activity = activitytypes.find(({ key }) => key === resource);
                const subActivities = activity.values.map(({ key, readableName }) => ({
                    name: readableName,
                    value: key,
                }));
                subActivities.unshift({ name: '[All]', value: '*' });
                return subActivities;
            },
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const { connectors } = await venafiApiRequest.call(this, 'GET', '/v1/connectors');
                for (const connector of connectors) {
                    const { id, status, properties: { target: { connection: { url }, }, }, } = connector;
                    if (url === webhookUrl && status === 'Active') {
                        await venafiApiRequest.call(this, 'DELETE', `/v1/connectors/${id}`);
                        return false;
                    }
                }
                return false;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const resource = this.getNodeParameter('resource');
                const body = {
                    name: `n8n-webhook (${webhookUrl})`,
                    properties: {
                        connectorKind: 'WEBHOOK',
                        target: {
                            type: 'generic',
                            connection: {
                                url: webhookUrl,
                            },
                        },
                        filter: {
                            activityTypes: [resource],
                        },
                    },
                };
                const responseData = await venafiApiRequest.call(this, 'POST', '/v1/connectors', body);
                if (responseData.id === undefined) {
                    // Required data is missing so was not successful
                    return false;
                }
                const webhookData = this.getWorkflowStaticData('node');
                webhookData.webhookId = responseData.id;
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                if (webhookData.webhookId !== undefined) {
                    try {
                        await venafiApiRequest.call(this, 'DELETE', `/v1/connectors/${webhookData.webhookId}`);
                    }
                    catch (error) {
                        return false;
                    }
                    // Remove from the static workflow data so that it is clear
                    // that no webhooks are registered anymore
                    delete webhookData.webhookId;
                }
                return true;
            },
        },
    };
    async webhook() {
        const { events } = this.getBodyData();
        const triggerOn = this.getNodeParameter('triggerOn');
        if (Array.isArray(events) && events[0]?.message?.includes('TESTING CONNECTION...')) {
            // Is a create webhook confirmation request
            const res = this.getResponseObject();
            res.status(200).end();
            return {
                noWebhookResponse: true,
            };
        }
        if (!triggerOn.includes('*') && !triggerOn.includes(events[0]?.eventName))
            return {};
        return {
            workflowData: [this.helpers.returnJsonArray(events)],
        };
    }
}
//# sourceMappingURL=VenafiTlsProtectCloudTrigger.node.js.map