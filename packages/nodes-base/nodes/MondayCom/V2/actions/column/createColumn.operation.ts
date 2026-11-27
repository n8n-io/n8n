import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import {
	buildDropdownColumnDefaults,
	buildStatusColumnDefaults,
	buildTypeSettingsDefaults,
	CREATABLE_COLUMN_TYPES,
	resolveAfterColumnId,
	STATUS_COLOR_OPTIONS,
	type StatusLabelRow,
	validateCustomColumnId,
} from '../../helpers/columnDefaults';
import { assertRollupFunctionAllowed } from '../../helpers/columnEdit';
import { isPlainJsonObject, safeJsonParse } from '../../helpers/json';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Column Title',
		name: 'columnTitle',
		type: 'string',
		default: '',
		required: true,
		description: 'The title of the new column',
	},
	{
		displayName: 'Column Type',
		name: 'columnType',
		type: 'options',
		options: CREATABLE_COLUMN_TYPES,
		default: 'text',
		required: true,
		description:
			'The type of column to create. Types needing complex settings (connect boards, mirror, formula) are not listed — use the GraphQL operation for those.',
	},
	{
		displayName: 'Labels',
		name: 'statusLabels',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Label',
		default: {},
		description:
			'The status labels to create, in display order. Left empty, monday creates its default labels (Working on it / Done / Stuck).',
		displayOptions: { show: { columnType: ['status'] } },
		options: [
			{
				displayName: 'Label',
				name: 'label',
				values: [
					{
						displayName: 'Name',
						name: 'label',
						type: 'string',
						default: '',
						required: true,
						description: 'The label text',
					},
					{
						displayName: 'Color',
						name: 'color',
						type: 'options',
						options: STATUS_COLOR_OPTIONS,
						default: 'working_orange',
						description: 'The label color, from monday’s status palette',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Optional label description, shown in the status tooltip',
					},
					{
						displayName: 'Counts as Done',
						name: 'isDone',
						type: 'boolean',
						default: false,
						description: 'Whether items with this label count as done (e.g. for battery views)',
					},
				],
			},
		],
	},
	{
		displayName: 'Labels',
		name: 'dropdownLabels',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Label',
		default: {},
		description:
			'The dropdown options to create, in display order. Left empty, the dropdown starts without options.',
		displayOptions: { show: { columnType: ['dropdown'] } },
		options: [
			{
				displayName: 'Label',
				name: 'label',
				values: [
					{
						displayName: 'Name',
						name: 'label',
						type: 'string',
						default: '',
						required: true,
						description: 'The option text',
					},
				],
			},
		],
	},
	{
		displayName: 'Type Settings',
		name: 'columnTypeSettings',
		type: 'collection',
		placeholder: 'Add setting',
		default: {},
		description:
			'Settings specific to the selected column type. Anything not set keeps monday’s default.',
		displayOptions: {
			show: {
				columnType: [
					'checkbox',
					'color_picker',
					'date',
					'dependency',
					'dropdown',
					'email',
					'file',
					'hour',
					'link',
					'long_text',
					'numbers',
					'people',
					'phone',
					'rating',
					'status',
					'text',
					'timeline',
					'vote',
					'week',
					'world_clock',
				],
			},
		},
		options: [
			{
				displayName: 'Allow Linking Multiple Items',
				name: 'allowMultipleItems',
				type: 'boolean',
				default: true,
				description:
					'Whether one item can depend on several items. Applied via a follow-up settings update — the API ignores this setting during column creation.',
				displayOptions: { show: { '/columnType': ['dependency'] } },
			},
			{
				displayName: 'Calculation Type',
				name: 'calcType',
				type: 'options',
				options: [
					{ name: 'Earliest to Latest', value: 'earliestToLatest' },
					{ name: 'Earliest', value: 'earliest' },
					{ name: 'Latest', value: 'latest' },
				],
				default: 'earliestToLatest',
				description: 'How the footer summarizes the column’s dates',
				displayOptions: { show: { '/columnType': ['date'] } },
			},
			{
				displayName: 'CC Item Email Address',
				name: 'ccPulse',
				type: 'boolean',
				default: false,
				description: 'Whether to CC the item’s email address on emails sent from the column',
				displayOptions: { show: { '/columnType': ['email'] } },
			},
			{
				displayName: 'Color (Hex)',
				name: 'color',
				type: 'color',
				default: '',
				description: 'The display color, as a hex code (e.g. #fdab3d)',
				displayOptions: {
					show: { '/columnType': ['checkbox', 'color_picker', 'rating', 'vote', 'week'] },
				},
			},
			{
				displayName: 'Color Method',
				name: 'colorMethod',
				type: 'options',
				options: [
					{ name: 'Hex', value: 'hex' },
					{ name: 'RGB', value: 'rgb' },
				],
				default: 'hex',
				description: 'How the picked color is stored',
				displayOptions: { show: { '/columnType': ['color_picker'] } },
			},
			{
				displayName: 'Custom Unit',
				name: 'customUnit',
				type: 'string',
				default: '',
				description: 'The custom unit symbol, when Unit Symbol is set to "custom"',
				displayOptions: { show: { '/columnType': ['numbers'] } },
			},
			{
				displayName: 'Date Format',
				name: 'dateFormat',
				type: 'string',
				default: '',
				description: 'Date display format override (e.g. DD/MM/YYYY)',
				displayOptions: { show: { '/columnType': ['date'] } },
			},
			{
				displayName: 'Default Link Text',
				name: 'defaultText',
				type: 'string',
				default: '',
				description: 'Text displayed for links added without their own display text',
				displayOptions: { show: { '/columnType': ['link'] } },
			},
			{
				displayName: 'Disable Auto Title',
				name: 'disableAutoTitle',
				type: 'boolean',
				default: false,
				description: 'Whether to prevent automatic generation of a link title from the URL',
				displayOptions: { show: { '/columnType': ['link'] } },
			},
			{
				displayName: 'End Working Hours',
				name: 'endWorkingHours',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 23 },
				default: 17,
				description: 'End of working hours (0-23), highlighted in the clock display',
				displayOptions: { show: { '/columnType': ['world_clock'] } },
			},
			{
				displayName: 'Hide Footer',
				name: 'hideFooter',
				type: 'boolean',
				default: false,
				description: 'Whether to hide the column’s footer summary row',
				displayOptions: {
					show: {
						'/columnType': [
							'checkbox',
							'date',
							'file',
							'link',
							'long_text',
							'numbers',
							'text',
							'timeline',
						],
					},
				},
			},
			{
				displayName: 'Hour Format',
				name: 'hourFormat',
				type: 'options',
				options: [
					{ name: '24-Hour', value: '24H' },
					{ name: '12-Hour', value: '12H' },
				],
				default: '24H',
				description: 'Time display format',
				displayOptions: { show: { '/columnType': ['hour'] } },
			},
			{
				displayName: 'Include Item Name in Email Subject',
				name: 'includePulseInSubject',
				type: 'boolean',
				default: false,
				description: 'Whether emails sent from the column include the item name in the subject',
				displayOptions: { show: { '/columnType': ['email'] } },
			},
			{
				displayName: 'Limit Label Selection',
				name: 'limitSelect',
				type: 'boolean',
				default: false,
				description: 'Whether to limit how many labels can be selected per item',
				displayOptions: { show: { '/columnType': ['dropdown'] } },
			},
			{
				displayName: 'Max Labels Selectable',
				name: 'labelLimitCount',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'Maximum number of labels selectable when Limit Label Selection is on',
				displayOptions: { show: { '/columnType': ['dropdown'] } },
			},
			{
				displayName: 'Max People',
				name: 'maxPeopleAllowed',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description: 'Maximum number of people assignable per item (0 = unlimited)',
				displayOptions: { show: { '/columnType': ['people'] } },
			},
			{
				displayName: 'Max Rating',
				name: 'ratingLimit',
				type: 'number',
				typeOptions: { minValue: 3, maxValue: 10 },
				default: 5,
				description: 'The rating scale maximum (3-10)',
				displayOptions: { show: { '/columnType': ['rating'] } },
			},
			{
				displayName: 'Numeric Only Date Format',
				name: 'useNumericOnlyFormat',
				type: 'boolean',
				default: false,
				description: 'Whether to display dates in a numeric-only format',
				displayOptions: { show: { '/columnType': ['date'] } },
			},
			{
				displayName: 'Precision',
				name: 'precision',
				type: 'options',
				options: [
					{ name: '0 Decimal Places', value: 0 },
					{ name: '1 Decimal Place', value: 1 },
					{ name: '2 Decimal Places', value: 2 },
					{ name: '3 Decimal Places', value: 3 },
					{ name: '4 Decimal Places', value: 4 },
					{ name: '5 Decimal Places', value: 5 },
					{ name: 'Automatic', value: -1 },
				],
				default: -1,
				description: 'Number of decimal places to display',
				displayOptions: { show: { '/columnType': ['numbers'] } },
			},
			{
				displayName: 'Rating Symbol',
				name: 'ratingSymbol',
				type: 'options',
				options: [
					{ name: 'Stars', value: 'stars' },
					{ name: 'Hearts', value: 'hearts' },
				],
				default: 'stars',
				description: 'The symbol used to render the rating',
				displayOptions: { show: { '/columnType': ['rating'] } },
			},
			{
				displayName: 'Rollup Function (Multi-Level Boards)',
				name: 'rollupFunction',
				type: 'options',
				options: [
					{ name: 'Board Default', value: '' },
					{ name: 'Count Labels (Status)', value: 'COUNT_KEYS' },
					{ name: 'Max (Numbers, Date)', value: 'MAX' },
					{ name: 'Min (Numbers, Date)', value: 'MIN' },
					{ name: 'Min & Max Span (Timeline)', value: 'MIN_MAX' },
					{ name: 'None — Disable Rollup', value: 'NONE' },
					{ name: 'Sum (Numbers)', value: 'SUM' },
				],
				default: '',
				description:
					'How the column calculates its value on parent items from their children, on multi-level boards (where these column types roll up by default — pick None to opt out). Each function only works on the column types in its parentheses. Not supported on classic boards.',
				displayOptions: { show: { '/columnType': ['numbers', 'date', 'timeline', 'status'] } },
			},
			{
				displayName: 'Show Country Flag',
				name: 'showFlag',
				type: 'boolean',
				default: true,
				description: 'Whether to display the country flag next to the phone number',
				displayOptions: { show: { '/columnType': ['phone'] } },
			},
			{
				displayName: 'Show Current Year',
				name: 'showCurrentYear',
				type: 'boolean',
				default: false,
				description: 'Whether to show the year for dates in the current year',
				displayOptions: { show: { '/columnType': ['date'] } },
			},
			{
				displayName: 'Show Milestone Option',
				name: 'showMilestone',
				type: 'boolean',
				default: false,
				description: 'Whether to show the "set as milestone" option on timeline values',
				displayOptions: { show: { '/columnType': ['timeline'] } },
			},
			{
				displayName: 'Show Time by Default',
				name: 'showTimeByDefault',
				type: 'boolean',
				default: false,
				description: 'Whether new date values include a time by default',
				displayOptions: { show: { '/columnType': ['date'] } },
			},
			{
				displayName: 'Show UTC Offset',
				name: 'showUtcOffset',
				type: 'boolean',
				default: false,
				description: 'Whether to show the UTC offset alongside the time',
				displayOptions: { show: { '/columnType': ['world_clock'] } },
			},
			{
				displayName: 'Show Week Day',
				name: 'showWeekDay',
				type: 'boolean',
				default: false,
				description: 'Whether to show the day of the week next to dates',
				displayOptions: { show: { '/columnType': ['date'] } },
			},
			{
				displayName: 'Show Week Number',
				name: 'showWeekNumber',
				type: 'boolean',
				default: false,
				description: 'Whether to show week numbers',
				displayOptions: { show: { '/columnType': ['date', 'timeline'] } },
			},
			{
				displayName: 'Show Weekends',
				name: 'showWeekends',
				type: 'boolean',
				default: true,
				description: 'Whether weekends are included in the display',
				displayOptions: { show: { '/columnType': ['date', 'timeline'] } },
			},
			{
				displayName: 'Start Working Hours',
				name: 'startWorkingHours',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 23 },
				default: 9,
				description: 'Start of working hours (0-23), highlighted in the clock display',
				displayOptions: { show: { '/columnType': ['world_clock'] } },
			},
			{
				displayName: 'Time Display Format',
				name: 'clockFormat',
				type: 'string',
				default: '',
				placeholder: 'e.g. HH:mm',
				description: 'Time display format string (e.g. HH:mm or hh:mm A)',
				displayOptions: { show: { '/columnType': ['world_clock'] } },
			},
			{
				displayName: 'Time Format',
				name: 'timeFormat',
				type: 'string',
				default: '',
				description: 'Time display format override for date values',
				displayOptions: { show: { '/columnType': ['date'] } },
			},
			{
				displayName: 'Unit Direction',
				name: 'unitDirection',
				type: 'options',
				options: [
					{ name: 'Left', value: 'left' },
					{ name: 'Right', value: 'right' },
				],
				default: 'left',
				description: 'Position of the unit symbol relative to the value',
				displayOptions: { show: { '/columnType': ['numbers'] } },
			},
			{
				displayName: 'Unit Symbol',
				name: 'unitSymbol',
				type: 'string',
				default: '',
				placeholder: 'e.g. $, %, or custom',
				description:
					'The unit symbol shown with values (e.g. $, %). Set to "custom" and fill Custom Unit for a symbol of your own.',
				displayOptions: { show: { '/columnType': ['numbers'] } },
			},
		],
	},
	{
		displayName: 'Options',
		name: 'createColumnOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Column ID',
				name: 'customColumnId',
				type: 'string',
				default: '',
				description:
					'A custom ID for the new column (e.g. "work_status"); left unset, monday generates one. Up to 24 characters: lowercase letters, digits and underscores, not starting with a digit. Must be unique on the board (IDs of deleted columns stay reserved) and can never be changed after creation.',
			},
			{
				displayName: 'Defaults (JSON)',
				name: 'defaultsJson',
				type: 'json',
				default: '{}',
				description:
					'Raw column settings in the API format, for full control (overrides Labels and Type Settings). See <a href="https://developer.monday.com/api-reference/reference/columns#create-a-column">the API reference</a>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the new column',
			},
			{
				displayName: 'Position',
				name: 'columnPosition',
				type: 'options',
				options: [
					{ name: 'After Column', value: 'after' },
					{ name: 'At Beginning', value: 'start' },
					{ name: 'At End', value: 'end' },
					{ name: 'Before Column', value: 'before' },
				],
				default: 'end',
				description:
					'Where to place the new column on the board. "At Beginning" means right after the Name column, which is always first.',
			},
			{
				// Prefix keeps it next to Position; suffixing "Name or ID" would break that.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Position: Relative To Column',
				name: 'positionColumnId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBoardColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: '',
				description:
					'The existing column the new column is placed before or after (used with Position "After Column" / "Before Column"). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { columnPosition: ['after', 'before'] } },
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['column'],
		operation: ['createColumn'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/** The fields every create-column mutation returns. */
const CREATED_COLUMN_FIELDS = 'id title type description settings_str revision';

/**
 * Resolves the after_column_id argument for the Position option.
 * "Before" needs the board's column order, fetched in one bounded call.
 */
async function resolveColumnPosition(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
	boardId: string,
	options: IDataObject,
): Promise<string | undefined> {
	const position = (options.columnPosition as string) || 'end';
	if (position === 'end') return undefined;
	if (position === 'start') return 'name';

	const anchorColumnId = (options.positionColumnId as string) || '';
	if (!anchorColumnId) {
		throw new NodeOperationError(
			this.getNode(),
			'Select the column the new column should be placed before or after (Position: Relative To Column)',
			{ itemIndex },
		);
	}

	let orderedColumnIds: string[] = [];
	if (position === 'before') {
		const data = await client.execute(
			'query ($ids: [ID!]) { boards(ids: $ids) { columns { id } } }',
			itemIndex,
			{ ids: [boardId] },
		);
		const boards = (data.boards ?? []) as Array<{ columns?: Array<{ id: string }> }>;
		orderedColumnIds = (boards[0]?.columns ?? []).map((column) => column.id);
	}

	const resolved = resolveAfterColumnId(position, anchorColumnId, orderedColumnIds);
	if (resolved === null) {
		throw new NodeOperationError(
			this.getNode(),
			`Column "${anchorColumnId}" was not found on board ${boardId}, so the new column can't be positioned relative to it`,
			{ itemIndex },
		);
	}
	return resolved;
}

/**
 * The custom-column-ID argument for the create mutations. The API rejects an
 * explicit `id: null` ("The specified ID ... cannot be empty", verified live),
 * so the argument and its variable are omitted entirely when the user left
 * Column ID unset — GraphQL also forbids declaring an unused variable.
 * Exported for unit tests.
 */
export function buildCustomColumnIdArgs(customColumnId: string): {
	varDef: string;
	arg: string;
	variables: Record<string, string>;
} {
	if (!customColumnId) return { varDef: '', arg: '', variables: {} };
	return {
		varDef: ', $customColumnId: String',
		arg: 'id: $customColumnId,',
		variables: { customColumnId },
	};
}

/**
 * Column: Add to Board. Status and dropdown label builders go through the
 * typed create_status_column / create_dropdown_column mutations (name, color,
 * is_done, selection limits); every other type compiles its Type Settings
 * collection into the generic create_column defaults JSON, which the API
 * validates against the column type's schema. The Defaults (JSON) option
 * remains the raw escape hatch and takes precedence over both.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const title = this.getNodeParameter('columnTitle', itemIndex) as string;
	const columnType = this.getNodeParameter('columnType', itemIndex) as string;
	const typeSettings = this.getNodeParameter('columnTypeSettings', itemIndex, {}) as IDataObject;
	const options = this.getNodeParameter('createColumnOptions', itemIndex, {}) as IDataObject;

	const afterColumnId = await resolveColumnPosition.call(this, client, itemIndex, boardId, options);
	const description = (options.description as string) || null;

	const customColumnId = ((options.customColumnId as string) || '').trim();
	if (customColumnId) {
		const problem = validateCustomColumnId(customColumnId);
		if (problem) {
			throw new NodeOperationError(this.getNode(), `Column ID ${problem}`, {
				itemIndex,
				description: `"${customColumnId}" is not a valid column ID. Use up to 24 characters: lowercase letters, digits and underscores, not starting with a digit.`,
			});
		}
	}

	let rawDefaults: Record<string, unknown> | undefined;
	const rawDefaultsInput = options.defaultsJson;
	if (rawDefaultsInput && rawDefaultsInput !== '{}') {
		const parsed =
			typeof rawDefaultsInput === 'string' ? safeJsonParse(rawDefaultsInput) : rawDefaultsInput;
		if (!isPlainJsonObject(parsed)) {
			throw new NodeOperationError(this.getNode(), 'Defaults (JSON) must be a valid JSON object', {
				itemIndex,
			});
		}
		rawDefaults = parsed as Record<string, unknown>;
	}

	const customId = buildCustomColumnIdArgs(customColumnId);
	const baseVariables = {
		boardId,
		title,
		description,
		afterColumnId: afterColumnId ?? null,
		...customId.variables,
	};

	// Rollup (multi-level boards): sent as the capabilities argument. Only
	// combinations the API supports pass — anything else is a friendly error
	// instead of a cryptic 500.
	const rollupFunction = (typeSettings.rollupFunction as string) || '';
	assertRollupFunctionAllowed(this.getNode(), itemIndex, columnType, rollupFunction);
	const capabilities = rollupFunction ? { calculated: { function: rollupFunction } } : null;

	if (!rawDefaults && columnType === 'status') {
		const rows = ((this.getNodeParameter('statusLabels', itemIndex, {}) as IDataObject).label ??
			[]) as StatusLabelRow[];
		const defaults = buildStatusColumnDefaults(rows);
		if (defaults || capabilities) {
			const data = await client.execute(
				`mutation ($boardId: ID!${customId.varDef}, $title: String!, $description: String, $afterColumnId: ID, $defaults: CreateStatusColumnSettingsInput, $capabilities: StatusColumnCapabilitiesInput) {
					create_status_column(
						board_id: $boardId,
						${customId.arg}
						title: $title,
						description: $description,
						after_column_id: $afterColumnId,
						defaults: $defaults,
						capabilities: $capabilities
					) { ${CREATED_COLUMN_FIELDS} }
				}`,
				itemIndex,
				{ ...baseVariables, defaults: defaults ?? null, capabilities },
			);
			return (data.create_status_column ?? {}) as IDataObject;
		}
	}

	if (!rawDefaults && columnType === 'dropdown') {
		const rows = ((this.getNodeParameter('dropdownLabels', itemIndex, {}) as IDataObject).label ??
			[]) as Array<{ label: string }>;
		// create_dropdown_column requires labels, so the selection limit can
		// only be applied together with them — fail loudly instead of dropping it.
		if (rows.length === 0 && typeSettings.limitSelect === true) {
			throw new NodeOperationError(
				this.getNode(),
				'Limit Selection requires at least one dropdown label',
				{
					itemIndex,
					description:
						'Add the labels under Dropdown Labels, or turn off Limit Selection and set the limit later with Column: Update.',
				},
			);
		}
		const defaults = buildDropdownColumnDefaults(rows, {
			limitSelect: typeSettings.limitSelect as boolean | undefined,
			labelLimitCount: typeSettings.labelLimitCount as number | undefined,
		});
		if (defaults) {
			const data = await client.execute(
				`mutation ($boardId: ID!${customId.varDef}, $title: String!, $description: String, $afterColumnId: ID, $defaults: CreateDropdownColumnSettingsInput) {
					create_dropdown_column(
						board_id: $boardId,
						${customId.arg}
						title: $title,
						description: $description,
						after_column_id: $afterColumnId,
						defaults: $defaults
					) { ${CREATED_COLUMN_FIELDS} }
				}`,
				itemIndex,
				{ ...baseVariables, defaults },
			);
			return (data.create_dropdown_column ?? {}) as IDataObject;
		}
	}

	const defaults = rawDefaults ?? buildTypeSettingsDefaults(columnType, typeSettings);

	let data: IDataObject;
	try {
		data = await client.execute(
			`mutation ($boardId: ID!${customId.varDef}, $title: String!, $columnType: ColumnType!, $description: String, $afterColumnId: ID, $defaults: JSON, $capabilities: ColumnCapabilitiesInput) {
				create_column(
					board_id: $boardId,
					${customId.arg}
					title: $title,
					column_type: $columnType,
					description: $description,
					after_column_id: $afterColumnId,
					defaults: $defaults,
					capabilities: $capabilities
				) { ${CREATED_COLUMN_FIELDS} }
			}`,
			itemIndex,
			{
				...baseVariables,
				columnType,
				// The API's JSON scalar arrives as a string.
				defaults: defaults ? JSON.stringify(defaults) : null,
				capabilities,
			},
		);
	} catch (error) {
		// A board can hold only ONE dependency column; a second create fails
		// with the generic "Cannot add column" (verified live 2026-07-17).
		if (
			columnType === 'dependency' &&
			error instanceof Error &&
			error.message.includes('Cannot add column')
		) {
			throw new NodeOperationError(this.getNode(), 'Cannot add a dependency column', {
				itemIndex,
				description:
					'A board can only have one dependency column — this board most likely already has one. Use the existing column, or delete it first.',
			});
		}
		// Everything the client throws is already a mapped NodeApiError.
		throw error;
	}

	const created = (data.create_column ?? {}) as IDataObject;

	// dependency: create_column silently DISCARDS defaults for this type
	// (verified live 2026-07-17), so Allow Linking Multiple Items is applied
	// via a follow-up update_column. That mutation REPLACES the dependency
	// settings wholesale — boardIds must be re-sent or it is wiped to [],
	// which breaks all value writes on the column (verified live).
	if (
		columnType === 'dependency' &&
		typeof typeSettings.allowMultipleItems === 'boolean' &&
		!rawDefaults &&
		created.id
	) {
		const updated = await client.execute(
			`mutation ($boardId: ID!, $columnId: String!, $revision: String!, $settings: JSON) {
				update_column(
					board_id: $boardId,
					id: $columnId,
					column_type: dependency,
					revision: $revision,
					settings: $settings
				) { ${CREATED_COLUMN_FIELDS} }
			}`,
			itemIndex,
			{
				boardId,
				columnId: created.id,
				revision: created.revision,
				// update_column wants a real JSON object here, not a string —
				// the exact opposite of create_column's defaults (verified live).
				settings: {
					allowMultipleItems: typeSettings.allowMultipleItems,
					boardIds: [Number(boardId)],
				},
			},
		);
		return (updated.update_column ?? created) as IDataObject;
	}

	return created;
}
