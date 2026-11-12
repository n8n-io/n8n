import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	{
		displayName: 'Tag Name',
		name: 'tagName',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the tag to get or create. Tag names are case sensitive.',
	},
	{
		displayName: 'Options',
		name: 'tagOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				// The board ID string is the value; "Name or ID" suffix per lint.
				displayName: 'Private Board Name or ID',
				name: 'boardId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getBoardList' },
				default: '',
				description:
					'Only needed for tags on private or shareable boards; leave unset for public-board tags. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['column'],
		operation: ['createOrGetTag'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const tagName = this.getNodeParameter('tagName', itemIndex) as string;
	const tagOptions = this.getNodeParameter('tagOptions', itemIndex, {}) as IDataObject;
	const data = await client.execute(
		`mutation ($tagName: String, $boardId: ID) {
			create_or_get_tag(tag_name: $tagName, board_id: $boardId) {
				id
				name
				color
			}
		}`,
		itemIndex,
		{ tagName, boardId: (tagOptions.boardId as string) || null },
	);
	return (data.create_or_get_tag ?? {}) as IDataObject;
}
