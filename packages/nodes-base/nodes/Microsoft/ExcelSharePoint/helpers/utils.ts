import type { IExecuteFunctions, INode, INodeParameterResourceLocator } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { microsoftApiRequest } from '../transport';

// One lookup per distinct pasted address per execution — without this, a
// multi-item run repeats the same resolution call and risks throttling
const workbookRootCache = new WeakMap<IExecuteFunctions, Map<string, string>>();

/**
 * Guards a user-supplied value destined for a URL path segment: rejects empty
 * values and dots-only values ('..' survives encodeURIComponent and would
 * retarget the request path). Returns the trimmed value.
 */
export function validatePathSegment(node: INode, label: string, value: string): string {
	const trimmed = String(value ?? '').trim();
	if (trimmed === '') {
		throw new NodeOperationError(node, `The '${label}' parameter is empty`, {
			description: 'Set the value and try again.',
		});
	}
	if (/^\.+$/.test(trimmed)) {
		throw new NodeOperationError(node, `The '${label}' value is not valid`, {
			description: 'A value cannot consist only of dots.',
		});
	}
	return trimmed;
}

/**
 * Resolves the workbook fields to the Graph root every request hangs off:
 * `/v1.0/sites/{site}/drives/{drive}/items/{item}`. A pasted address costs one
 * lookup (Graph's sharing-URL exchange); IDs are used as given.
 */
export async function resolveWorkbookRoot(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<string> {
	const workbook = this.getNodeParameter('workbook', itemIndex) as INodeParameterResourceLocator;
	const workbookValue = String(workbook.value ?? '').trim();

	if (workbook.mode === 'url') {
		if (workbookValue === '') {
			throw new NodeOperationError(this.getNode(), "The 'Workbook' parameter is empty", {
				description: "Paste the workbook's address, or switch to choosing it by ID.",
			});
		}

		let cache = workbookRootCache.get(this);
		if (!cache) {
			cache = new Map();
			workbookRootCache.set(this, cache);
		}
		const cached = cache.get(workbookValue);
		if (cached !== undefined) {
			return cached;
		}

		// Graph's sharing-URL exchange: 'u!' + unpadded URL-safe base64 of the address
		const shareId = `u!${Buffer.from(workbookValue)
			.toString('base64')
			.replace(/=+$/, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')}`;
		const driveItem = await microsoftApiRequest.call(
			this,
			'GET',
			`/v1.0/shares/${shareId}/driveItem`,
			{},
			{ $select: 'id,parentReference' },
		);
		const itemId = String(driveItem.id ?? '');
		const parent = driveItem.parentReference as { siteId?: string; driveId?: string } | undefined;
		if (itemId === '' || !parent?.siteId || !parent.driveId) {
			throw new NodeOperationError(this.getNode(), 'The workbook address could not be resolved', {
				description: 'Check the pasted address points at a workbook in a SharePoint library.',
			});
		}

		const root = `/v1.0/sites/${encodeURIComponent(parent.siteId)}/drives/${encodeURIComponent(parent.driveId)}/items/${encodeURIComponent(itemId)}`;
		cache.set(workbookValue, root);
		return root;
	}

	const node = this.getNode();
	const siteId = validatePathSegment(
		node,
		'Site',
		String((this.getNodeParameter('site', itemIndex) as INodeParameterResourceLocator).value ?? ''),
	);
	const driveId = validatePathSegment(
		node,
		'Library',
		String(
			(this.getNodeParameter('library', itemIndex) as INodeParameterResourceLocator).value ?? '',
		),
	);
	const itemId = validatePathSegment(node, 'Workbook', workbookValue);

	return `/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`;
}
