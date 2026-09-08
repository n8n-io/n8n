import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { eventDisplay, eventNameField } from './descriptions/OnfleetWebhookDescription';
import { onfleetApiRequest } from './GenericFunctions';
import { verifySignature } from './OnfleetTriggerHelpers';
import { webhookMapping } from './WebhookMapping';
export class OnfleetTrigger {
    description = {
        displayName: 'Onfleet Trigger',
        name: 'onfleetTrigger',
        icon: 'file:Onfleet.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["triggerOn"]}}',
        description: 'Starts the workflow when Onfleet events occur',
        defaults: {
            name: 'Onfleet Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'onfleetApi',
                required: true,
                testedBy: 'onfleetApiTest',
            },
        ],
        webhooks: [
            {
                name: 'setup',
                httpMethod: 'GET',
                responseMode: 'onReceived',
                path: 'webhook',
            },
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'onReceived',
                path: 'webhook',
            },
        ],
        properties: [eventDisplay, eventNameField],
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookData = this.getWorkflowStaticData('node');
                const webhookUrl = this.getNodeWebhookUrl('default');
                // Webhook got created before so check if it still exists
                const endpoint = '/webhooks';
                const webhooks = await onfleetApiRequest.call(this, 'GET', endpoint);
                for (const webhook of webhooks) {
                    if (webhook.url === webhookUrl && webhook.trigger === event) {
                        webhookData.webhookId = webhook.id;
                        return true;
                    }
                }
                return false;
            },
            async create() {
                const { name = '' } = this.getNodeParameter('additionalFields');
                const triggerOn = this.getNodeParameter('triggerOn');
                const webhookData = this.getWorkflowStaticData('node');
                const webhookUrl = this.getNodeWebhookUrl('default');
                if (webhookUrl.includes('//localhost')) {
                    throw new NodeOperationError(this.getNode(), 'The Webhook can not work on "localhost". Please setup n8n on a custom domain.');
                }
                // Webhook name according to the field
                let newWebhookName = `n8n-webhook:${webhookUrl}`;
                if (name) {
                    newWebhookName = `n8n-webhook:${name}`;
                }
                const path = '/webhooks';
                const body = {
                    name: newWebhookName,
                    url: webhookUrl,
                    trigger: webhookMapping[triggerOn].key,
                };
                try {
                    const webhook = await onfleetApiRequest.call(this, 'POST', path, body);
                    if (webhook.id === undefined) {
                        throw new NodeApiError(this.getNode(), webhook, {
                            message: 'Onfleet webhook creation response did not contain the expected data',
                        });
                    }
                    webhookData.id = webhook.id;
                }
                catch (error) {
                    const { httpCode = '' } = error;
                    if (httpCode === '422') {
                        throw new NodeOperationError(this.getNode(), 'A webhook with the identical URL probably exists already. Please delete it manually in Onfleet!');
                    }
                    throw error;
                }
                return true;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                // Get the data of the already registered webhook
                const endpoint = `/webhooks/${webhookData.id}`;
                await onfleetApiRequest.call(this, 'DELETE', endpoint);
                return true;
            },
        },
    };
    /**
     * Triggered function when an Onfleet webhook is executed
     */
    async webhook() {
        const req = this.getRequestObject();
        if (this.getWebhookName() === 'setup') {
            /* -------------------------------------------------------------------------- */
            /*                             Validation request                             */
            /* -------------------------------------------------------------------------- */
            const res = this.getResponseObject();
            res.status(200).type('text/plain').send(req.query.check);
            return { noWebhookResponse: true };
        }
        const isSignatureValid = await verifySignature.call(this);
        if (!isSignatureValid) {
            const res = this.getResponseObject();
            res.status(401).send('Unauthorized').end();
            return { noWebhookResponse: true };
        }
        const returnData = this.getBodyData();
        return {
            workflowData: [this.helpers.returnJsonArray(returnData)],
        };
    }
}
//# sourceMappingURL=OnfleetTrigger.node.js.map