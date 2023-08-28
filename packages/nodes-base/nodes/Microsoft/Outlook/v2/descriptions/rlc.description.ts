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

export const draftRLC: INodeProperties = {
	displayName: 'Draft',
	name: 'draftId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a draft...',
			typeOptions: {
				searchListMethod: 'searchDrafts',
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

export const messageRLC: INodeProperties = {
	displayName: 'Message',
	name: 'messageId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a message...',
			typeOptions: {
				searchListMethod: 'searchMessages',
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

export const eventRLC: INodeProperties = {
	displayName: 'Event',
	name: 'eventId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	typeOptions: {
		loadOptionsDependsOn: ['calendarId.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a event...',
			typeOptions: {
				searchListMethod: 'searchEvents',
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

export const folderRLC: INodeProperties = {
	displayName: 'Folder',
	name: 'folderId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a folder...',
			typeOptions: {
				searchListMethod: 'searchFolders',
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
