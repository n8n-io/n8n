import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { LIST_SIMPLIFY_SELECT } from '../../helpers/utils';
import { listRLC, untilSiteSelected } from '../../list';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequest } from '../../transport';
const properties = [
    {
        ...siteRLC,
        description: 'Select the site to retrieve lists from',
    },
    {
        ...listRLC,
        description: 'Select the list you want to retrieve',
        displayOptions: {
            hide: {
                ...untilSiteSelected,
            },
        },
    },
    {
        displayName: 'Simplify',
        name: 'simplify',
        type: 'boolean',
        default: true,
        description: 'Whether to return a simplified version of the response instead of the raw data',
    },
];
const displayOptions = {
    show: {
        resource: ['list'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i, siteIdCache) {
    // https://learn.microsoft.com/en-us/graph/api/list-get — {list-id} accepts the list ID or title
    const siteId = await resolveSiteId.call(this, i, siteIdCache);
    const listIdOrTitle = this.getNodeParameter('list', i, '', { extractValue: true }).trim();
    const simplify = this.getNodeParameter('simplify', i);
    // An empty segment would change the request shape (e.g. /lists/ returns the
    // whole collection) — fail loudly instead. The site field validates itself
    // inside resolveSiteId.
    if (listIdOrTitle === '') {
        throw new NodeOperationError(this.getNode(), "The 'List' parameter is empty", {
            description: 'Set the list ID or title and try again.',
        });
    }
    const qs = {};
    if (simplify) {
        qs.$select = LIST_SIMPLIFY_SELECT;
    }
    // Encode segments: site IDs contain commas, list titles contain spaces; encoding
    // also keeps user input from escaping its path segment under either credential.
    const response = await microsoftApiRequest.call(this, 'GET', `/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listIdOrTitle)}`, {}, qs);
    if (simplify) {
        // Match v1's simplifyListPostReceive exactly: only these two keys are stripped.
        delete response['@odata.context'];
        delete response['@odata.etag'];
    }
    return response;
}
//# sourceMappingURL=get.operation.js.map