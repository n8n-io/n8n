import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

/**
 * Shapes the output row of an archive/delete mutation. monday echoes the
 * entity's state from BEFORE the change (`state: "active"`,
 * `archived: false`), so the state fields are set from the action taken —
 * a downstream IF on them must see the new state, like Odoo V2's
 * `{ id, deleted: true }`.
 */
export function withArchiveOrDeleteOutcome(
	payload: IDataObject,
	action: ArchiveOrDeleteAction,
	entity: 'item' | 'board' | 'group',
): IDataObject {
	if (entity === 'group') {
		return action === 'archive'
			? { ...payload, archived: true, action }
			: { ...payload, deleted: true, action };
	}
	return { ...payload, state: action === 'archive' ? 'archived' : 'deleted', action };
}

export type ArchiveOrDeleteAction = 'archive' | 'delete';

/**
 * Resolves the archive-vs-delete choice for the unified Archive or Delete
 * operations from the Action parameter (default: archive — the safe choice
 * by design).
 */
export function resolveArchiveOrDeleteAction(
	this: IExecuteFunctions,
	itemIndex: number,
): ArchiveOrDeleteAction {
	const action = this.getNodeParameter('archiveOrDeleteAction', itemIndex, 'archive') as string;
	return action === 'delete' ? 'delete' : 'archive';
}
