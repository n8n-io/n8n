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

/**
 * The palette update_group accepts. Unlike create_group it takes color NAMES,
 * not hexes (a hex fails with "Input color is not in colors options" —
 * verified live 2026-07-15). The list is the documented 18 names; note
 * "turquoise" is the create palette's Light Blue (#66ccff), and create's
 * Mustard (#cab641) has no update name at all.
 */
const GROUP_UPDATE_COLOR_OPTIONS = [
	{ name: '⚪ Grey', value: 'grey', description: '#c4c4c4' },
	{ name: '⚫ Trolley Grey', value: 'trolley-grey', description: '#808080' },
	{ name: '🔴 Dark Pink', value: 'dark-pink', description: '#ff158a' },
	{ name: '🔴 Dark Red', value: 'dark-red', description: '#bb3354' },
	{ name: '🔴 Red', value: 'red', description: '#e2445c' },
	{ name: '🔵 Blue', value: 'blue', description: '#579bfc' },
	{ name: '🔵 Dark Blue', value: 'dark-blue', description: '#0086c0' },
	{ name: '🔵 Turquoise (Light Blue)', value: 'turquoise', description: '#66ccff' },
	{ name: '🟠 Dark Orange', value: 'dark-orange', description: '#ff642e' },
	{ name: '🟠 Orange', value: 'orange', description: '#fdab3d' },
	{ name: '🟡 Yellow', value: 'yellow', description: '#ffcb00' },
	{ name: '🟢 Dark Green', value: 'dark-green', description: '#037f4c' },
	{ name: '🟢 Green', value: 'green', description: '#00c875' },
	{ name: '🟢 Lime Green', value: 'lime-green', description: '#9cd326' },
	{ name: '🟣 Dark Purple', value: 'dark-purple', description: '#784bd1' },
	{ name: '🟣 Light Pink', value: 'light-pink', description: '#ff5ac4' },
	{ name: '🟣 Purple', value: 'purple', description: '#a25ddc' },
	{ name: '🟤 Brown', value: 'brown', description: '#7f5347' },
];

const properties: INodeProperties[] = [
	boardResourceLocator,
	groupResourceLocator,
	{
		displayName: 'Update Fields',
		name: 'updateGroupFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description:
			'The group attributes to change. Each field is applied as its own change in one request, in order (title, color, position) — if one fails, fields before it may already be applied.',
		options: [
			{
				displayName: 'Color',
				name: 'groupColor',
				type: 'options',
				options: GROUP_UPDATE_COLOR_OPTIONS,
				default: 'blue',
				description:
					'The new color of the group. The API accepts only this named palette here; the create palette’s Mustard has no update equivalent.',
			},
			{
				displayName: 'New Title',
				name: 'newTitle',
				type: 'string',
				default: '',
				description: 'The new title of the group',
			},
			{
				displayName: 'Position',
				name: 'groupPosition',
				type: 'options',
				options: GROUP_POSITION_OPTIONS,
				default: 'top',
				description:
					'Where to move the group on the board. "At Top" / "At Bottom" cost one extra read to find the current first/last group.',
			},
			positionRelativeToGroupField(
				'The existing group this group is moved before or after (used with Position "After Group" / "Before Group").',
			),
		],
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['updateGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Builds one aliased request applying each update_group attribute change in
 * order (update_group takes exactly one attribute per mutation). NOT atomic:
 * a failing alias doesn't roll back or stop the others (verified live) — the
 * UI description warns about this.
 */
export function buildUpdateGroupMutation(
	updates: Array<{ attribute: 'title' | 'color' | GroupRepositionAttribute; value: string }>,
): { query: string; variables: Record<string, string> } {
	const variables: Record<string, string> = {};
	const varDefs = ['$boardId: ID!', '$groupId: String!'];
	const aliases = updates.map((update, index) => {
		varDefs.push(`$value${index}: String!`);
		variables[`value${index}`] = update.value;
		return `u${index}: update_group(board_id: $boardId, group_id: $groupId, group_attribute: ${update.attribute}, new_value: $value${index}) { id title color position archived }`;
	});
	return {
		query: `mutation (${varDefs.join(', ')}) {\n${aliases.join('\n')}\n}`,
		variables,
	};
}

type GroupRepositionAttribute = 'relative_position_after' | 'relative_position_before';

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
	const fields = this.getNodeParameter('updateGroupFields', itemIndex, {}) as IDataObject;
	const newTitle = (fields.newTitle as string) || '';
	const groupColor = (fields.groupColor as string) || '';
	const position = (fields.groupPosition as string) || '';
	const anchorGroupId = (fields.positionGroupId as string) || '';

	if (!newTitle && !groupColor && !position) {
		throw new NodeOperationError(
			this.getNode(),
			'Set at least one field to update (New Title, Color, or Position)',
			{ itemIndex },
		);
	}
	if ((position === 'after' || position === 'before') && !anchorGroupId) {
		throw new NodeOperationError(
			this.getNode(),
			'Select the group this group should be moved before or after (Position: Relative To Group)',
			{ itemIndex },
		);
	}

	const updates: Parameters<typeof buildUpdateGroupMutation>[0] = [];
	if (newTitle) updates.push({ attribute: 'title', value: newTitle });
	if (groupColor) updates.push({ attribute: 'color', value: groupColor });
	if (position === 'after' || position === 'before') {
		updates.push({
			attribute: position === 'before' ? 'relative_position_before' : 'relative_position_after',
			value: anchorGroupId,
		});
	} else if (position === 'top' || position === 'bottom') {
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
		const anchor = findEdgeGroupId(boards[0]?.groups ?? [], groupId, position);
		// No anchor means this is the board's only group — it's already
		// at both edges, so there is nothing to move.
		if (anchor) {
			updates.push({
				attribute: position === 'top' ? 'relative_position_before' : 'relative_position_after',
				value: anchor,
			});
		}
	}

	if (updates.length > 0) {
		const { query, variables } = buildUpdateGroupMutation(updates);
		const data = await client.execute(query, itemIndex, { boardId, groupId, ...variables });
		// Aliases run in order, so merging in order leaves the final state.
		let group: IDataObject = {};
		for (let u = 0; u < updates.length; u++) {
			group = { ...group, ...((data[`u${u}`] ?? {}) as IDataObject) };
		}
		return group;
	}

	const data = await client.execute(
		`query ($ids: [ID!], $groupIds: [String]) {
			boards(ids: $ids) {
				groups(ids: $groupIds) {
					id
					title
					color
					position
					archived
				}
			}
		}`,
		itemIndex,
		{ ids: [boardId], groupIds: [groupId] },
	);
	const boards = (data.boards ?? []) as Array<{ groups?: IDataObject[] }>;
	return boards[0]?.groups?.[0] ?? {};
}
