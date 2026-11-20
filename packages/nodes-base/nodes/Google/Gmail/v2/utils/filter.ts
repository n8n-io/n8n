import type { IDataObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

/** System label IDs that may appear in filter actions alongside at most one user label. */
export const GMAIL_SYSTEM_LABEL_IDS = new Set([
	'INBOX',
	'UNREAD',
	'STARRED',
	'IMPORTANT',
	'SENT',
	'DRAFT',
	'SPAM',
	'TRASH',
	'CHAT',
	'CATEGORY_PERSONAL',
	'CATEGORY_SOCIAL',
	'CATEGORY_PROMOTIONS',
	'CATEGORY_UPDATES',
	'CATEGORY_FORUMS',
]);

export function isSystemLabelId(labelId: string): boolean {
	return GMAIL_SYSTEM_LABEL_IDS.has(labelId);
}

/**
 * Gmail allows at most one user-defined label in `action.addLabelIds`.
 * System labels (INBOX, STARRED, etc.) do not count toward that limit.
 */
export function assertSingleUserLabel(
	addLabelIds: string[] | undefined,
): asserts addLabelIds is string[] | undefined {
	if (!addLabelIds?.length) {
		return;
	}

	const userLabels = addLabelIds.filter((id) => !isSystemLabelId(id));
	if (userLabels.length > 1) {
		throw new UserError(
			'Gmail filters allow at most one user-defined label in Add Labels. Remove extra user labels or create separate filters.',
		);
	}
}

export function buildFilterCriteria(criteria: IDataObject): IDataObject {
	const body: IDataObject = {};

	if (criteria.from) {
		body.from = criteria.from;
	}
	if (criteria.to) {
		body.to = criteria.to;
	}
	if (criteria.subject) {
		body.subject = criteria.subject;
	}
	if (criteria.query) {
		body.query = criteria.query;
	}
	if (criteria.negatedQuery) {
		body.negatedQuery = criteria.negatedQuery;
	}
	// Gmail drops `false` for these when storing a filter, so only send `true`;
	// otherwise an unchanged filter would not compare equal on replace.
	if (criteria.hasAttachment === true) {
		body.hasAttachment = true;
	}
	if (criteria.excludeChats === true) {
		body.excludeChats = true;
	}
	if (criteria.size !== undefined && criteria.size !== '') {
		body.size = Number(criteria.size);
	}
	if (criteria.sizeComparison) {
		body.sizeComparison = criteria.sizeComparison;
	}

	return body;
}

export function buildFilterAction(action: IDataObject): IDataObject {
	const body: IDataObject = {};

	const addLabelIds = action.addLabelIds as string[] | undefined;
	assertSingleUserLabel(addLabelIds);
	if (addLabelIds?.length) {
		body.addLabelIds = addLabelIds;
	}

	const removeLabelIds = action.removeLabelIds as string[] | undefined;
	if (removeLabelIds?.length) {
		body.removeLabelIds = removeLabelIds;
	}

	if (action.forward) {
		body.forward = action.forward;
	}

	return body;
}

export function buildFilterBody(criteria: IDataObject, action: IDataObject): IDataObject {
	const criteriaBody = buildFilterCriteria(criteria);
	const actionBody = buildFilterAction(action);

	if (Object.keys(criteriaBody).length === 0) {
		throw new UserError('At least one filter criterion must be set');
	}

	if (Object.keys(actionBody).length === 0) {
		throw new UserError('At least one filter action must be set');
	}

	return {
		criteria: criteriaBody,
		action: actionBody,
	};
}

function normalizeForComparison(value: unknown): unknown {
	if (Array.isArray(value)) return [...value].map(normalizeForComparison).sort();
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				// Gmail omits `false` booleans, so treat them like unset fields.
				.filter(([, entry]) => entry !== undefined && entry !== false)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([key, entry]) => [key, normalizeForComparison(entry)]),
		);
	}
	return value;
}

/** Whether an existing filter already has exactly the criteria and actions in `body`. */
export function filterMatchesBody(existing: IDataObject, body: IDataObject): boolean {
	return (
		JSON.stringify(
			normalizeForComparison({ criteria: existing.criteria, action: existing.action }),
		) === JSON.stringify(normalizeForComparison({ criteria: body.criteria, action: body.action }))
	);
}
