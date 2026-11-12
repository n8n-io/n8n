import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { assertRollupFunctionAllowed, fetchColumnForEdit } from '../../helpers/columnEdit';
import { isPlainJsonObject, safeJsonParse } from '../../helpers/json';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Column Name or ID',
		name: 'updateColumnId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardColumns',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		required: true,
		description:
			'The column to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'New Title',
		name: 'newColumnTitle',
		type: 'string',
		default: '',
		description: 'The new title for the column; leave empty to keep the current title',
	},
	{
		displayName: 'New Description',
		name: 'newColumnDescription',
		type: 'string',
		default: '',
		description: 'The new description for the column; leave empty to keep the current description',
	},
	{
		displayName: 'Update Fields',
		name: 'updateColumnOptions',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		options: [
			{
				displayName: 'Rollup Function (Multi-Level Boards)',
				name: 'rollupFunction',
				type: 'options',
				options: [
					{ name: 'Count Labels (Status)', value: 'COUNT_KEYS' },
					{ name: 'Max (Numbers, Date)', value: 'MAX' },
					{ name: 'Min (Numbers, Date)', value: 'MIN' },
					{ name: 'Min & Max Span (Timeline)', value: 'MIN_MAX' },
					{ name: 'None — Disable Rollup', value: 'NONE' },
					{ name: 'Sum (Numbers)', value: 'SUM' },
				],
				default: 'NONE',
				description:
					'How the column calculates its value on parent items from their children, on multi-level boards. Each function only works on the column types in its parentheses; None turns the rollup off. Not supported on classic boards.',
			},
			{
				displayName: 'Settings (JSON)',
				name: 'settingsJson',
				type: 'json',
				default: '{}',
				description:
					'Column settings to change, in the API format (same shape as the settings returned by Get Many). Merged into the current settings at the top level — only the keys you send change, but a sent nested object (e.g. a numbers column\'s "unit") replaces that object entirely. To edit status/dropdown labels, prefer the Add Label / Update Label operations.',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 120,
				description: 'The column width in pixels',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['column'],
		operation: ['updateColumn'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Column: Update — change_column_title and/or change_column_metadata
 * (description). Only the fields the user filled in are changed.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const columnId = this.getNodeParameter('updateColumnId', itemIndex) as string;
	const newTitle = (this.getNodeParameter('newColumnTitle', itemIndex, '') as string).trim();
	const newDescription = (
		this.getNodeParameter('newColumnDescription', itemIndex, '') as string
	).trim();
	const options = this.getNodeParameter('updateColumnOptions', itemIndex, {}) as IDataObject;

	let settings: IDataObject | undefined;
	if (options.settingsJson && options.settingsJson !== '{}') {
		const parsed =
			typeof options.settingsJson === 'string'
				? safeJsonParse(options.settingsJson as string)
				: options.settingsJson;
		if (!isPlainJsonObject(parsed)) {
			throw new NodeOperationError(this.getNode(), 'Settings (JSON) must be a valid JSON object', {
				itemIndex,
			});
		}
		settings = parsed;
	}
	const width = options.width as number | undefined;
	const rollupFunction = (options.rollupFunction as string) || '';

	if (!newTitle && !newDescription && !settings && width === undefined && !rollupFunction) {
		throw new NodeOperationError(
			this.getNode(),
			'Set a new title, description, width, settings, or rollup function for the column',
			{ itemIndex },
		);
	}

	// Settings/width/rollup need the generic update_column mutation, which
	// wants the column's type and current revision — one bounded read. The
	// mutation's settings JSON must be a real object (a JSON string fails
	// validation) and merges with the current settings at the top level
	// (verified live).
	if (settings || width !== undefined || rollupFunction) {
		const column = await fetchColumnForEdit.call(this, client, itemIndex, boardId, columnId);
		assertRollupFunctionAllowed(this.getNode(), itemIndex, column.type, rollupFunction);
		const data = await client.execute(
			`mutation ($boardId: ID!, $columnId: String!, $columnType: ColumnType!, $revision: String!, $title: String, $description: String, $width: Int, $settings: JSON, $capabilities: ColumnCapabilitiesInput) {
				update_column(
					board_id: $boardId,
					id: $columnId,
					column_type: $columnType,
					revision: $revision,
					title: $title,
					description: $description,
					width: $width,
					settings: $settings,
					capabilities: $capabilities
				) { id title type description width settings_str capabilities { calculated { function } } }
			}`,
			itemIndex,
			{
				boardId,
				columnId,
				columnType: column.type,
				revision: column.revision,
				// Unset arguments are OMITTED, not sent as null: update_column
				// schema-validates an explicit settings: null ("must be object")
				// when capabilities is present (verified live). An unprovided
				// nullable variable counts as an omitted argument per GraphQL.
				title: newTitle || undefined,
				description: newDescription || undefined,
				width,
				settings,
				capabilities: rollupFunction ? { calculated: { function: rollupFunction } } : undefined,
			},
		);
		return (data.update_column ?? {}) as IDataObject;
	}

	let result: IDataObject = {};
	if (newTitle) {
		const data = await client.execute(
			`mutation ($boardId: ID!, $columnId: String!, $title: String!) {
				change_column_title(board_id: $boardId, column_id: $columnId, title: $title) {
					id
					title
					description
				}
			}`,
			itemIndex,
			{ boardId, columnId, title: newTitle },
		);
		result = (data.change_column_title ?? {}) as IDataObject;
	}
	if (newDescription) {
		const data = await client.execute(
			`mutation ($boardId: ID!, $columnId: String!, $value: String!) {
				change_column_metadata(
					board_id: $boardId,
					column_id: $columnId,
					column_property: description,
					value: $value
				) {
					id
					title
					description
				}
			}`,
			itemIndex,
			{ boardId, columnId, value: newDescription },
		);
		result = (data.change_column_metadata ?? {}) as IDataObject;
	}
	return result;
}
