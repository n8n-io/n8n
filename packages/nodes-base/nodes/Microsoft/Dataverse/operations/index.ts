/**
 * Single registry of every record-level operation the node supports. Adding a
 * new operation = create a module under this folder and append it here.
 */

import type { OperationDefinition } from './types';
import { createRow } from './createRow';
import { getRow } from './getRow';
import { getManyRows } from './getManyRows';
import { updateRow } from './updateRow';
import { upsertRow } from './upsertRow';
import { deleteRow } from './deleteRow';

export { toDropdownOption } from './types';

/** Display order is alphabetical by name, matching the n8n catalog convention. */
export const RECORD_OPERATIONS: OperationDefinition[] = [
	createRow,
	upsertRow,
	deleteRow,
	getRow,
	getManyRows,
	updateRow,
];

export const OPERATION_BY_VALUE: Record<string, OperationDefinition> = RECORD_OPERATIONS.reduce(
	(acc, op) => {
		acc[op.value] = op;
		return acc;
	},
	{} as Record<string, OperationDefinition>,
);

export function resolveOperation(value: string): OperationDefinition | undefined {
	return OPERATION_BY_VALUE[value];
}
