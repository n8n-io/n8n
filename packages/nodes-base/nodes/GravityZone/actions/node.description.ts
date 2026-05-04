/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as accounts from './accounts';
import * as companies from './companies';
import * as general from './general';
import * as incidents from './incidents';
import * as integrations from './integrations';
import * as licensing from './licensing';
import * as maintenanceWindows from './maintenance_windows';
import * as network from './network';
import * as packages from './packages';
import * as patchManagement from './patch_management';
import * as phasr from './phasr';
import * as policies from './policies';
import * as push from './push';
import * as quarantine from './quarantine';
import * as reports from './reports';

export const description: INodeTypeDescription = {
	displayName: 'Bitdefender GravityZone',
	name: 'gravityZone',
	icon: 'file:gravityZone.svg',
	group: ['output'],
	version: 1,
	description: 'Consume the Bitdefender GravityZone API',
	subtitle: '={{$parameter["category"] + ": " + $parameter["action"]}}',
	defaults: {
		name: 'Bitdefender GravityZone',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'gravityZoneApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Category',
			name: 'category',
			type: 'options',
			noDataExpression: true,
			required: true,
			options: [
				{ name: 'Accounts', value: 'accounts' },
				{ name: 'Companies', value: 'companies' },
				{ name: 'General', value: 'general' },
				{ name: 'Incidents', value: 'incidents' },
				{ name: 'Integrations', value: 'integrations' },
				{ name: 'Licensing', value: 'licensing' },
				{ name: 'Maintenance Windows', value: 'maintenance_windows' },
				{ name: 'Network', value: 'network' },
				{ name: 'Packages', value: 'packages' },
				{ name: 'Patch Management', value: 'patch_management' },
				{ name: 'PHASR', value: 'phasr' },
				{ name: 'Policies', value: 'policies' },
				{ name: 'Push', value: 'push' },
				{ name: 'Quarantine', value: 'quarantine' },
				{ name: 'Reports', value: 'reports' },
			],
			default: 'general',
		},
		...accounts.description,
		...companies.description,
		...general.description,
		...incidents.description,
		...integrations.description,
		...licensing.description,
		...maintenanceWindows.description,
		...network.description,
		...packages.description,
		...patchManagement.description,
		...phasr.description,
		...policies.description,
		...push.description,
		...quarantine.description,
		...reports.description,
	],
};
