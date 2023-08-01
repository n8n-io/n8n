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
								value: 'stringValue',
							},
							{
								name: 'Number',
								value: 'numberValue',
							},
							{
								name: 'Boolean',
								value: 'booleanValue',
							},
							{
								name: 'Array',
								value: 'arrayValue',
							},
							{
								name: 'Object',
								value: 'objectValue',
							},
						],
						default: 'stringValue',
					},
					{
						displayName: 'Value',
						name: 'stringValue',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								type: ['stringValue'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'numberValue',
						type: 'number',
						default: 0,
						displayOptions: {
							show: {
								type: ['numberValue'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'booleanValue',
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
								type: ['booleanValue'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'arrayValue',
						type: 'string',
						// default: '={{[]}}',
						default: '',
						placeholder: 'e.g. [ arrayItem1, arrayItem2, arrayItem3 ]',
						displayOptions: {
							show: {
								type: ['arrayValue'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'objectValue',
						type: 'string',
						default: '{}',
						typeOptions: {
							editor: 'json',
							editorLanguage: 'json',
							rows: 2,
						},
						displayOptions: {
							show: {
								type: ['objectValue'],
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
			return { json: { error: (error as Error).message } };
		}
		throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
	}
}
