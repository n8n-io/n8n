import type { INodeListSearchResult, INodeParameterResourceLocator } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { type GraphSearchReply } from '../helpers/utils';
import { resolveSiteId } from '../site';
import { microsoftApiRequest, type SharePointContext } from '../transport';

type SharePointDrive = { id?: string; name?: string; system?: object };
type DriveSearchReply = GraphSearchReply<SharePointDrive>;

const GUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
// Rejects a bare GUID, which is a list ID: the one value likely to land in this
// field by mistake. Nothing further is asserted about a drive ID, because
// rejecting a legitimate one is the worse failure.
export const DRIVE_ID_REGEX = `^(?!${GUID}$)\\S+$`;
const DRIVE_ID_PATTERN = new RegExp(DRIVE_ID_REGEX);

export const DRIVE_ID_HINT =
	"That looks like a list ID. This field needs the library's drive ID, which the picker supplies.";

/**
 * Searches a site's document libraries. Each library is one drive, and a
 * drive id is what the file change feed is addressed by.
 *
 * Graph hides system-faceted drives unless `system` is selected, so it is
 * selected here to drop them deliberately rather than by omission.
 */
export async function getDrives(
	this: SharePointContext,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const siteId = await resolveSiteId.call(this, 0);

	const response = (
		paginationToken
			? await microsoftApiRequest.call(this, 'GET', '', {}, {}, paginationToken)
			: await microsoftApiRequest.call(
					this,
					'GET',
					`/v1.0/sites/${encodeURIComponent(siteId)}/drives`,
					{},
					{ $select: 'id,name,system' },
				)
	) as DriveSearchReply;

	const filterLower = filter?.toLowerCase();
	const results = (response.value ?? [])
		.filter(
			(drive) =>
				drive.id &&
				drive.system === undefined &&
				(!filterLower || (drive.name ?? '').toLowerCase().includes(filterLower)),
		)
		.map((drive) => ({ name: drive.name ?? String(drive.id), value: String(drive.id) }));

	return { results, paginationToken: response['@odata.nextLink'] };
}

/** Resolves the `drive` field to a Graph drive ID, re-checking a typed value. */
export async function resolveDriveId(this: SharePointContext, itemIndex: number): Promise<string> {
	const drive = this.getNodeParameter('drive', itemIndex) as INodeParameterResourceLocator;
	const value = String(drive.value ?? '').trim();

	if (value === '') {
		throw new NodeOperationError(this.getNode(), "The 'Document Library' parameter is empty", {
			description: 'Choose a library from the list and try again.',
		});
	}
	// The field's typed validation doesn't run for expression-provided values,
	// so ID mode re-checks here; list-mode values come from Graph's own search.
	if (drive.mode === 'id' && !DRIVE_ID_PATTERN.test(value)) {
		throw new NodeOperationError(this.getNode(), "The 'Document Library' ID is not valid", {
			description: DRIVE_ID_HINT,
		});
	}
	return value;
}
