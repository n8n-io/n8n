import {
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { productFields, productOperations } from './description/ProductDescription';


const resource: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Product',
			value: 'product',
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
			baseURL: 'https://api.squarespace.com/1.0/commerce',
			// headers currently not working with credentials
			// headers: {
			// 	"User-Agent": "n8n",
			// 	"Content-Type": "application/json"
			// },
		},
		properties: [
			resource,
			...productOperations,
			...productFields,
		],
	};
}
