import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../utils/utilities';

import { prepareEntry, prepareItem } from './helpers/utils';
import type { SetField, SetNodeOptions } from './helpers/interfaces';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields to Set',
		name: 'fields',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		description: 'Edit existing fields or add new ones to modify the output data',
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		default: {},
		options: [
			{
				name: 'values',
				displayName: 'Values',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. fieldName',
						description:
							'Name of the field to set the value of. Supports dot-notation. Example: data.person[0].name.',
						requiresDataPath: 'single',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						description: 'The field value type',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{
								name: 'String',
								value: 'string',
							},
							{
								name: 'Number',
								value: 'number',
							},
							{
								name: 'Boolean',
								value: 'boolean',
							},
							{
								name: 'Array',
								value: 'array',
							},
							{
								name: 'Object',
								value: 'object',
							},
						],
						default: 'string',
					},
					{
						displayName: 'Value',
						name: 'string',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								type: ['string'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'number',
						type: 'number',
						default: 0,
						displayOptions: {
							show: {
								type: ['number'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'boolean',
						type: 'options',
						default: true,
						options: [
							{
								name: 'True',
								value: true,
							},
							{
								name: 'False',
								value: false,
							},
						],
						displayOptions: {
							show: {
								type: ['boolean'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'array',
						type: 'string',
						// default: '={{[]}}',
						default: '',
						placeholder: 'e.g. [ arrayItem1, arrayItem2, arrayItem3 ]',
						displayOptions: {
							show: {
								type: ['array'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'object',
						type: 'string',
						default: '{}',
						typeOptions: {
							editor: 'json',
							rows: 2,
						},
						displayOptions: {
							show: {
								type: ['object'],
							},
						},
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		mode: ['manual'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	i: number,
	options: SetNodeOptions,
) {
	try {
		const fields = this.getNodeParameter('fields.values', i, []) as SetField[];

		const newData: IDataObject = {};
		const node = this.getNode();

		for (const entry of fields) {
			const { name, value } = prepareEntry(entry, node, i, options.ignoreConversionErrors);
			newData[name] = value;
		}

		return prepareItem.call(this, i, items[i], newData, options);
	} catch (error) {
		if (this.continueOnFail()) {
			return { json: { error: error.message } };
		}
		throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
	}
}
