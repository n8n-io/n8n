import type { INodeProperties } from 'n8n-workflow';

import * as getPoliciesList from './getPoliciesList.operation';
import * as getPolicyDetails from './getPolicyDetails.operation';
import * as setPolicyModulesState from './setPolicyModulesState.operation';

export { getPoliciesList, getPolicyDetails, setPolicyModulesState };

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { category: ['policies'] } },
		options: [
			{
				name: 'Get Policies List',
				value: 'getPoliciesList',
				action: 'Get list of policies',
			},
			{
				name: 'Get Policy Details',
				value: 'getPolicyDetails',
				action: 'Get details of a specific policy',
			},
			{
				name: 'Set Policy Modules State',
				value: 'setPolicyModulesState',
				action: 'Enable or disable settings for a policy',
			},
		],
		default: 'getPoliciesList',
	},
	...getPoliciesList.description,
	...getPolicyDetails.description,
	...setPolicyModulesState.description,
];
