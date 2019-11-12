import {
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	mailchimpApiRequest,
} from './GenericFunctions';

export class Mailchimp implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Mailchimp',
		name: 'mailchimp',
		icon: 'file:mailchimp.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mailchimp API',
		defaults: {
			name: 'Mailchimp',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailchimpApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Member',
						value: 'member',
						description: 'Add member to list',
					},
				],
				default: '',
				required: true,
				description: 'Resource to consume.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'member',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new member',
					},
				],
				default: '',
				description: 'The operation to perform.',
			},
		]
	};


	methods = {
		loadOptions: {
			// Get all the available projects to display them to user so that he can
			// select them easily
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let lists, response;
				try {
					response = await mailchimpApiRequest.call(this, '/lists', 'GET');
					lists = response.lists;
				} catch (err) {
					throw new Error(`Mailchimp Error: ${err}`);
				}
				for (const list of lists) {
					const listName = list.name;
					const listId = list.id;

					returnData.push({
						name: listName,
						value: listId,
					});
				}

				return returnData;
			},
		}
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {

		const resource = this.getNodeParameter('resource') as string;
		const opeation = this.getNodeParameter('operation') as string;

		return {
			json: {}
		};
	}
}
