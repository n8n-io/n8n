import { NodeConnectionTypes, } from 'n8n-workflow';
import { downloadAttachments, formatSubmission, koBoToolboxApiRequest, loadForms, parseStringList, } from './GenericFunctions';
import { options } from './Options';
export class KoBoToolboxTrigger {
    description = {
        displayName: 'KoBoToolbox Trigger',
        name: 'koBoToolboxTrigger',
        icon: 'file:koBoToolbox.svg',
        group: ['trigger'],
        version: 1,
        description: 'Process KoBoToolbox submissions',
        defaults: {
            name: 'KoBoToolbox Trigger',
        },
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'koBoToolboxApi',
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
                displayName: 'Form Name or ID',
                name: 'formId',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'loadForms',
                },
                required: true,
                default: '',
                description: 'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
            },
            {
                displayName: 'Trigger On',
                name: 'triggerOn',
                type: 'options',
                required: true,
                default: 'formSubmission',
                options: [
                    {
                        name: 'On Form Submission',
                        value: 'formSubmission',
                    },
                ],
            },
            { ...options },
        ],
    };
    webhookMethods = {
        default: {
            async checkExists() {
                const webhookData = this.getWorkflowStaticData('node');
                const webhookUrl = this.getNodeWebhookUrl('default');
                const formId = this.getNodeParameter('formId');
                const webhooks = await koBoToolboxApiRequest.call(this, {
                    url: `/api/v2/assets/${formId}/hooks/`,
                });
                for (const webhook of webhooks || []) {
                    if (webhook.endpoint === webhookUrl && webhook.active === true) {
                        webhookData.webhookId = webhook.uid;
                        return true;
                    }
                }
                return false;
            },
            async create() {
                const webhookData = this.getWorkflowStaticData('node');
                const webhookUrl = this.getNodeWebhookUrl('default');
                const workflow = this.getWorkflow();
                const formId = this.getNodeParameter('formId');
                const response = await koBoToolboxApiRequest.call(this, {
                    method: 'POST',
                    url: `/api/v2/assets/${formId}/hooks/`,
                    body: {
                        name: `n8n webhook id ${workflow.id}: ${workflow.name}`,
                        endpoint: webhookUrl,
                        email_notification: true,
                    },
                });
                if (response.uid) {
                    webhookData.webhookId = response.uid;
                    return true;
                }
                return false;
            },
            async delete() {
                const webhookData = this.getWorkflowStaticData('node');
                const formId = this.getNodeParameter('formId');
                try {
                    await koBoToolboxApiRequest.call(this, {
                        method: 'DELETE',
                        url: `/api/v2/assets/${formId}/hooks/${webhookData.webhookId}`,
                    });
                }
                catch (error) {
                    return false;
                }
                delete webhookData.webhookId;
                return true;
            },
        },
    };
    methods = {
        loadOptions: {
            loadForms,
        },
    };
    async webhook() {
        const req = this.getRequestObject();
        const formatOptions = this.getNodeParameter('formatOptions');
        const responseData = formatOptions.reformat
            ? formatSubmission(req.body, parseStringList(formatOptions.selectMask), parseStringList(formatOptions.numberMask))
            : req.body;
        if (formatOptions.download) {
            // Download related attachments
            return {
                workflowData: [
                    [await downloadAttachments.call(this, responseData, formatOptions)],
                ],
            };
        }
        else {
            return {
                workflowData: [this.helpers.returnJsonArray([responseData])],
            };
        }
    }
}
//# sourceMappingURL=KoBoToolboxTrigger.node.js.map