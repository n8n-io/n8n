import {
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { squarespaceApiPagination } from './GenericFunctions';
import { inventoryFields, inventoryOperations } from './description/InventoryDescription';
import { productFields, productOperations } from './description/ProductDescription';
import { profileFields, profileOperations } from './description/ProfileDescription';
import { transactionFields, transactionOperations } from './description/TransactionDescription';
import { orderFields, orderOperations } from './description/OrderDescription';

const resource: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Inventory',
			value: 'inventory',
		},
		{
			name: 'Order',
			value: 'order',
		},
		{
			name: 'Product',
			value: 'product',
		},
		{
			name: 'Profile',
			value: 'profile',
		},
		{
			name: 'Transaction',
			value: 'transaction',
		},
	],
	default: '',
	required: true,
};

export class Squarespace implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Squarespace',
		name: 'squarespace',
		icon: 'file:squarespace.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Squarespace API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Squarespace',
			color: '#222222',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'squarespaceApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.squarespace.com/1.0',
			// baseURL: 'https://webhook.site/15f27177-6959-417b-a22e-da6a924a6b72',
			// headers currently not working with credentials
			// headers: {
			// 	"User-Agent": "n8n",
			// 	"Content-Type": "application/json"
			// },
		},
		requestOperations: {
			pagination: squarespaceApiPagination
		},
		properties: [
			resource,
			...inventoryOperations,
			...inventoryFields,
			...orderOperations,
			...orderFields,
			...productOperations,
			...productFields,
			...profileOperations,
			...profileFields,
			...transactionOperations,
			...transactionFields,
		],
	};
}
