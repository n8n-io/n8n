/**
 * IT Asset endpoints.
 *
 * CyberSecurity Asset Management: the IT asset inventory and installed software.
 *
 * Everything here is data: which endpoint an operation calls, how its response
 * is shaped and which UI parameters it shows. The router reads these fields
 * rather than branching on the resource name, so adding an endpoint is an entry
 * in this table and nothing else.
 */
import { list, type ResourceDefinition } from '../definition';

export const itAssetResource: ResourceDefinition = {
	name: 'IT Asset',
	description: 'IT asset inventory from CyberSecurity Asset Management',
	operations: {
		listAssets: list({
			name: 'List Assets',
			action: 'List IT assets',
			description: 'Assets matching the filter',
			plane: 'csam',
			endpoint: '/rest/2.0/search/am/asset',
			method: 'POST',
			recordPath: 'assetListData.asset',
			cursor: { requestParam: 'lastSeenAssetId', responseField: 'lastSeenAssetId' },
			pageSize: { default: 100, max: 300 },
			filterShape: 'assetCriteria',
		}),
		getAsset: {
			name: 'Get Asset',
			action: 'Get an IT asset',
			description: 'One asset by ID',
			kind: 'get',
			plane: 'csam',
			endpoint: '/rest/2.0/get/am/asset',
			method: 'GET',
			recordPath: 'assetListData.asset',
		},
		countAssets: {
			name: 'Count Assets',
			action: 'Count IT assets',
			description: 'How many assets match the filter',
			kind: 'count',
			plane: 'csam',
			endpoint: '/rest/2.0/count/am/asset',
			method: 'POST',
			filterShape: 'assetCriteria',
		},
		listComponents: list({
			name: 'List Software Components',
			action: 'List software components',
			description: 'Components found across assets by software composition analysis',
			plane: 'csam',
			endpoint: '/rest/2.0/am/asset/component',
			method: 'POST',
			recordPath: 'assetComponentsList',
			// Note the asymmetry: the request takes lastSeenAssetComponentId, the
			// response reports lastAssetComponentId.
			cursor: { requestParam: 'lastSeenAssetComponentId', responseField: 'lastAssetComponentId' },
			pageSize: { default: 500, max: 1000 },
			filterShape: 'componentFilter',
		}),
		getComponents: {
			name: 'Get Software Components',
			action: 'Get software components of an asset',
			description: 'Components on one asset',
			kind: 'get',
			plane: 'csam',
			endpoint: '/rest/2.0/am/asset/component/{assetId}',
			method: 'POST',
			recordPath: 'assetComponentsList',
			pageSize: { default: 500, max: 1000 },
			idInPath: true,
		},
	},
};
