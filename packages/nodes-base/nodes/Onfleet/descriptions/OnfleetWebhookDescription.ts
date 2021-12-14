import {
	INodeProperties
} from 'n8n-workflow';
import { webhookMapping } from '../WebhookMapping';

export const eventDisplay: INodeProperties = {
	displayName: 'Event',
	name: 'event',
	type: 'options',
	options: Object.keys(webhookMapping).map((webhook) => {
		const {name, value} = webhookMapping[webhook];
		return {name, value};
	}),
	required: true,
	default: [],
	description: 'The event to listen to.',
};
