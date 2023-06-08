/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as raw from './raw.mode';
import * as manual from './manual.mode';

type Mode = 'manual' | 'raw';

const versionDescription: INodeTypeDescription = {
	displayName: 'Add or Edit Fields',
	name: 'set',
	icon: 'fa:pen',
	group: ['input'],
	version: 3,
	description: 'Add or edit fields on an input item and optionally remove other fields',
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
					name: 'RAW Mapping',
					value: 'raw',
					description: 'Customize item output with JSON',
					action: 'Customize item output with JSON',
				},
			],
			default: 'manual',
		},
		{
			displayName: 'Duplicate Item',
			name: 'duplicate',
			type: 'number',
			default: 0,
			typeOptions: {
				minValue: 0,
			},
			description:
				'How many times the item should be duplicated, mainly used for testing and debugging',
			isNodeSetting: true,
		},
		{
			displayName:
				'Item duplication is set in the node settings. This option will be ignored when the workflow runs automatically.',
			name: 'duplicateWarning',
			type: 'notice',
			default: '',
			displayOptions: {
				hide: {
					duplicate: [0],
				},
			},
		},
		...raw.description,
		...manual.description,
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
		const duplicate = this.getNodeParameter('duplicate', 0) as number;

		const setNode = { raw, manual };

		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const includeOtherFields = this.getNodeParameter('includeOtherFields', i) as boolean;

			const newItem = await setNode[mode].execute.call(this, items, i, includeOtherFields);

			if (duplicate > 0 && this.getMode() === 'manual') {
				for (let j = 0; j <= duplicate; j++) {
					returnData.push(newItem);
				}
			} else {
				returnData.push(newItem);
			}
		}

		return this.prepareOutputData(returnData);
	}
}
