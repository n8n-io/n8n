import type { INodeProperties } from 'n8n-workflow';

import { groupResourceLocator } from '../../helpers/groupLocator';

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

const GROUP_POSITION_OPTIONS = [
	{ name: 'After Group', value: 'after' },
	{ name: 'At Bottom', value: 'bottom' },
	{ name: 'At Top', value: 'top' },
	{ name: 'Before Group', value: 'before' },
];

/** Shared "Position: Relative To Group" picker; description varies by operation. */
function positionRelativeToGroupField(relativeToDescription: string): INodeProperties {
	return {
		// Prefix keeps it next to Position; suffixing "Name or ID" would break that.
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Position: Relative To Group',
		name: 'positionGroupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardGroups',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-from-dynamic-options -- description is operation-specific; still ends with the required expression hint
		description: `${relativeToDescription} Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>`,
		displayOptions: { show: { groupPosition: ['after', 'before'] } },
	};
}

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['group'] } },
		options: [
			{
				name: 'Archive or Delete',
				value: 'archiveOrDeleteGroup',
				action: 'Archive or delete a board group',
				description: 'Archive a group (recoverable, the default) or permanently delete it',
			},
			{
				name: 'Create',
				value: 'createGroup',
				action: 'Create a board group',
				description: 'Create a new group on a board',
			},
			{
				name: 'Duplicate',
				value: 'duplicateGroup',
				action: 'Duplicate a board group',
				description: 'Create a copy of a group with its items on the same board',
			},
			{
				name: 'Get Many',
				value: 'getGroups',
				action: 'Get many board groups',
				description: 'Return the groups of a board',
			},
			{
				name: 'Update',
				value: 'updateGroup',
				action: 'Update a board group',
				description: 'Change the title, color, or position of an existing group',
			},
		],
		default: 'getGroups',
	},
];

export const groupFields: INodeProperties[] = [
	{
		...groupResourceLocator,
		displayOptions: {
			show: { operation: ['archiveOrDeleteGroup', 'duplicateGroup', 'updateGroup'] },
		},
	},

	{
		displayName: 'Options',
		name: 'duplicateGroupOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['duplicateGroup'] } },
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

	{
		displayName: 'Group Name',
		name: 'groupName',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the new group',
		displayOptions: { show: { operation: ['createGroup'] } },
	},
	{
		displayName: 'Options',
		name: 'createGroupOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['createGroup'] } },
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
	{
		displayName: 'Update Fields',
		name: 'updateGroupFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		description:
			'The group attributes to change. Each field is applied as its own change in one request, in order (title, color, position) — if one fails, fields before it may already be applied.',
		displayOptions: { show: { operation: ['updateGroup'] } },
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
	{
		displayName: 'Options',
		name: 'getGroupsOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['getGroups'] } },
		options: [
			{
				// "Groups" per product wording, matching Include Columns/Groups.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Groups',
				name: 'groupIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardGroups',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return these groups; selecting none returns all groups of the board. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];
