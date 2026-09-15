import type {
	FieldType,
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import { BULK_IMPORT_SUPPORTED_COLUMN_TYPES } from './bulkImport';
import { READ_ONLY_COLUMN_TYPES } from './columnValueMappers';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

export interface ColumnRow {
	id: string;
	title: string;
	type: string;
	settings_str?: string;
	/** Rollup metadata — non-null calculated marks a rollup-capable column (multi-level boards). */
	capabilities?: { calculated?: { function?: string } | null } | null;
}

const COLUMNS_QUERY = `query ($ids: [ID!]) {
	boards(ids: $ids) {
		columns { id title type settings_str capabilities { calculated { function } } }
	}
}`;

export async function fetchColumns(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	boardId: string,
	itemIndex = 0,
): Promise<ColumnRow[]> {
	const client = new MondayGraphQLClient(context);
	const data = await client.execute(COLUMNS_QUERY, itemIndex, { ids: [boardId] });
	const boards = (data.boards ?? []) as Array<{ columns?: ColumnRow[] }>;
	return boards[0]?.columns ?? [];
}

/** Returns a columnId -> monday column type index for the given board. */
export async function fetchColumnTypes(
	context: IExecuteFunctions,
	boardId: string,
	itemIndex: number,
): Promise<Record<string, string>> {
	const columns = await fetchColumns(context, boardId, itemIndex);
	return Object.fromEntries(columns.map((column) => [column.id, column.type]));
}

/**
 * Resolves the subitem board of a parent board via its subtasks column
 * (settings_str.boardIds). Returns undefined when the board has no subitems
 * board yet — create_subitem still works there (monday creates the subitem
 * board on first use), but there are no columns to map.
 */
export async function resolveSubitemBoardId(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	parentBoardId: string,
	itemIndex = 0,
): Promise<string | undefined> {
	const columns = await fetchColumns(context, parentBoardId, itemIndex);
	const subtasksColumn = columns.find((column) => column.type === 'subtasks');
	if (!subtasksColumn?.settings_str) return undefined;
	try {
		const settings = JSON.parse(subtasksColumn.settings_str) as { boardIds?: number[] };
		const boardId = settings.boardIds?.[0];
		return boardId !== undefined ? String(boardId) : undefined;
	} catch {
		return undefined;
	}
}

/** Status labels live in settings_str as {"labels": {"0": "Done", ...}}. */
function parseStatusLabels(settingsStr?: string): INodePropertyOptions[] {
	if (!settingsStr) return [];
	try {
		const settings = JSON.parse(settingsStr) as { labels?: Record<string, string> | unknown[] };
		const labels = settings.labels;
		if (Array.isArray(labels)) {
			// dropdown-style settings: [{id, name}]
			return (labels as Array<{ id: number | string; name: string }>)
				.filter((label) => label.name)
				.map((label) => ({ name: label.name, value: label.name }));
		}
		if (labels && typeof labels === 'object') {
			return Object.values(labels)
				.filter((label): label is string => typeof label === 'string' && label !== '')
				.map((label) => ({ name: label, value: label }));
		}
	} catch {
		// Malformed settings — fall back to a free-text field.
	}
	return [];
}

/** How each writable monday column type renders in the mapping UI. */
const FIELD_TYPES: Record<string, FieldType> = {
	board_relation: 'string',
	checkbox: 'boolean',
	country: 'string',
	date: 'dateTime',
	dependency: 'string',
	dropdown: 'string',
	email: 'string',
	hour: 'string',
	link: 'url',
	location: 'string',
	long_text: 'string',
	numbers: 'number',
	people: 'string',
	phone: 'string',
	rating: 'number',
	tags: 'string',
	text: 'string',
	timeline: 'string',
	week: 'string',
};

/** Input-format hints appended to the field label for compound types. */
const FORMAT_HINTS: Record<string, string> = {
	board_relation: 'item IDs, comma-separated',
	country: 'ISO-2 code, e.g. US',
	dependency: 'item IDs, comma-separated',
	dropdown: 'labels, comma-separated',
	email: 'email, then optional display text',
	hour: 'HH:MM',
	link: 'URL, then optional display text',
	location: 'lat,lng,address',
	people: 'user IDs; prefix teams with team:',
	phone: 'number, then optional ISO-2 country',
	tags: 'tag IDs, comma-separated',
	timeline: 'YYYY-MM-DD/YYYY-MM-DD',
	week: 'YYYY-MM-DD/YYYY-MM-DD',
};

/** Whether the unified Create operation is in Subitem mode. */
function isCreateSubitemMode(context: ILoadOptionsFunctions): boolean {
	try {
		return context.getCurrentNodeParameter('createAs') === 'subitem';
	} catch {
		// Legacy saved workflows have no createAs parameter at all.
		return false;
	}
}

/**
 * resourceMapper schema for the column-value builder: one field per writable
 * column on the selected board. On Create the name column is excluded (the
 * item name is create_item's dedicated item_name argument); on Update it is
 * included so the builder covers renames via column_values {"name": ...}.
 */
export async function getColumnFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	let boardId = this.getCurrentNodeParameter('boardId', { extractValue: true }) as string;
	if (!boardId) {
		return { fields: [] };
	}

	const operation = this.getCurrentNodeParameter('operation') as string;
	const includeName = operation === 'updateItem';

	// On classic boards, subitems live on their own board — map ITS columns,
	// not the parent's. On multi-level boards the subtasks column points at
	// the board itself (all depths share one schema), so this resolves to
	// the same board. 'createSubitem' is the legacy operation value from
	// before Create absorbed it.
	if (operation === 'createSubitem' || isCreateSubitemMode(this)) {
		const subitemBoardId = await resolveSubitemBoardId(this, boardId);
		if (!subitemBoardId) {
			return {
				fields: [],
				emptyFieldsNotice:
					'This board has no subitems yet, so there are no subitem columns to map. Create the first subitem without column values (or use Raw JSON).',
			};
		}
		boardId = subitemBoardId;
	}

	const columns = await fetchColumns(this, boardId);
	const fields: ResourceMapperField[] = [];

	for (const column of columns) {
		if (column.type === 'name' && !includeName) continue;
		if (READ_ONLY_COLUMN_TYPES.has(column.type)) continue;

		const statusOptions = column.type === 'status' ? parseStatusLabels(column.settings_str) : [];
		const hint = FORMAT_HINTS[column.type];

		fields.push({
			id: column.id,
			displayName: hint ? `${column.title} (${hint})` : column.title,
			type: statusOptions.length > 0 ? 'options' : (FIELD_TYPES[column.type] ?? 'string'),
			options: statusOptions.length > 0 ? statusOptions : undefined,
			required: false,
			defaultMatch: false,
			canBeUsedToMatch: false,
			display: true,
		});
	}

	return {
		fields,
		emptyFieldsNotice: 'This board has no writable columns besides the item name.',
	};
}

