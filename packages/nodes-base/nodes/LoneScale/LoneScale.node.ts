import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { lonescaleApiRequest } from './GenericFunctions';

export class LoneScale implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LoneScale',
		name: 'loneScale',
		group: ['transform'],
		icon: { light: 'file:loneScale.svg', dark: 'file:loneScale.dark.svg' },
		version: 1,
		description: 'Create List, add / delete items',
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		defaults: {
			name: 'LoneScale',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'loneScaleApi',
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
						name: 'List',
						value: 'list',
						description: 'Manipulate list',
					},
					{
						name: 'Item',
						value: 'item',
						description: 'Manipulate item',
					},
				],
				default: 'list',
				noDataExpression: true,
				required: true,
				description: 'Create a new list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['list'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a list',
						action: 'Create a list',
					},
				],
				default: 'create',
				noDataExpression: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'add',
						description: 'Create an item',
						action: 'Create a item',
					},
				],
				default: 'add',
				noDataExpression: true,
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				options: [
					{
						name: 'Company',
						value: 'COMPANY',
						description: 'List of company',
					},
					{
						name: 'Contact',
						value: 'PEOPLE',
						description: 'List of contact',
					},
				],
				default: 'PEOPLE',
				description: 'Type of your list',
				noDataExpression: true,
			},
			{
				displayName: 'List Name or ID',
				name: 'list',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getLists',
					loadOptionsDependsOn: ['type'],
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				required: true,
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['PEOPLE'],
					},
				},
				default: '',
				description: 'Contact first name',
				required: true,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['PEOPLE'],
					},
				},
				default: '',
				description: 'Contact last name',
				required: true,
			},

			{
				displayName: 'Company Name',
				name: 'company_name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['COMPANY'],
					},
				},
				default: '',
				description: 'Contact company name',
			},

			{
				displayName: 'Additional Fields',
				name: 'peopleAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['PEOPLE'],
					},
				},
				options: [
					{
						displayName: 'Full Name',
						name: 'full_name',
						type: 'string',
						default: '',
						description: 'Contact full name',
					},
					{
						displayName: 'Contact Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{
						displayName: 'Company Name',
						name: 'company_name',
						type: 'string',
						default: '',
						description: 'Contact company name',
					},
					{
						displayName: 'Current Position',
						name: 'current_position',
						type: 'string',
						default: '',
						description: 'Contact current position',
					},
					{
						displayName: 'Company Domain',
						name: 'domain',
						type: 'string',
						default: '',
						description: 'Contact company domain',
					},
					{
						displayName: 'Linkedin Url',
						name: 'linkedin_url',
						type: 'string',
						default: '',
						description: 'Contact Linkedin URL',
					},
					{
						displayName: 'Contact Location',
						name: 'location',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Contact ID',
						name: 'contact_id',
						type: 'string',
						default: '',
						description: 'Contact ID from your source',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'companyAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['add'],
						resource: ['item'],
						type: ['COMPANY'],
					},
				},
				options: [
					{
						displayName: 'Linkedin Url',
						name: 'linkedin_url',
						type: 'string',
						default: '',
						description: 'Company Linkedin URL',
					},
					{
						displayName: 'Company Domain',
						name: 'domain',
						type: 'string',
						default: '',
						description: 'Company company domain',
					},
					{
						displayName: 'Contact Location',
						name: 'location',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Contact ID',
						name: 'contact_id',
						type: 'string',
						default: '',
						description: 'Contact ID from your source',
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['list'],
					},
				},
				default: '',
				placeholder: 'list name',
				description: 'Name of your list',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['list'],
					},
				},
				options: [
					{
						name: 'Company',
						value: 'COMPANY',
						description: 'Create a list of companies',
						action: 'Create a list of companies',
					},
					{
						name: 'Contact',
						value: 'PEOPLE',
						description: 'Create a list of contacts',
						action: 'Create a list of contacts',
					},
				],
				default: 'COMPANY',
				description: 'Type of your list',
				noDataExpression: true,
			},
		],
	};

	methods = {
		loadOptions: {
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const type = this.getNodeParameter('type') as string;
				const data = await lonescaleApiRequest.call(this, 'GET', '/lists', {}, { entity: type });
				return (data as { list: Array<{ name: string; id: string; entity: string }> })?.list
					?.filter((l) => l.entity === type)
					.map((d) => ({
						name: d.name,
						value: d.id,
					}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		const returnData = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'list') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const entity = this.getNodeParameter('type', i) as string;
						const body: IDataObject = {
							name,
							entity,
						};

						responseData = await lonescaleApiRequest.call(this, 'POST', '/lists', body);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
				if (resource === 'item') {
					if (operation === 'add') {
						let firstName = '';
						let lastName = '';
						let currentPosition = '';
						let fullName = '';
						let email = '';
						let linkedinUrl = '';
						let companyName = '';
						let domain = '';
						let location = '';
						let contactId = '';

						const entity = this.getNodeParameter('type', i) as string;
						const listId = this.getNodeParameter('list', i) as string;
						if (entity === 'PEOPLE') {
							const peopleAdditionalFields = this.getNodeParameter('peopleAdditionalFields', i) as {
								email: string;
								full_name: string;
								current_position: string;
								linkedin_url: string;
								company_name: string;
								domain: string;
								location: string;
								contact_id: string;
							};
							firstName = this.getNodeParameter('first_name', i) as string;
							lastName = this.getNodeParameter('last_name', i) as string;
							fullName = peopleAdditionalFields?.full_name;
							currentPosition = peopleAdditionalFields?.current_position;
							email = peopleAdditionalFields?.email;
							linkedinUrl = peopleAdditionalFields?.linkedin_url;
							companyName = peopleAdditionalFields?.company_name;
							domain = peopleAdditionalFields?.domain;
							location = peopleAdditionalFields?.location;
							contactId = peopleAdditionalFields?.contact_id;
						}
						if (entity === 'COMPANY') {
							const companyAdditionalFields = this.getNodeParameter(
								'companyAdditionalFields',
								i,
							) as {
								linkedin_url: string;
								domain: string;
								location: string;
								contact_id: string;
							};
							companyName = this.getNodeParameter('company_name', i) as string;
							linkedinUrl = companyAdditionalFields?.linkedin_url;
							domain = companyAdditionalFields?.domain;
							location = companyAdditionalFields?.location;
							contactId = companyAdditionalFields?.contact_id;
						}

						const body: IDataObject = {
							...(firstName && { first_name: firstName }),
							...(lastName && { last_name: lastName }),
							...(fullName && { full_name: fullName }),
							...(linkedinUrl && { linkedin_url: linkedinUrl }),
							...(companyName && { company_name: companyName }),
							...(currentPosition && { current_position: currentPosition }),
							...(domain && { domain }),
							...(location && { location }),
							...(email && { email }),
							...(contactId && { contact_id: contactId }),
						};

						responseData = await lonescaleApiRequest.call(
							this,
							'POST',
							`/lists/${listId}/item`,
							body,
						);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
