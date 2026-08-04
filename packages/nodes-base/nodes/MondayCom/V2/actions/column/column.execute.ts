import { NodeOperationError, type IDataObject, type IExecuteFunctions } from 'n8n-workflow';

import {
	buildDropdownColumnDefaults,
	buildStatusColumnDefaults,
	buildTypeSettingsDefaults,
	dropdownSettingsToInputRows,
	nextStatusLabelIndex,
	placeStatusLabelRow,
	resolveAfterColumnId,
	statusSettingsToInputRows,
	validateCustomColumnId,
	type ExistingLabel,
	type StatusLabelPosition,
	type StatusLabelRow,
} from '../../helpers/columnDefaults';
import { validateRollupFunction } from '../../helpers/multiLevel';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { safeJsonParse } from '../item/item.execute';

/** True for plain objects only — rejects null and arrays (`typeof [] === 'object'`). */
export function isPlainJsonObject(value: unknown): value is IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Shapes one Column: Get Many row — settings_str is parsed into a
 * `settings` object so expressions can address label maps etc. directly.
 * `rollup` carries the calculated capability (multi-level boards): its
 * presence marks a rollup column; null on classic boards and plain columns.
 */
export function formatColumnSchemaRow(column: IDataObject): IDataObject {
	let settings: unknown = null;
	if (typeof column.settings_str === 'string' && column.settings_str !== '') {
		const parsed = safeJsonParse(column.settings_str);
		if (parsed !== undefined) settings = parsed;
	}
	const capabilities = column.capabilities as
		| { calculated?: { function?: string; calculated_type?: string } | null }
		| null
		| undefined;
	return {
		id: column.id ?? null,
		title: column.title ?? null,
		type: column.type ?? null,
		description: column.description ?? null,
		settings: settings as IDataObject,
		rollup: (capabilities?.calculated as IDataObject | undefined) ?? null,
	};
}

/**
 * Pre-flight guard for the Rollup Function option on Column Create/Update
 * (multi-level boards). Validates the picked function against the column
 * type via validateRollupFunction and throws the friendly error instead of
 * letting the API answer with a cryptic 500. No-op when no function is set.
 */
export function assertRollupFunctionAllowed(
	node: ReturnType<IExecuteFunctions['getNode']>,
	itemIndex: number,
	columnType: string,
	rollupFunction: string,
): void {
	if (!rollupFunction) return;
	const validationError = validateRollupFunction(columnType, rollupFunction);
	if (validationError) {
		throw new NodeOperationError(node, validationError, { itemIndex });
	}
}

/**
 * Column: Update — change_column_title and/or change_column_metadata
 * (description). Only the fields the user filled in are changed.
 */
/**
 * Fetches the type, current revision (required by the update mutations for
 * optimistic concurrency), and typed settings of one column, in one call.
 */
async function fetchColumnForEdit(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
	boardId: string,
	columnId: string,
): Promise<{ type: string; revision: string; settings: IDataObject }> {
	const data = await client.execute(
		'query ($ids: [ID!]) { boards(ids: $ids) { columns { id type revision settings } } }',
		itemIndex,
		{ ids: [boardId] },
	);
	const boards = (data.boards ?? []) as Array<{
		columns?: Array<{ id: string; type: string; revision: string; settings?: IDataObject }>;
	}>;
	const column = boards[0]?.columns?.find((candidate) => candidate.id === columnId);
	if (!column) {
		throw new NodeOperationError(
			this.getNode(),
			`Column "${columnId}" was not found on board ${boardId}`,
			{ itemIndex },
		);
	}
	return { type: column.type, revision: column.revision, settings: column.settings ?? {} };
}

