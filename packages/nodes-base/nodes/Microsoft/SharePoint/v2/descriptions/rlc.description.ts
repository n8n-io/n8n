import type { INodeProperties } from 'n8n-workflow';

/** Hide gate copied from v1: the list field stays hidden until a site is chosen. */
export const untilSiteSelected = { site: [''] };

export const siteRLC: INodeProperties = {
	displayName: 'Site',
	name: 'site',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'id', value: '' },
	description: 'The SharePoint site to operate on',
	// The site-selection follow-up prepends a searchable mode to these same
	// modes and takes over URL resolution — keep site logic out of the operations.
	modes: [
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. contoso.sharepoint.com,5a58bb09-…,9f0d…',
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://contoso.sharepoint.com/sites/mysite',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https://.+',
						errorMessage: 'The URL must start with https://',
					},
				},
			],
		},
	],
};

export const listRLC: INodeProperties = {
	displayName: 'List',
	name: 'list',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'id', value: '' },
	description: 'The list to operate on. You can use the list title in place of the ID.',
	// The list-search follow-up prepends a searchable mode to this same field.
	modes: [
		{
			displayName: 'By ID or Title',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 58a279af-1f06-4392-a5ed-2b37fa1d6c1d or My List',
		},
	],
};