/**
 * Bulk import CSV cells use display-text formats (status label text, ISO
 * date, `lat|lng|address`), NOT the column_values JSON the regular mapper
 * hints at — so the bulk mapper carries its own format hints.
 */
const BULK_FORMAT_HINTS: Record<string, string> = {
	board_relation: 'item IDs or exact names, comma-separated',
	date: 'YYYY-MM-DD',
	dropdown: 'existing labels, comma-separated',
	email: 'email, or Name <email>',
	link: 'URL, or [Display Text](URL)',
	location: 'lat|lng|address',
	people: 'emails, user:<ID>, team:<ID>, comma-separated',
	phone: 'phone number',
	timeline: 'YYYY-MM-DD/YYYY-MM-DD',
};

/** Field renderings for the bulk import mapper (everything else is string). */
const BULK_FIELD_TYPES: Record<string, FieldType> = {
	checkbox: 'boolean',
	date: 'dateTime',
	numbers: 'number',
};

/**
 * resourceMapper schema for Item: Bulk Import — the Name column (required,
 * every CSV row needs a name) plus every column whose type bulk import
 * supports. Values compile to CSV cells, not column_values JSON.
 */
export async function getBulkImportColumnFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const boardId = this.getCurrentNodeParameter('boardId', { extractValue: true }) as string;
	if (!boardId) {
		return { fields: [] };
	}

	const columns = await fetchColumns(this, boardId);
	const fields: ResourceMapperField[] = [];

	for (const column of columns) {
		if (column.type === 'name') {
			fields.push({
				id: 'name',
				displayName: 'Name',
				type: 'string',
				required: true,
				defaultMatch: false,
				canBeUsedToMatch: false,
				display: true,
			});
			continue;
		}
		if (!BULK_IMPORT_SUPPORTED_COLUMN_TYPES.has(column.type)) continue;

		const statusOptions = column.type === 'status' ? parseStatusLabels(column.settings_str) : [];
		const hint = BULK_FORMAT_HINTS[column.type];

		fields.push({
			id: column.id,
			displayName: hint ? `${column.title} (${hint})` : column.title,
			type: statusOptions.length > 0 ? 'options' : (BULK_FIELD_TYPES[column.type] ?? 'string'),
			options: statusOptions.length > 0 ? statusOptions : undefined,
			required: false,
			defaultMatch: false,
			canBeUsedToMatch: false,
			display: true,
		});
	}

	return {
		fields,
		emptyFieldsNotice: 'This board has no columns that bulk import supports.',
	};
}

/**
 * Extracts the mapped values from a resourceMapper parameter value at
 * execute time, dropping unset entries.
 */
export function extractMappedValues(parameterValue: unknown): Record<string, unknown> {
	const value = (parameterValue as { value?: IDataObject | null })?.value;
	if (!value) return {};
	return Object.fromEntries(
		Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null),
	);
}
