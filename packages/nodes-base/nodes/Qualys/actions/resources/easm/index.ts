/**
 * EASM endpoints.
 *
 * External attack surface discovery: profiles and unresolved domains.
 *
 * Everything here is data: which endpoint an operation calls, how its response
 * is shaped and which UI parameters it shows. The router reads these fields
 * rather than branching on the resource name, so adding an endpoint is an entry
 * in this table and nothing else.
 */
import { list, type ResourceDefinition } from '../definition';

export const easmResource: ResourceDefinition = {
	name: 'EASM',
	description: 'External attack surface discovery',
	operations: {
		listProfiles: list({
			name: 'List Profiles',
			action: 'List EASM profiles',
			description: 'Discovery profiles and their seeds',
			plane: 'gateway',
			endpoint: '/easm/v2/profile',
			recordPath: 'profile',
			// Pages on a zero-based pageNumber and answers 404 past the last page.
			emptyOn404: true,
		}),
		listUnresolvedDomains: list({
			name: 'List Unresolved Domains',
			action: 'List unresolved domains',
			description: 'Domains discovered but not yet resolved to assets',
			plane: 'csam',
			endpoint: '/rest/2.0/am/domain/list',
			method: 'POST',
			recordPath: 'domainListData.domains',
			cursor: { requestParam: 'lastFetchDomainId', responseField: 'lastFetchDomainId' },
			pageSize: { default: 100, max: 300 },
			filterShape: 'assetCriteria',
		}),
		countUnresolvedDomains: {
			name: 'Count Unresolved Domains',
			action: 'Count unresolved domains',
			description: 'How many unresolved domains match the filter',
			kind: 'count',
			plane: 'csam',
			endpoint: '/rest/2.0/am/domain/count',
			method: 'POST',
			filterShape: 'assetCriteria',
		},
	},
};
