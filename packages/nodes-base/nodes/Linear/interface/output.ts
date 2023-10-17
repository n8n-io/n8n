import type { INodeTypeDataInterface } from 'n8n-workflow';

export const issueGenericOutputInterface: INodeTypeDataInterface = {
	id: "={{ generate('uuid') }}",
	title: "={{ generate('title') }}",
	priority: "={{ generate('number') }}",
	archivedAt: null,
	assignee: null,
	state: {
		id: "={{ generate('uuid') }}",
		name: "={{ generate('word') }}",
	},
	createdAt: "={{ generate('datetime') }}",
	creator: {
		id: "={{ generate('uuid') }}",
		displayName: "={{ generate('username') }}",
	},
	description: "={{ generate('paragraph') }}",
	dueDate: null,
	cycle: null,
};

export const issueDeleteOutputInterface: INodeTypeDataInterface = {
	success: 'true',
};

export const issueTriggerOutputInterface: INodeTypeDataInterface = {
	action: 'create',
	type: '={{resources[0]}}',
	createdAt: "={{ generate('datetime') }}",
	data: issueGenericOutputInterface,
	url: "={{ generate('url') }}",
	updatedFrom: {},
	webhookTimestamp: "={{ generate('timestamp') }}",
	webhookId: "={{ generate('uuid') }}",
};
