import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../utils/utilities';

import type { SetField } from './utils';
import { prepareEntry, prepareItem } from './utils';

import set from 'lodash.set';

type ManualModeOptions = {
	dotNotation?: boolean;
	ignoreConversionErrors?: boolean;
};

const properties: INodeProperties[] = [
	{
		displayName: 'Fields to Edit or Add',
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
	{
		displayName: 'Include Other Input Fields Too',
		name: 'includeOtherFields',
		type: 'boolean',
		default: true,
		description: 'Whether to include all input fields along with added or edited fields',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Dot Notation',
				name: 'dotNotation',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }. If that is not intended this can be deactivated, it will then set { "a.b": value } instead.',
			},
			{
				displayName: 'Ignore Type Conversion Errors',
				name: 'ignoreConversionErrors',
				type: 'boolean',
				default: false,
				description: "Whether to ignore field type errors. Affected values will be set to 'null'.",
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
	includeOtherFields: boolean,
) {
	try {
		const { dotNotation, ignoreConversionErrors } = this.getNodeParameter(
			'options',
			i,
			{},
		) as ManualModeOptions;
		const fields = this.getNodeParameter('fields.values', i, []) as SetField[];

		const setData: IDataObject = {};
		const node = this.getNode();

		if (dotNotation === false) {
			for (const entry of fields) {
				const { name, value } = prepareEntry(entry, node, i, ignoreConversionErrors);
				setData[name] = value;
			}
		} else {
			for (const entry of fields) {
				const { name, value } = prepareEntry(entry, node, i, ignoreConversionErrors);
				set(setData, name, value);
			}
		}

		return prepareItem(items[i], setData, includeOtherFields, dotNotation);
	} catch (error) {
		if (this.continueOnFail()) {
			return { json: { error: error.message } };
		}
		throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
	}
}
