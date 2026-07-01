// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Single registry of every record-level operation the node supports. Adding a
 * new operation = create a module under this folder and append it here.
 */

import type { OperationDefinition } from './types';
import { createRow } from './createRow';
import { getRow } from './getRow';
import { listRows } from './listRows';
import { updateRow } from './updateRow';
import { upsertRow } from './upsertRow';
import { deleteRow } from './deleteRow';

export { toDropdownOption } from './types';

/** Display order matches the dv connector's action order in the editor. */
export const RECORD_OPERATIONS: OperationDefinition[] = [
	createRow,
	getRow,
	listRows,
	updateRow,
	upsertRow,
	deleteRow,
];

export const OPERATION_BY_VALUE: Record<string, OperationDefinition> = RECORD_OPERATIONS.reduce(
	(acc, op) => {
		acc[op.value] = op;
		return acc;
	},
	{} as Record<string, OperationDefinition>,
);

/**
 * Backwards-compat alias map — keys are deprecated operation values that
 * existing workflows may still hold; values are the current op id.
 *
 *   `query` → `list`   (renamed for dv-connector parity)
 */
export const OPERATION_ALIASES: Record<string, string> = {
	query: 'list',
};

export function resolveOperation(value: string): OperationDefinition | undefined {
	return OPERATION_BY_VALUE[value] ?? OPERATION_BY_VALUE[OPERATION_ALIASES[value] ?? ''];
}
