import { randomBytes } from 'crypto';
import { NodeConnectionTypes, } from 'n8n-workflow';
import { parse as urlParse } from 'url';
import { mauticApiRequest } from './GenericFunctions';
import { verifySignature } from './MauticTriggerHelpers';
export class MauticTrigger {
    description = {
        displayName: 'Mautic Trigger',
        name: 'mauticTrigger',
        icon: 'file:mautic.svg',
        group: ['trigger'],
        version: 1,
        description: 'Handle Mautic events via webhooks',
        defaults: {
            name: 'Mautic Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'mauticApi',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['credentials'],
                    },
                },
            },
            {
                name: 'mauticOAuth2Api',
                required: true,
                displayOptions: {
                    show: {
                        authentication: ['oAuth2'],
                    },
                },
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
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    {
                        name: 'Credentials',
                        value: 'credentials',
                    },
                    {
                        name: 'OAuth2',
                        value: 'oAuth2',
                    },
                ],
                default: 'credentials',
            },
            {
                displayName: 'Event Names or IDs',
                name: 'events',
                type: 'multiOptions',
                description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                required: true,
                typeOptions: {
                    loadOptionsMethod: 'getEvents',
                },
                default: [],
            },
            {
                displayName: 'Events Order',
                name: 'eventsOrder',
                type: 'options',
                default: 'ASC',
                options: [
                    {
                        name: 'ASC',
                        value: 'ASC',
                    },
                    {
                        name: 'DESC',
                        value: 'DESC',
                    },
                ],
                description: 'Order direction for queued events in one webhook. Can be “DESC” or “ASC”.',
            },
        ],
    };
    methods = {
        loadOptions: {
            // Get all the events to display them to user so that they can
            // select them easily
            async getEvents() {
                const returnData = [];
                const { triggers } = await mauticApiRequest.call(this, 'GET', '/hooks/triggers');
                for (const [key, value] of Object.entries(triggers)) {
                    const eventId = key;
                    const eventName = value.label;
                    const eventDecription = value.description;
                    returnData.push({
                        name: eventName,
                        value: eventId,
                        description: eventDecription,
                    });
                }
                return returnData;
            },
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookData = this.getWorkflowStaticData('node');
                if (webhookData.webhookId === undefined) {
                    return false;
                }
                const endpoint = `/hooks/${webhookData.webhookId}`;
                try {
                    await mauticApiRequest.call(this, 'GET', endpoint, {});
                }
                catch (error) {
                    return false;
                }
                return true;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const events = this.getNodeParameter('events', 0);
                const eventsOrder = this.getNodeParameter('eventsOrder', 0);
                const urlParts = urlParse(webhookUrl);
                const webhookSecret = randomBytes(32).toString('hex');
                const body = {
                    name: `n8n-webhook:${urlParts.path}`,
                    description: 'n8n webhook',
                    webhookUrl,
                    secret: webhookSecret,
                    triggers: events,
                    eventsOrderbyDir: eventsOrder,
                    isPublished: true,
                };
                const { hook } = await mauticApiRequest.call(this, 'POST', '/hooks/new', body);
                webhookData.webhookId = hook.id;
                webhookData.webhookSecret = webhookSecret;
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                try {
                    await mauticApiRequest.call(this, 'DELETE', `/hooks/${webhookData.webhookId}/delete`);
                }
                catch (error) {
                    return false;
                }
                delete webhookData.webhookId;
                delete webhookData.webhookSecret;
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
        const req = this.getRequestObject();
        return {
            workflowData: [this.helpers.returnJsonArray(req.body)],
        };
    }
}
//# sourceMappingURL=MauticTrigger.node.js.map