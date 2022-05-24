import {
    IExecuteFunctions,
} from 'n8n-core';

import {
	apiRequest,
} from './GenericFunctions';

import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import {messageFields, messageTypeFields} from "./MessagesDescription"
import {
    OptionsWithUri,
} from 'request';

export class WhatsApp implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'WhatsApp',
        name: 'whatsApp',
        icon: 'file:whatsapp.svg',
        group: ['transform'],
        version: 1,
        // subtitle: '={{ $parameter["resource"] + ": " + $parameter["type"] }}',
        subtitle: '',
        description: 'Access WhatsApp API',
        defaults: {
            name: 'WhatsApp',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
          {
            name: 'whatsAppApi',
            required: true,
          },
        ],
        properties: [
            {
			    displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Messages',
						value: 'messages',
					}
				],
				default: 'messages',
				description: 'The resource to operate on.',
			},
            ...messageFields,
            ...messageTypeFields
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
        const phoneNumberId = this.getNodeParameter('phoneNumberId', 0)
		const operation = this.getNodeParameter('type', 0) as string;


        let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;
		let returnAll = false;
		let responseData;
		// const type = this.getNodeParameter('type', 0) as string;

        // console.log(type)
        for (let i = 0; i < items.length; i++) {
            try {
                requestMethod = 'GET';
                endpoint = "";
                body = {};
                qs = {};

                if (resource === "messages") {
                    endpoint = `${phoneNumberId}/messages`;
                    body = { type: operation };

                    if (operation === "template") {
                        requestMethod = "POST"
                        const to = this.getNodeParameter('to', i) as string;
                        const name = this.getNodeParameter('name', i) as string;
                        const language = this.getNodeParameter('language', i) as string;

                        body = {...body, to, template: { name, language }}
                    }
                }

				responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

				if (returnAll === false && qs.limit) {
					responseData = responseData.splice(0, qs.limit);
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message });

                }
                throw error;
            }

        }

        return [this.helpers.returnJsonArray(returnData)]
    }

}