/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { IncludeMods, SetNodeOptions } from './helpers/interfaces';
import { INCLUDE } from './helpers/interfaces';

import * as raw from './raw.mode';
import * as manual from './manual.mode';

type Mode = 'manual' | 'raw';

const versionDescription: INodeTypeDescription = {
	displayName: 'Add or Edit Fields (Set)',
	name: 'set',
	icon: 'fa:pen',
	group: ['input'],
	version: 3,
	description: 'Change the structure of your items',
	subtitle: '={{$parameter["mode"]}}',
	defaults: {
		name: 'Add or Edit Fields',
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
			displayName: 'Include',
			name: 'include',
			type: 'options',
			description: 'How to select the fields you want to include in your items',
			default: 'all',
			options: [
				{
					name: 'Other Input Fields Too',
					value: INCLUDE.ALL,
					description: 'Also include all the fields available in the input',
				},
				{
					name: 'No Other Input Fields',
					value: INCLUDE.NONE,
					description: 'Include only the specified fields',
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
					default: false,
					description: 'Whether binary data should be included if present in the input item',
				},
				{
					displayName: 'Ignore Type Conversion Errors',
					name: 'ignoreConversionErrors',
					type: 'boolean',
					default: false,
					description: 'Whether to ignore field type errors',
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as Mode;
		const duplicateItem = this.getNodeParameter('duplicateItem', 0, false) as boolean;

		const setNode = { raw, manual };

		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const include = this.getNodeParameter('include', i) as IncludeMods;
			const options = this.getNodeParameter('options', i, {});

			options.include = include;

			// const newItem = await setNode[mode].execute.call(this, items, i, options as SetNodeOptions);

			let newItem;
			switch (mode) {
				case 'manual':
					newItem = await setNode[mode].execute.call(this, items[i], i, options as SetNodeOptions);
					break;
				case 'raw':
					const node = this.getNode();
					let rawData: string | undefined = node.parameters.jsonOutput as string;

					if (!rawData.startsWith('=')) {
						rawData = undefined;
					} else {
						rawData = rawData.replace(/^=+/, '');
					}

					newItem = await setNode[mode].execute.call(
						this,
						items[i],
						i,
						options as SetNodeOptions,
						rawData,
					);
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The mode "${mode as string}" is not known!`,
					);
			}

			if (duplicateItem && this.getMode() === 'manual') {
				const duplicateCount = this.getNodeParameter('duplicateCount', 0, 0) as number;
				for (let j = 0; j <= duplicateCount; j++) {
					returnData.push(newItem);
				}
			} else {
				returnData.push(newItem);
			}
		}

		return this.prepareOutputData(returnData);
	}
}
