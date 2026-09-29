import type { INodeListSearchResult } from 'n8n-workflow';

import { type GraphSearchReply } from '../helpers/utils';
import { resolveSiteId } from '../site';
import { microsoftApiRequest, type SharePointContext } from '../transport';

type SharePointDrive = { id?: string; name?: string; system?: object };
type DriveSearchReply = GraphSearchReply<SharePointDrive>;

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
