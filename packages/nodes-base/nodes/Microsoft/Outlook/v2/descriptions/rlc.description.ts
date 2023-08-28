import type { INodeProperties } from 'n8n-workflow';

export const calendarRLC: INodeProperties = {
	displayName: 'Calendar',
	name: 'calendarId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a calendar...',
			typeOptions: {
				searchListMethod: 'searchCalendars',
				searchable: false,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. AAAkAAAhAAA0BBc5LLLwOOOtNNNkZS05Nz...',
		},
	],
};

export const contactRLC: INodeProperties = {
	displayName: 'Contact',
	name: 'contactId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a contact...',
			typeOptions: {
				searchListMethod: 'searchContacts',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. AAAkAAAhAAA0BBc5LLLwOOOtNNNkZS05Nz...',
		},
	],
};
