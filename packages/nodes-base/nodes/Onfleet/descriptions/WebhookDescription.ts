import {
	INodeProperties
} from 'n8n-workflow';
import { webhookMapping } from '../WebhookMapping';

export const webhookOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [ 'webhooks' ],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet webhook.',
			},
			{
				name: 'Remove',
				value: 'delete',
				description: 'Remove an Onfleet webhook.',
			},
			{
				name: 'List',
				value: 'getAll',
				description: 'List all Onfleet webhooks.',
			},
		],
		default: 'getAll',
	},
] as INodeProperties[];

const urlField = {
	displayName: 'Url',
	name: 'url',
	type: 'string',
	default: '',
	description: 'The URL that Onfleet should issue a request against as soon as the trigger condition is met. It must be HTTPS and have a valid certificate.',
} as INodeProperties;

const nameField = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	default: '',
	description: 'A name for the webhook for identification.',
} as INodeProperties;

const triggerField = {
	displayName: 'Trigger',
	name: 'trigger',
	type: 'options',
	options: Object.keys(webhookMapping).map((name, value) => {
		return { name, value };
	}),
	default: '',
	description: 'The number corresponding to the trigger condition on which the webhook should fire.',
} as INodeProperties;

const thresholdField = {
	displayName: 'Threshold',
	name: 'threshold',
	type: 'number',
	default: '',
	description: 'For trigger Task Eta, the time threshold in seconds; for trigger Task Arrival, the distance threshold in meters.',
} as INodeProperties;

export const webhookFields = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'webhooks' ],
				operation: [ 'delete' ],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the webhook object for lookup.',
	},
	{
		...urlField,
		displayOptions: {
			show: {
				resource: [ 'webhooks' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...nameField,
		displayOptions: {
			show: {
				resource: [ 'webhooks' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...triggerField,
		displayOptions: {
			show: {
				resource: [ 'webhooks' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'webhooks' ],
				operation: [ 'create' ],
			},
		},
		options: [ thresholdField ],
	},
] as INodeProperties[];
