import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { GROUP_POSITION_OPTIONS, positionRelativeToGroupField } from '../common.description';

/**
 * The group-color palette create_group accepts (hex values from the API
 * docs; arbitrary hex strings are rejected). n8n dropdowns can't render
 * color swatches, so each name carries the nearest colored-circle emoji
 * (grouping the palette by hue, same convention as STATUS_COLOR_OPTIONS)
 * and the description carries the exact hex.
 */
const GROUP_COLOR_OPTIONS = [
	{ name: '⚪ Grey', value: '#c4c4c4', description: '#c4c4c4' },
	{ name: '⚫ Trolley Grey', value: '#808080', description: '#808080' },
	{ name: '🔴 Dark Pink', value: '#ff158a', description: '#ff158a' },
	{ name: '🔴 Dark Red', value: '#bb3354', description: '#bb3354' },
	{ name: '🔴 Red', value: '#e2445c', description: '#e2445c' },
	{ name: '🔵 Blue', value: '#579bfc', description: '#579bfc' },
	{ name: '🔵 Dark Blue', value: '#0086c0', description: '#0086c0' },
	{ name: '🔵 Light Blue', value: '#66ccff', description: '#66ccff' },
	{ name: '🟠 Dark Orange', value: '#ff642e', description: '#ff642e' },
	{ name: '🟠 Orange', value: '#fdab3d', description: '#fdab3d' },
	{ name: '🟡 Mustard', value: '#cab641', description: '#cab641' },
	{ name: '🟡 Yellow', value: '#ffcb00', description: '#ffcb00' },
	{ name: '🟢 Dark Green', value: '#037f4c', description: '#037f4c' },
	{ name: '🟢 Green', value: '#00c875', description: '#00c875' },
	{ name: '🟢 Lime Green', value: '#9cd326', description: '#9cd326' },
	{ name: '🟣 Dark Purple', value: '#784bd1', description: '#784bd1' },
	{ name: '🟣 Light Pink', value: '#ff5ac4', description: '#ff5ac4' },
	{ name: '🟣 Purple', value: '#a25ddc', description: '#a25ddc' },
	{ name: '🟤 Brown', value: '#7f5347', description: '#7f5347' },
];

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Group Name',
		name: 'groupName',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the new group',
	},
	{
		displayName: 'Options',
		name: 'createGroupOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Color',
				name: 'groupColor',
				type: 'options',
				options: GROUP_COLOR_OPTIONS,
				default: '',
				description: 'The color of the new group; left unset, monday picks one',
			},
			{
				displayName: 'Position',
				name: 'groupPosition',
				type: 'options',
				options: GROUP_POSITION_OPTIONS,
				default: 'top',
				description:
					'Where to place the new group on the board; left unset, monday puts it at the top',
			},
			positionRelativeToGroupField(
				'The existing group the new group is placed before or after (used with Position "After Group" / "Before Group").',
			),
		],
	},
];

const displayOptions = {
	show: {
		resource: ['group'],
		operation: ['createGroup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Maps the Group: Create Position option to create_group's positioning
 * arguments. Verified live (2026-07): `after_at` without `relative_to` puts
 * the group at the top of the board, `before_at` without `relative_to` at the
 * bottom; with `relative_to` they mean below/above that group. No option set
 * means no arguments — the API default is the top of the board.
 */
export function buildGroupPositionArgs(
	position: string | undefined,
	anchorGroupId: string | undefined,
): { method?: 'after_at' | 'before_at'; relativeTo?: string } | 'missing-anchor' {
	if (!position) return {};
	if (position === 'top') return { method: 'after_at' };
	if (position === 'bottom') return { method: 'before_at' };
	if (!anchorGroupId) return 'missing-anchor';
	return { method: position === 'before' ? 'before_at' : 'after_at', relativeTo: anchorGroupId };
}

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const groupName = this.getNodeParameter('groupName', itemIndex) as string;
	const groupOptions = this.getNodeParameter('createGroupOptions', itemIndex, {}) as IDataObject;

	const varDefs = ['$boardId: ID!', '$groupName: String!'];
	const args = ['board_id: $boardId', 'group_name: $groupName'];
	const variables: Record<string, unknown> = { boardId, groupName };
	if (groupOptions.groupColor) {
		varDefs.push('$groupColor: String');
		args.push('group_color: $groupColor');
		variables.groupColor = groupOptions.groupColor;
	}
	const positionArgs = buildGroupPositionArgs(
		groupOptions.groupPosition as string,
		groupOptions.positionGroupId as string,
	);
	if (positionArgs === 'missing-anchor') {
		throw new NodeOperationError(
			this.getNode(),
			'Select the group the new group should be placed before or after (Position: Relative To Group)',
			{ itemIndex },
		);
	}
	if (positionArgs.method) {
		args.push(`position_relative_method: ${positionArgs.method}`);
	}
	if (positionArgs.relativeTo) {
		varDefs.push('$relativeTo: String');
		args.push('relative_to: $relativeTo');
		variables.relativeTo = positionArgs.relativeTo;
	}

	const data = await client.execute(
		`mutation (${varDefs.join(', ')}) {
			create_group(${args.join(', ')}) {
				id
				title
				color
				position
				archived
			}
		}`,
		itemIndex,
		variables,
	);
	return (data.create_group ?? {}) as IDataObject;
}
