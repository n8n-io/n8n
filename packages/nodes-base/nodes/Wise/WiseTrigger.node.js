import { createVerify } from 'crypto';
import { NodeConnectionTypes } from 'n8n-workflow';
import { getTriggerName, livePublicKey, testPublicKey, wiseApiRequest } from './GenericFunctions';
export class WiseTrigger {
    description = {
        displayName: 'Wise Trigger',
        name: 'wiseTrigger',
        icon: 'file:wise.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["event"]}}',
        description: 'Handle Wise events via webhooks',
        defaults: {
            name: 'Wise Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'wiseApi',
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
                displayName: 'Profile Name or ID',
                name: 'profileId',
                type: 'options',
                description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                required: true,
                typeOptions: {
                    loadOptionsMethod: 'getProfiles',
                },
                default: '',
            },
            {
                displayName: 'Event',
                name: 'event',
                type: 'options',
                required: true,
                default: '',
                options: [
                    {
                        name: 'Balance Credit',
                        value: 'balanceCredit',
                        description: 'Triggered every time a balance account is credited',
                    },
                    {
                        name: 'Balance Update',
                        value: 'balanceUpdate',
                        description: 'Triggered every time a balance account is credited or debited',
                    },
                    {
                        name: 'Transfer Active Case',
                        value: 'transferActiveCases',
                        description: "Triggered every time a transfer's list of active cases is updated",
                    },
                    {
                        name: 'Transfer State Changed',
                        value: 'tranferStateChange',
                        description: "Triggered every time a transfer's status is updated",
                    },
                ],
            },
        ],
    };
    methods = {
        loadOptions: {
            async getProfiles() {
                const profiles = await wiseApiRequest.call(this, 'GET', 'v1/profiles');
                return profiles.map(({ id, type }) => ({
                    name: type.charAt(0).toUpperCase() + type.slice(1),
                    value: id,
                }));
            },
        },
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookData = this.getWorkflowStaticData('node');
                const webhookUrl = this.getNodeWebhookUrl('default');
                const profileId = this.getNodeParameter('profileId');
                const event = this.getNodeParameter('event');
                const webhooks = await wiseApiRequest.call(this, 'GET', `v3/profiles/${profileId}/subscriptions`);
                const trigger = getTriggerName(event);
                for (const webhook of webhooks) {
                    if (webhook.delivery.url === webhookUrl &&
                        webhook.scope.id === profileId &&
                        webhook.trigger_on === trigger) {
                        webhookData.webhookId = webhook.id;
                        return true;
                    }
                }
                return false;
            },
            async create() {
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhookData = this.getWorkflowStaticData('node');
                const profileId = this.getNodeParameter('profileId');
                const event = this.getNodeParameter('event');
                const trigger = getTriggerName(event);
                const body = {
                    name: 'n8n Webhook',
                    trigger_on: trigger,
                    delivery: {
                        version: '2.0.0',
                        url: webhookUrl,
                    },
                };
                const webhook = await wiseApiRequest.call(this, 'POST', `v3/profiles/${profileId}/subscriptions`, body);
                webhookData.webhookId = webhook.id;
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                const profileId = this.getNodeParameter('profileId');
                try {
                    await wiseApiRequest.call(this, 'DELETE', `v3/profiles/${profileId}/subscriptions/${webhookData.webhookId}`);
                }
                catch (error) {
                    return false;
                }
                delete webhookData.webhookId;
                return true;
            },
        },
    };
    async webhook() {
        const req = this.getRequestObject();
        const headers = this.getHeaderData();
        const credentials = await this.getCredentials('wiseApi');
        if (headers['x-test-notification'] === 'true') {
            const res = this.getResponseObject();
            res.status(200).end();
            return {
                noWebhookResponse: true,
            };
        }
        const signature = headers['x-signature'];
        const publicKey = credentials.environment === 'test' ? testPublicKey : livePublicKey;
        const sig = createVerify('RSA-SHA1').update(req.rawBody);
        const verified = sig.verify(publicKey, signature, 'base64');
        if (!verified) {
            return {};
        }
        return {
            workflowData: [this.helpers.returnJsonArray(req.body)],
        };
    }
}
//# sourceMappingURL=WiseTrigger.node.js.map