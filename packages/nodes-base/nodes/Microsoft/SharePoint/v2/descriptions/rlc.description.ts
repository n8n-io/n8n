import type { INodeProperties } from 'n8n-workflow';

/** Hide gate copied from v1: the list field stays hidden until a site is chosen. */
export const untilSiteSelected = { site: [''] };

/** Hide gate: file fields stay hidden until a folder is chosen. */
export const untilFolderSelected = { folder: [''] };

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
