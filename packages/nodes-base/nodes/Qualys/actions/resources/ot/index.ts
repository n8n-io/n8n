/**
 * OT endpoints.
 *
 * VMDR OT: assets, vulnerabilities and project files discovered on the OT network.
 *
 * Everything here is data: which endpoint an operation calls, how its response
 * is shaped and which UI parameters it shows. The router reads these fields
 * rather than branching on the resource name, so adding an endpoint is an entry
 * in this table and nothing else.
 */
import { list, type ResourceDefinition } from '../definition';

export const otResource: ResourceDefinition = {
	name: 'OT',
	description: 'Operational technology inventory from VMDR OT',
	operations: {
		listHostAssets: list({
			name: 'List Host Assets',
			action: 'List OT host assets',
			description: 'Assets discovered on the OT network',
			plane: 'ot',
			endpoint: '/ot/1.0/host/list',
			recordPath: 'assets',
		}),
		listOtVulnerabilities: list({
			name: 'List Vulnerabilities',
			action: 'List OT vulnerabilities',
			description: 'Vulnerabilities detected on OT assets',
			plane: 'ot',
			endpoint: '/ot/1.0/detection/list',
			recordPath: 'vulnerabilities',
		}),
		listProjectFiles: list({
			name: 'List Project Files',
			action: 'List OT project files',
			description: 'Engineering project files found on OT assets',
			plane: 'ot',
			endpoint: '/ot/1.0/projectfile/list',
			emptyOn404: true,
		}),
	},
};
