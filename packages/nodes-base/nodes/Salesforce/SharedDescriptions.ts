import type { INodeProperties } from 'n8n-workflow';

/**
 * Builds the Account resourceLocator field shared by the Contact and Opportunity
 * resources. Backed by the `searchAccounts` listSearch method, which pages
 * through Accounts server-side so large orgs stay responsive.
 */
export function accountResourceLocator(name: string, description: string): INodeProperties {
	return {
		displayName: 'Account',
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select an account...',
				typeOptions: {
					searchListMethod: 'searchAccounts',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '0011700000QABCDE',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[a-zA-Z0-9]{15,18}$',
							errorMessage: 'Account ID must be 15 or 18 alphanumeric characters',
						},
					},
				],
			},
		],
	};
}
