import type { IDataObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import type { Label, LabelColor } from '../../types';

/**
 * Gmail nests labels by embedding `/` in the label name (e.g. `Work/Projects`).
 * There is no parent ID field on the Labels API.
 */
export function composeNestedLabelName(name: string, parentName?: string): string {
	const trimmedName = name.trim();
	if (!trimmedName) {
		throw new UserError('Label name is required');
	}
	if (trimmedName.includes('/')) {
		throw new UserError(
			'Label name must not contain "/". Use the Parent Label option to nest labels instead.',
		);
	}

	// Tolerate "Parent/" or "/Parent/" from expressions; Gmail would treat the extra slash as an empty level.
	const trimmedParent = parentName?.trim().replace(/^\/+|\/+$/g, '');
	if (!trimmedParent) {
		return trimmedName;
	}

	return `${trimmedParent}/${trimmedName}`;
}

export function buildLabelCreateBody(options: {
	name: string;
	parentName?: string;
	labelListVisibility?: string;
	messageListVisibility?: string;
	color?: LabelColor;
}): IDataObject {
	const body: IDataObject = {
		name: composeNestedLabelName(options.name, options.parentName),
		labelListVisibility: options.labelListVisibility ?? 'labelShow',
		messageListVisibility: options.messageListVisibility ?? 'show',
	};

	if (options.color?.textColor && options.color?.backgroundColor) {
		body.color = {
			textColor: options.color.textColor,
			backgroundColor: options.color.backgroundColor,
		};
	}

	return body;
}

export function buildLabelUpdateBody(updateFields: IDataObject): IDataObject {
	const body: IDataObject = {};

	if (updateFields.name !== undefined && updateFields.name !== '') {
		body.name = (updateFields.name as string).trim();
	}

	if (updateFields.labelListVisibility) {
		body.labelListVisibility = updateFields.labelListVisibility;
	}

	if (updateFields.messageListVisibility) {
		body.messageListVisibility = updateFields.messageListVisibility;
	}

	const textColor = updateFields.textColor as string | undefined;
	const backgroundColor = updateFields.backgroundColor as string | undefined;
	if (textColor || backgroundColor) {
		if (!textColor || !backgroundColor) {
			throw new UserError(
				'Both Text Color and Background Color must be set together when updating label color',
			);
		}
		body.color = { textColor, backgroundColor };
	}

	if (Object.keys(body).length === 0) {
		throw new UserError('At least one update field must be set');
	}

	return body;
}

export function parseLabelHierarchy(label: Label): Label & {
	leafName: string;
	parentName: string | null;
	depth: number;
} {
	const parts = label.name.split('/');
	return {
		...label,
		leafName: parts[parts.length - 1] ?? label.name,
		parentName: parts.length > 1 ? parts.slice(0, -1).join('/') : null,
		depth: parts.length - 1,
	};
}

/**
 * Resolves `parentPath` against existing labels. Gmail stores `A/B/C` as a flat name
 * and won't create `A` or `A/B`, so a label under a missing parent would not appear
 * nested. Levels are matched case-insensitively and reuse the existing label's casing.
 *
 * @returns the parent path to use, and the levels to create first (outermost first)
 */
export function resolveParentLabels(
	existingNames: string[],
	parentPath: string,
): { parentPath: string; missing: string[] } {
	const existing = new Map(existingNames.map((name) => [name.toLowerCase(), name]));
	const parts = parentPath
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean);
	const missing: string[] = [];
	let resolved = '';
	for (const part of parts) {
		const candidate = resolved ? `${resolved}/${part}` : part;
		const match = existing.get(candidate.toLowerCase());
		resolved = match ?? candidate;
		if (!match) missing.push(resolved);
	}
	return { parentPath: resolved, missing };
}
