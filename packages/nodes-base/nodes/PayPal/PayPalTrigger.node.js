import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { payPalApiRequest, upperFist } from './GenericFunctions';
export class PayPalTrigger {
    description = {
        displayName: 'PayPal Trigger',
        name: 'payPalTrigger',
        icon: 'file:paypal.svg',
        group: ['trigger'],
        version: 1,
        description: 'Handle PayPal events via webhooks',
        defaults: {
            name: 'PayPal Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'payPalApi',
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
                displayName: 'Event Names or IDs',
                name: 'events',
                type: 'multiOptions',
                required: true,
                default: [],
                description: 'The event to listen to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
                typeOptions: {
                    loadOptionsMethod: 'getEvents',
                },
                options: [],
            },
        ],
    };
    methods = {
        loadOptions: {
            // Get all the events types to display them to user so that they can
            // select them easily
            async getEvents() {
                const returnData = [
                    {
                        name: '*',
                        value: '*',
                        description: 'Any time any event is triggered (Wildcard Event)',
                    },
                ];
                let events;
                try {
                    const endpoint = '/notifications/webhooks-event-types';
                    events = await payPalApiRequest.call(this, endpoint, 'GET');
                }
                catch (error) {
                    throw new NodeApiError(this.getNode(), error);
                }
                for (const event of events.event_types) {
                    const eventName = upperFist(event.name);
                    const eventId = event.name;
                    const eventDescription = event.description;
                    returnData.push({
                        name: eventName,
                        value: eventId,
                        description: eventDescription,
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
                    // No webhook id is set so no webhook can exist
                    return false;
                }
                const endpoint = `/notifications/webhooks/${webhookData.webhookId}`;
                try {
                    await payPalApiRequest.call(this, endpoint, 'GET');
                }
                catch (error) {
                    if (error.response && error.response.name === 'INVALID_RESOURCE_ID') {
                        // Webhook does not exist
                        delete webhookData.webhookId;
                        return false;
                    }
                    throw new NodeApiError(this.getNode(), error);
                }
                return true;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const events = this.getNodeParameter('events', []);
                const body = {
                    url: webhookUrl,
                    event_types: events.map((event) => {
                        return { name: event };
                    }),
                };
                const endpoint = '/notifications/webhooks';
                const webhook = await payPalApiRequest.call(this, endpoint, 'POST', body);
                if (webhook.id === undefined) {
                    return false;
                }
                const webhookData = this.getWorkflowStaticData('node');
                webhookData.webhookId = webhook.id;
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                if (webhookData.webhookId !== undefined) {
                    const endpoint = `/notifications/webhooks/${webhookData.webhookId}`;
                    try {
                        await payPalApiRequest.call(this, endpoint, 'DELETE', {});
                    }
                    catch (error) {
                        return false;
                    }
                    delete webhookData.webhookId;
                }
                return true;
            },
        },
    };
    async webhook() {
        const webhookData = this.getWorkflowStaticData('node');
        const bodyData = this.getBodyData();
        const req = this.getRequestObject();
        const headerData = this.getHeaderData();
        const endpoint = '/notifications/verify-webhook-signature';
        const { env } = await this.getCredentials('payPalApi');
        // if sanbox omit verification
        if (env === 'sanbox') {
            return {
                workflowData: [this.helpers.returnJsonArray(req.body)],
            };
        }
        if (headerData['paypal-auth-algo'] !== undefined &&
            headerData['paypal-cert-url'] !== undefined &&
            headerData['paypal-transmission-id'] !== undefined &&
            headerData['paypal-transmission-sig'] !== undefined &&
            headerData['paypal-transmission-time'] !== undefined) {
            const body = {
                auth_algo: headerData['paypal-auth-algo'],
                cert_url: headerData['paypal-cert-url'],
                transmission_id: headerData['paypal-transmission-id'],
                transmission_sig: headerData['paypal-transmission-sig'],
                transmission_time: headerData['paypal-transmission-time'],
                webhook_id: webhookData.webhookId,
                webhook_event: bodyData,
            };
            const webhook = await payPalApiRequest.call(this, endpoint, 'POST', body);
            if (webhook.verification_status !== 'SUCCESS') {
                return {};
            }
        }
        else {
            return {};
        }
        return {
            workflowData: [this.helpers.returnJsonArray(req.body)],
        };
    }
}
//# sourceMappingURL=PayPalTrigger.node.js.map