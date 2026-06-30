import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as company from './actions/company';
import * as contact from './actions/contact';
import * as item from './actions/item';
import * as list from './actions/list';
import {
	companyFields,
	companyOperations,
	contactFields,
	contactOperations,
	itemFields,
	itemOperations,
	listFields,
	listOperations,
} from './descriptions';
import { lonescaleApiRequest } from './GenericFunctions';
import type { ListsResponse } from './types';

export class LoneScale implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LoneScale',
		name: 'loneScale',
		group: ['transform'],
		icon: { light: 'file:loneScale.svg', dark: 'file:loneScale.dark.svg' },
		version: 1,
		description: 'Enrich and source contacts, search companies, and manage lists',
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
						name: 'Company',
						value: 'company',
						description: 'Search for a company',
					},
					{
						name: 'Contact',
						value: 'contact',
						description: 'Enrich or source contacts',
					},
					{
						name: 'Item',
						value: 'item',
						description: 'Manipulate item',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Manipulate list',
					},
				],
				default: 'list',
				noDataExpression: true,
				required: true,
				description: 'Create a new list',
			},
			...listOperations,
			...listFields,
			...itemOperations,
			...itemFields,
			...contactOperations,
			...contactFields,
			...companyOperations,
			...companyFields,
		],
	};

	methods = {
		loadOptions: {
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const type = this.getNodeParameter('type') as string;
				const data: ListsResponse = await lonescaleApiRequest.call(
					this,
					'GET',
					'/lists',
					{},
					{ entity: type },
				);
				return (data.list ?? [])
					.filter((l) => l.entity === type)
					.map((d) => ({
						name: d.name,
						value: d.id,
					}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				let executionData: INodeExecutionData[] = [];

				if (resource === 'list' && operation === 'create') {
					executionData = await list.create.call(this, i);
				} else if (resource === 'item' && operation === 'add') {
					executionData = await item.add.call(this, i);
				} else if (resource === 'contact' && operation === 'enrich') {
					executionData = await contact.enrich.call(this, i);
				} else if (resource === 'contact' && operation === 'source') {
					executionData = await contact.source.call(this, i);
				} else if (resource === 'company' && operation === 'search') {
					executionData = await company.search.call(this, i);
				}

				returnData.push(...executionData);
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
