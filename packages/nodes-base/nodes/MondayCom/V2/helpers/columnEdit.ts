import { type IDataObject, type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import type { MondayGraphQLClient } from '../transport/MondayGraphQLClient';
import type { ExistingLabel } from './columnDefaults';
import { validateRollupFunction } from './multiLevel';

/** The GraphQL for one full-label-set write, per column kind. */
export const LABEL_UPDATE_MUTATIONS: Record<string, string> = {
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
export async function readLabelColumn(
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
 * Fetches the type, current revision (required by the update mutations for
 * optimistic concurrency), and typed settings of one column, in one call.
 */
export async function fetchColumnForEdit(
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
