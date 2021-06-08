import {
    IHookFunctions,
    IWebhookFunctions,
} from 'n8n-core';

import {
    IDataObject,
    INodeType,
    INodeTypeDescription,
    IWebhookResponseData,
} from 'n8n-workflow';

import { formIOApiRequest, getFormFieldDetails } from './GenericFunctions';

// import {
//     snakeCase,
// } from 'change-case';




export class FormIOTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'FormIO Trigger',
        name: 'formIOTrigger',
        icon: 'file:autopilot.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["event"]}}',
        description: 'Handle form io events via webhooks',
        defaults: {
            name: 'FromIO Trigger',
            color: '#6ad7b9',
        },
        inputs: [],
        outputs: ['main'],
        credentials: [
            {
                name: 'formIOApi',
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
                displayName: 'Form ID',
                name: 'formId',
                type: 'string',
                required: true,
                default: '',
            },
            {
                displayName: 'Form.io endpoint',
                name: 'formIOEndpoint',
                type: 'string',
                required: true,
                default: '',
            }
        ]
    };
    // @ts-ignore
    webhookMethods = {
        default: {
            /**
             * Method has the logic to check is webhook is registered in Form.io
             * Registered webhook action is stored into webhook data
             * @param 
             */
            async checkExists(this: IHookFunctions): Promise<boolean> {
                const webhookData = this.getWorkflowStaticData('node');
                const webhookUrl = this.getNodeWebhookUrl('default');
                const webhooks = await formIOApiRequest.call(this, 'GET');
                for (let webhook of webhooks) {
                    if (webhook.settings) {
                        if (webhook.settings.url == webhookUrl) {
                            webhookData.webhookId = webhook._id;
                            console.log('***webhook exists');
                            return true;
                        }
                    }
                }
                return false;
            },

            /**
             * This method has the logic to register webhook in Form.io
             * @param 
             */
            async create(this: IHookFunctions): Promise<boolean> {
                const webhookData = this.getWorkflowStaticData('node');
                const webhook = await formIOApiRequest.call(this, 'POST');
                console.log('***webhook created', webhook._id);
                webhookData.webhookId = webhook._id;
                return true;
            },

            async delete(this: IHookFunctions): Promise<boolean> {
                const webhookData = this.getWorkflowStaticData('node');
                delete webhookData.webhookId;
                return true;
            },
        },
    };

    /**
     * Method has the logic to process response from the formio webhook
     * @param this 
     */
    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const req = this.getRequestObject();
        const formDetails = await getFormFieldDetails.call(this);
        const formData = req.body.request.data;
        const formInputFields = formDetails.components;
        const result = {
            formData,
            formInputFields
        }
        
        return {
            workflowData: [
                this.helpers.returnJsonArray(result)
            ]
        }
    }
}
