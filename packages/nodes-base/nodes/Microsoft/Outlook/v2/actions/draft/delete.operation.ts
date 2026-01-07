import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { draftRLC } from '../../descriptions';
import { executePermanentDelete } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	draftRLC,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Permanent Delete',
				name: 'permanentDelete',
				type: 'boolean',
				default: false,
				description:
					"Permanently delete a draft and place it in the purges folder at the user's mailbox.",
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['draft'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const draftId = this.getNodeParameter('draftId', index, undefined, {
		extractValue: true,
	}) as string;

	await executePermanentDelete.call(this, index, `/messages/${draftId}`);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
