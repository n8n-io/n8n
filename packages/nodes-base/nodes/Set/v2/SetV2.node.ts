/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import type { IncludeMods, SetField, SetNodeOptions } from './helpers/interfaces';
import { INCLUDE } from './helpers/interfaces';

import * as raw from './raw.mode';
import * as manual from './manual.mode';

type Mode = 'manual' | 'raw';

const versionDescription: INodeTypeDescription = {
	displayName: 'Edit Fields (Set)',
	name: 'set',
	icon: 'fa:pen',
	group: ['input'],
	version: [3, 3.1],
	description: 'Change the structure of your items',
	subtitle: '={{$parameter["mode"]}}',
	defaults: {
		name: 'Edit Fields',
		color: '#0000FF',
	},
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Manual Mapping',
					value: 'manual',
					description: 'Edit item fields one by one',
					action: 'Edit item fields one by one',
				},
				{
					name: 'JSON Output',
					value: 'raw',
					description: 'Customize item output with JSON',
					action: 'Customize item output with JSON',
				},
			],
			default: 'manual',
		},
		{
			displayName: 'Duplicate Item',
			name: 'duplicateItem',
			type: 'boolean',
			default: false,
			isNodeSetting: true,
		},
		{
			displayName: 'Duplicate Item Count',
			name: 'duplicateCount',
			type: 'number',
			default: 0,
			typeOptions: {
				minValue: 0,
			},
			description:
				'How many times the item should be duplicated, mainly used for testing and debugging',
			isNodeSetting: true,
			displayOptions: {
				show: {
					duplicateItem: [true],
				},
			},
		},
		{
			displayName:
				'Item duplication is set in the node settings. This option will be ignored when the workflow runs automatically.',
			name: 'duplicateWarning',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					duplicateItem: [true],
				},
			},
		},
		...raw.description,
		...manual.description,
		{
			displayName: 'Include in Output',
			name: 'include',
			type: 'options',
			description: 'How to select the fields you want to include in your output items',
			default: 'all',
			options: [
				{
					name: 'All Input Fields',
					value: INCLUDE.ALL,
					description: 'Also include all unchanged fields from the input',
				},
				{
					name: 'No Input Fields',
					value: INCLUDE.NONE,
					description: 'Include only the fields specified above',
				},
				{
					name: 'Selected Input Fields',
					value: INCLUDE.SELECTED,
					description: 'Also include the fields listed in the parameter “Fields to Include”',
				},
				{
					name: 'All Input Fields Except',
					value: INCLUDE.EXCEPT,
					description: 'Exclude the fields listed in the parameter “Fields to Exclude”',
				},
			],
		},
		{
			displayName: 'Fields to Include',
			name: 'includeFields',
			type: 'string',
			default: '',
			placeholder: 'e.g. fieldToInclude1,fieldToInclude2',
			description:
				'Comma-separated list of the field names you want to include in the output. You can drag the selected fields from the input panel.',
			requiresDataPath: 'multiple',
			displayOptions: {
				show: {
					include: ['selected'],
				},
			},
		},
		{
			displayName: 'Fields to Exclude',
			name: 'excludeFields',
			type: 'string',
			default: '',
			placeholder: 'e.g. fieldToExclude1,fieldToExclude2',
			description:
				'Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.',
			requiresDataPath: 'multiple',
			displayOptions: {
				show: {
					include: ['except'],
				},
			},
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			options: [
				{
					displayName: 'Include Binary Data',
					name: 'includeBinary',
					type: 'boolean',
					default: true,
					description: 'Whether binary data should be included if present in the input item',
				},
				{
					displayName: 'Ignore Type Conversion Errors',
					name: 'ignoreConversionErrors',
					type: 'boolean',
					default: false,
					description:
						'Whether to ignore field type errors and apply a less strict type conversion',
					displayOptions: {
						show: {
							'/mode': ['manual'],
						},
					},
				},
				{
					displayName: 'Support Dot Notation',
					name: 'dotNotation',
					type: 'boolean',
					default: true,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
					description:
						'By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }. If that is not intended this can be deactivated, it will then set { "a.b": value } instead.',
				},
			],
		},
	],
};

export class SetV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as Mode;
		const duplicateItem = this.getNodeParameter('duplicateItem', 0, false) as boolean;

		const setNode = { raw, manual };

		const returnData: INodeExecutionData[] = [];

		const rawData: IDataObject = {};

		if (mode === 'raw') {
			const jsonOutput = this.getNodeParameter('jsonOutput', 0, '', {
				rawExpressions: true,
			}) as string | undefined;

			if (jsonOutput?.startsWith('=')) {
				rawData.jsonOutput = jsonOutput.replace(/^=+/, '');
			}
		} else {
			const workflowFieldsJson = this.getNodeParameter('fields.values', 0, [], {
				rawExpressions: true,
			}) as SetField[];

			for (const entry of workflowFieldsJson) {
				if (entry.type === 'objectValue' && (entry.objectValue as string).startsWith('=')) {
					rawData[entry.name] = (entry.objectValue as string).replace(/^=+/, '');
				}
			}
		}

		for (let i = 0; i < items.length; i++) {
			const include = this.getNodeParameter('include', i) as IncludeMods;
			const options = this.getNodeParameter('options', i, {});
			const node = this.getNode();

			options.include = include;

			const newItem = await setNode[mode].execute.call(
				this,
				items[i],
				i,
				options as SetNodeOptions,
				rawData,
				node,
			);

			if (duplicateItem && this.getMode() === 'manual') {
				const duplicateCount = this.getNodeParameter('duplicateCount', 0, 0) as number;
				for (let j = 0; j <= duplicateCount; j++) {
					returnData.push(newItem);
				}
			} else {
				returnData.push(newItem);
			}
		}

		return [returnData];
	}
}
