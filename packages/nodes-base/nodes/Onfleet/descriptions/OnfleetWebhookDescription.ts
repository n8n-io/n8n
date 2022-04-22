import {
	INodeProperties
} from 'n8n-workflow';

import {
	webhookMapping,
} from '../WebhookMapping';

const sort = (a: { name: string }, b: { name: string }) => {
	if (a.name < b.name) { return -1; }
	if (a.name > b.name) { return 1; }
	return 0;
};

export const eventDisplay: INodeProperties = {
	displayName: 'Trigger On',
	name: 'triggerOn',
	type: 'options',
	options: Object.keys(webhookMapping).map((webhook) => {
		const { name, value } = webhookMapping[webhook];
		return { name, value };
	}).sort(sort),
	required: true,
	// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-options
	default: [],
};

export const eventNameField = {
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	options: [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			required: false,
			default: '',
			description: 'A name for the webhook for identification',
		},
	],
} as INodeProperties;
