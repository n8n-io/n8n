import type {
	AssignmentCollectionValue,
	FieldType,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeProperties,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { SetField, SetNodeOptions } from './helpers/interfaces';
import {
	parseJsonParameter,
	validateEntry,
	composeReturnItem,
	resolveRawData,
	prepareReturnItem,
} from './helpers/utils';
import { updateDisplayOptions } from '../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields to Set',
		name: 'fields',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		description: 'Edit existing fields or add new ones to modify the output data',
		displayOptions: {
			show: {
				'@version': [3, 3.1, 3.2],
			},
		},
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
						validateType: 'string',
						ignoreValidationDuringExecution: true,
					},
					{
						displayName: 'Value',
						name: 'numberValue',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								type: ['numberValue'],
							},
						},
						validateType: 'number',
						ignoreValidationDuringExecution: true,
					},
					{
						displayName: 'Value',
						name: 'booleanValue',
						type: 'options',
						default: 'true',
						options: [
							{
								name: 'True',
								value: 'true',
							},
							{
								name: 'False',
								value: 'false',
							},
						],
						displayOptions: {
							show: {
								type: ['booleanValue'],
							},
						},
						validateType: 'boolean',
						ignoreValidationDuringExecution: true,
					},
					{
						displayName: 'Value',
						name: 'arrayValue',
						type: 'string',
						default: '',
						placeholder: 'e.g. [ arrayItem1, arrayItem2, arrayItem3 ]',
						displayOptions: {
							show: {
								type: ['arrayValue'],
							},
						},
						validateType: 'array',
						ignoreValidationDuringExecution: true,
					},
					{
						displayName: 'Value',
						name: 'objectValue',
						type: 'json',
						default: '={}',
						typeOptions: {
							rows: 2,
						},
						displayOptions: {
							show: {
								type: ['objectValue'],
							},
						},
						validateType: 'object',
						ignoreValidationDuringExecution: true,
					},
				],
			},
		],
	},
	{
		displayName: 'Fields to Set',
		name: 'assignments',
		type: 'assignmentCollection',
		displayOptions: {
			hide: {
				'@version': [3, 3.1, 3.2],
			},
		},
		default: {},
	},
];

const displayOptions = {
	show: {
		mode: ['manual'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions | ISupplyDataFunctions,
	item: INodeExecutionData,
	i: number,
	options: SetNodeOptions,
	rawFieldsData: IDataObject,
	node: INode,
) {
	try {
		if (node.typeVersion < 3.3) {
			const fields = this.getNodeParameter('fields.values', i, []) as SetField[];

			const newData: IDataObject = {};

			for (const entry of fields) {
				if (
					entry.type === 'objectValue' &&
					rawFieldsData[entry.name] !== undefined &&
					entry.objectValue !== undefined &&
					entry.objectValue !== null
				) {
					entry.objectValue = parseJsonParameter(
						resolveRawData.call(this, rawFieldsData[entry.name] as string, i),
						node,
						i,
						entry.name,
					);
				}

				const { name, value } = validateEntry(
					entry.name,
					entry.type.replace('Value', '') as FieldType,
					entry[entry.type],
					node,
					i,
					options.ignoreConversionErrors,
					node.typeVersion,
				);
				newData[name] = value;
			}

			return composeReturnItem.call(this, i, item, newData, options, node.typeVersion);
		}

		const assignmentCollection = this.getNodeParameter(
			'assignments',
			i,
		) as AssignmentCollectionValue;

		return prepareReturnItem(this, assignmentCollection, i, item, node, options);
	} catch (error) {
		if (this.continueOnFail()) {
			return { json: { error: (error as Error).message, pairedItem: { item: i } } };
		}
		throw new NodeOperationError(this.getNode(), error as Error, {
			itemIndex: i,
			description: error.description,
		});
	}
}
