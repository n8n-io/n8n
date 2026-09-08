import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	INodeTypeBaseDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { removeDuplicateInputItems } from '../utils';

const versionDescription: INodeTypeDescription = {
	displayName: 'Remove Duplicates',
	name: 'removeDuplicates',
	icon: 'node:remove-duplicates',
	iconColor: 'azure',
	group: ['transform'],
	subtitle: '',
	version: [1, 1.1],
	description: 'Delete items with matching field values',
	defaults: {
		name: 'Remove Duplicates',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [
		{
			displayName: 'Compare',
			name: 'compare',
			type: 'options',
			options: [
				{
					name: 'All fields',
					value: 'allFields',
				},
				{
					name: 'All fields except',
					value: 'allFieldsExcept',
				},
				{
					name: 'Selected fields',
					value: 'selectedFields',
				},
			],
			default: 'allFields',
			description: 'The fields of the input items to compare to see if they are the same',
		},
		{
			displayName: 'Fields to exclude',
			name: 'fieldsToExclude',
			type: 'string',
			placeholder: 'e.g. email, name',
			requiresDataPath: 'multiple',
			description: 'Fields in the input to exclude from the comparison',
			default: '',
			displayOptions: {
				show: {
					compare: ['allFieldsExcept'],
				},
			},
		},
		{
			displayName: 'Fields to compare',
			name: 'fieldsToCompare',
			type: 'string',
			placeholder: 'e.g. email, name',
			requiresDataPath: 'multiple',
			description: 'Fields in the input to add to the comparison',
			default: '',
			displayOptions: {
				show: {
					compare: ['selectedFields'],
				},
			},
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			displayOptions: {
				show: {
					compare: ['allFieldsExcept', 'selectedFields'],
				},
			},
			options: [
				{
					displayName: 'Disable dot notation',
					name: 'disableDotNotation',
					type: 'boolean',
					default: false,
					description:
						'Whether to disallow referencing child fields using `parent.child` in the field name',
				},
				{
					displayName: 'Remove other fields',
					name: 'removeOtherFields',
					type: 'boolean',
					default: false,
					description:
						'Whether to remove any fields that are not being compared. If disabled, will keep the values from the first of the duplicates.',
				},
			],
		},
	],
};
export class RemoveDuplicatesV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return removeDuplicateInputItems(this, items);
	}
}