export async function updateColumn(
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

/** The GraphQL for one full-label-set write, per column kind. */
const LABEL_UPDATE_MUTATIONS: Record<string, string> = {
	status: `mutation ($boardId: ID!, $columnId: String!, $revision: String!, $labels: [UpdateStatusLabelInput!]!) {
		update_status_column(board_id: $boardId, id: $columnId, revision: $revision, settings: { labels: $labels }) {
			id title type settings
		}
	}`,
	dropdown: `mutation ($boardId: ID!, $columnId: String!, $revision: String!, $labels: [UpdateDropdownLabelInput!]!) {
		update_dropdown_column(board_id: $boardId, id: $columnId, revision: $revision, settings: { labels: $labels }) {
			id title type settings
		}
	}`,
};

/**
 * Reads the column being label-edited and validates it matches the picked
 * kind (the update mutations are kind-specific). Returns its labels too —
 * the mutations replace the whole label set, so edits are read-modify-write.
 */
async function readLabelColumn(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
	boardId: string,
): Promise<{ columnId: string; kind: string; revision: string; labels: ExistingLabel[] }> {
	const kind = this.getNodeParameter('labelColumnKind', itemIndex) as string;
	const columnId = this.getNodeParameter('labelColumnId', itemIndex) as string;

	const column = await fetchColumnForEdit.call(this, client, itemIndex, boardId, columnId);
	if (column.type !== kind) {
		throw new NodeOperationError(
			this.getNode(),
			`Column "${columnId}" is a ${column.type} column, not a ${kind} column — fix the Column Kind parameter`,
			{ itemIndex },
		);
	}
	const labels = (column.settings.labels ?? []) as ExistingLabel[];
	return { columnId, kind, revision: column.revision, labels };
}

/**
 * Column: Add Label — appends one label to a status/dropdown column via the
 * typed update mutations, re-sending all existing labels (with their ids, so
 * they keep their identity) plus the new one.
 */
export async function addColumnLabel(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const labelName = (this.getNodeParameter('newLabelName', itemIndex) as string).trim();
	if (!labelName) {
		throw new NodeOperationError(this.getNode(), 'Label Name must not be empty', { itemIndex });
	}

	const { columnId, kind, revision, labels } = await readLabelColumn.call(
		this,
		client,
		itemIndex,
		boardId,
	);

	let rows: IDataObject[];
	if (kind === 'status') {
		const options = this.getNodeParameter('addColumnLabelOptions', itemIndex, {}) as IDataObject;
		const newRow: IDataObject = {
			label: labelName,
			color: this.getNodeParameter('newLabelColor', itemIndex, 'working_orange') as string,
			index: nextStatusLabelIndex(labels),
		};
		if (options.description) newRow.description = options.description;
		if (options.isDone) newRow.is_done = true;
		const position = (options.labelPosition as StatusLabelPosition) || 'last';
		if (position === 'last') {
			// Plain append — existing labels keep their exact indexes.
			rows = [...statusSettingsToInputRows(labels), newRow];
		} else {
			const placed = placeStatusLabelRow(
				statusSettingsToInputRows(labels),
				newRow,
				position,
				options.positionLabelId ? Number(options.positionLabelId) : undefined,
			);
			if (placed === 'missing-anchor') {
				throw new NodeOperationError(
					this.getNode(),
					'Select the label the new label should be placed before or after (Position: Relative To Label)',
					{ itemIndex },
				);
			}
			rows = placed;
		}
	} else {
		rows = [...dropdownSettingsToInputRows(labels), { label: labelName }];
	}

	const data = await client.execute(LABEL_UPDATE_MUTATIONS[kind], itemIndex, {
		boardId,
		columnId,
		revision,
		labels: rows,
	});
	return (data.update_status_column ?? data.update_dropdown_column ?? {}) as IDataObject;
}

/**
 * Column: Update Label — modifies one label (by id) of a status/dropdown
 * column: rename, recolor, description, counts-as-done, or (de)activation.
 * Unchanged labels are re-sent as-is; only the set fields change.
 */
export async function updateColumnLabel(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const labelId = Number(this.getNodeParameter('existingLabelId', itemIndex));
	const changes = this.getNodeParameter('labelChanges', itemIndex, {}) as IDataObject;
	if (Object.keys(changes).length === 0) {
		throw new NodeOperationError(this.getNode(), 'Add at least one change to apply to the label', {
			itemIndex,
		});
	}

	const { columnId, kind, revision, labels } = await readLabelColumn.call(
		this,
		client,
		itemIndex,
		boardId,
	);

	if (!labels.some((label) => label.id === labelId)) {
		throw new NodeOperationError(
			this.getNode(),
			`Label with ID ${labelId} was not found on column "${columnId}"`,
			{ itemIndex },
		);
	}

	let rows = (
		kind === 'status' ? statusSettingsToInputRows(labels) : dropdownSettingsToInputRows(labels)
	).map((row) => {
		if (row.id !== labelId) return row;
		const updated = { ...row };
		if (typeof changes.newName === 'string' && changes.newName.trim() !== '') {
			updated.label = (changes.newName as string).trim();
		}
		if (changes.isDeactivated !== undefined) updated.is_deactivated = changes.isDeactivated;
		if (kind === 'status') {
			if (changes.color) updated.color = changes.color;
			if (changes.description !== undefined) updated.description = changes.description;
			if (changes.isDone !== undefined) updated.is_done = changes.isDone;
		}
		return updated;
	});

	if (kind === 'status' && changes.labelPosition) {
		const target = rows.find((row) => row.id === labelId) as IDataObject;
		const placed = placeStatusLabelRow(
			rows.filter((row) => row.id !== labelId),
			target,
			changes.labelPosition as StatusLabelPosition,
			changes.positionLabelId ? Number(changes.positionLabelId) : undefined,
		);
		if (placed === 'missing-anchor') {
			throw new NodeOperationError(
				this.getNode(),
				'Select the label this label should be moved before or after (Position: Relative To Label) — it must exist on the column and cannot be the moved label itself',
				{ itemIndex },
			);
		}
		rows = placed;
	}

	const data = await client.execute(LABEL_UPDATE_MUTATIONS[kind], itemIndex, {
		boardId,
		columnId,
		revision,
		labels: rows,
	});
	return (data.update_status_column ?? data.update_dropdown_column ?? {}) as IDataObject;
}

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
export async function createColumn(
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
