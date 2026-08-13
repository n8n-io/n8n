import type { INodeProperties } from 'n8n-workflow';

export const FILE_ID_FIELD = 'fileId';

export const FILE_RESOURCE_LOCATOR_BASE = {
	displayName: 'File',
	name: FILE_ID_FIELD,
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	builderHint: {
		propertyHint:
			"Prefer mode: 'name' with the exact file name — replaced files keep resolving by name",
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'fileSearch',
				searchable: true,
			},
		},
		{
			displayName: 'By Name',
			name: 'name',
			type: 'string',
			placeholder: 'e.g. pricing.csv',
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. h2JN8ynwSNJdSuGr',
		},
	],
} satisfies INodeProperties;
