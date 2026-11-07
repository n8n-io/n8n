import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { groupResourceLocator } from '../../helpers/groupLocator';
import { findEdgeGroupId } from '../../helpers/groupPosition';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { GROUP_POSITION_OPTIONS, positionRelativeToGroupField } from '../common.description';

const properties: INodeProperties[] = [
	boardResourceLocator,
	groupResourceLocator,
	{
		displayName: 'Options',
		name: 'duplicateGroupOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Group Title',
				name: 'groupTitle',
				type: 'string',
				default: '',
				description: 'The title of the new group; left unset, monday derives one from the original',
			},
			{
				displayName: 'Position',
				name: 'groupPosition',
				type: 'options',
				options: GROUP_POSITION_OPTIONS,
				default: 'top',
				description:
					'Where to place the duplicated group on the board; left unset, monday puts it right below the original group. Placements other than "At Top" cost one extra repositioning call.',
			},
			positionRelativeToGroupField(
				'The existing group the duplicate is placed before or after (used with Position "After Group" / "Before Group").',
			),
		],
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['duplicateGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const groupId = this.getNodeParameter('groupId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const options = this.getNodeParameter('duplicateGroupOptions', itemIndex, {}) as IDataObject;
	const position = (options.groupPosition as string) || '';
	const anchorGroupId = (options.positionGroupId as string) || '';
	if ((position === 'after' || position === 'before') && !anchorGroupId) {
		throw new NodeOperationError(
			this.getNode(),
			'Select the group the duplicate should be placed before or after (Position: Relative To Group)',
			{ itemIndex },
		);
	}
	const data = await client.execute(
		`mutation ($boardId: ID!, $groupId: String!, $addToTop: Boolean, $groupTitle: String) {
			duplicate_group(
				board_id: $boardId,
				group_id: $groupId,
				add_to_top: $addToTop,
				group_title: $groupTitle
			) {
				id
				title
				color
				position
				archived
			}
		}`,
		itemIndex,
		{
			boardId,
			groupId,
			// duplicate_group has no relative positioning; only "top" maps to an
			// argument. The other placements reposition with update_group below.
			addToTop: position === 'top' ? true : null,
			groupTitle: (options.groupTitle as string) || null,
		},
	);
	let group = (data.duplicate_group ?? {}) as IDataObject;
	const newGroupId = group.id as string | undefined;

	if (newGroupId && (position === 'after' || position === 'before' || position === 'bottom')) {
		let anchor = anchorGroupId;
		if (position === 'bottom') {
			const groupsData = await client.execute(
				`query ($ids: [ID!]) {
					boards(ids: $ids) {
						groups { id position }
					}
				}`,
				itemIndex,
				{ ids: [boardId] },
			);
			const boards = (groupsData.boards ?? []) as Array<{
				groups?: Array<{ id: string; position: string }>;
			}>;
			anchor = findEdgeGroupId(boards[0]?.groups ?? [], newGroupId, 'bottom') ?? '';
		}
		if (anchor) {
			const moved = await client.execute(
				`mutation ($boardId: ID!, $groupId: String!, $attribute: GroupAttributes!, $anchor: String!) {
					update_group(
						board_id: $boardId,
						group_id: $groupId,
						group_attribute: $attribute,
						new_value: $anchor
					) {
						id
						title
						color
						position
						archived
					}
				}`,
				itemIndex,
				{
					boardId,
					groupId: newGroupId,
					attribute: position === 'before' ? 'relative_position_before' : 'relative_position_after',
					anchor,
				},
			);
			group = { ...group, ...((moved.update_group ?? {}) as IDataObject) };
		}
	}

	return group;
}
