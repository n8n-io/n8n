/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { attributeFields, attributeOperations } from './AttributeDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { emailFields, emailOperations } from './EmailDescription';
import { senderFields, senderOperations } from './SenderDescrition';

export class SendInBlue implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SendInBlue',
		name: 'sendInBlue',
		icon: 'file:sendinblue.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Sendinblue API',
		defaults: {
			name: 'SendInBlue',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sendInBlueApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.sendinblue.com',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Contact Attribute',
						value: 'attribute',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Sender',
						value: 'sender',
					},
				],
				default: 'email',
			},

			...attributeOperations,
			...attributeFields,
			...senderOperations,
			...senderFields,
			...contactOperations,
			...contactFields,
			...emailOperations,
			...emailFields,
		],
	};
}
