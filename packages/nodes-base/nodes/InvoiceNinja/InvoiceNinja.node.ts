import type { IExecuteFunctions } from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { InvoiceNinjaV4 } from "./v4/InvoiceNinjaNode"

import { InvoiceNinjaV5 } from "./v5/InvoiceNinjaNode"

export class InvoiceNinja implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Invoice Ninja',
		name: 'invoiceNinja',
		icon: 'file:invoiceNinja.svg',
		group: ['output'],
		version: [1, 2],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Invoice Ninja API',
		defaults: {
			name: 'Invoice Ninja',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'invoiceNinjaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
				description: 'Invoice Ninja supports 2 Product Versions. Please read the docs to decide, which version is needed.',
				options: [
					{
						name: 'Version 4',
						value: 'v4',
					},
					{
						name: 'Version 5',
						value: 'v5',
					},
				],
				default: 'v4',
			},
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				description: 'Invoice Ninja supports 2 Product Versions. Please read the docs to decide, which version is needed.',
				options: [
					{
						name: 'Version 4',
						value: 'v4',
					},
					{
						name: 'Version 5',
						value: 'v5',
					},
				],
				default: 'v5',
			},
			// V4
			...InvoiceNinjaV4.description.properties,
			// V5
			...InvoiceNinjaV5.description.properties,
			// JSON
			{
				displayName: 'Additional JSON Body',
				description: 'You can provide additional properties in a JSON form. These parameters will be merged with the parameters above.<br /> <strong>Note:</strong> Do not provide an top level array.',
				name: 'jsonBody',
				type: 'json',
				default: '{}',
				required: false,
				displayOptions: {
					show: {
						apiVersion: ['v5'],
						operation: ['create', 'update'],
					},
				}
			},
		],
	};

	methods = {
		loadOptions: {
			...InvoiceNinjaV4.methods.loadOptions,
			...InvoiceNinjaV5.methods.loadOptions,
		},
	};

	
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

		if (apiVersion == 'v4') return InvoiceNinjaV4.execute(this);
		else if (apiVersion == 'v5') return InvoiceNinjaV5.execute(this);
		else throw new Error('Invalid Version Parameter');
	}
}
