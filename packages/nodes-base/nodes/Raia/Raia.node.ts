import axios from 'axios';
import type { ITriggerFunctions, ITriggerResponse , INodeType, INodeTypeDescription} from 'n8n-workflow';
import { ApplicationError, NodeApiError } from 'n8n-workflow';


export class Raia implements INodeType {

    description: INodeTypeDescription = {
        properties: [
            {
                displayName: 'Conversation Type',
                name: 'conversationType',
                type: 'options',
                options: [
                    { name: 'Raia Managed', value: 'raiaManaged' },
                    { name: 'Customer Managed', value: 'customerManaged' },
                    { name: 'One-Off AI Message', value: 'oneOffMessage' },
                ],
                default: 'raiaManaged',
            },
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
																typeOptions: { password: true },
                default: '',
                description: 'Your Raia API Key',
            },
        ],
        version: 0,
        inputs: ['main'],
        outputs: ['main'],
        defaults: {
            name: 'Raia',

        },
				icon: 'file:raia.svg',
        displayName: 'Raia',
        name: 'raia',
        group: ['trigger'],
        description: 'Raia Chat Agency'
    };

    defaults = { name: 'Raia' };

    inputs = ['main'];

    outputs = ['main'];

		credentials = [
			{
					name: 'raiaApi',
					required: true,
			},
	];

    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse | undefined> {
        const conversationType = this.getNodeParameter('conversationType', 0) as string;
        const credentials = await this.getCredentials('raiaApi');

        try {
            let response;

            if (conversationType === 'raiaManaged') {
                response = await axios.post(
                    'https://api.raia.com/external/conversations/start',
                    { /* payload */ }
                );
            } else if (conversationType === 'customerManaged') {
                // Add logic for customer-managed conversation
                response = { data: { message: 'Customer-managed logic not implemented' } }; // Placeholder response
            } else if (conversationType === 'oneOffMessage') {
                response = await axios.post(
                    'https://api.raia.com/external/prompts',
                    { /* prompt payload */ }
                );
            } else {
                throw new ApplicationError('Invalid conversation type')
            }

            if (!response) {
                throw new ApplicationError('No response received from API')
            }
            return {
                manualTriggerFunction: async () => {
                    // Handle the response internally
                    console.log(response.data);
                },
            };
        } catch (error) {
            throw new NodeApiError(this.getNode(), error);
        }
    }
}
