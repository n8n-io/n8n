import {
	type IHookFunctions,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	getReadyColumns,
	getResourceId,
	gristApiRequest,
	searchDocs,
	searchTables,
} from './GenericFunctions';
import type { GristWebhookCreated, GristWebhookList } from './types';

// Order-insensitive comparison of the trigger's event list against a registered webhook's.
function sameEventTypes(existing: string[] | undefined, wanted: string[]): boolean {
	if (!existing || existing.length !== wanted.length) {
		return false;
	}
	const set = new Set(existing);
	return wanted.every((event) => set.has(event));
}

// The webhook configuration this node wants registered. `checkExists` and `create` both derive from
// this single source, so the match criteria can't drift from what actually gets created.
function desiredWebhookFields(this: IHookFunctions) {
	return {
		url: this.getNodeWebhookUrl('default'),
		tableId: getResourceId.call(this, 'tableId'),
		eventTypes: this.getNodeParameter('events') as string[],
		isReadyColumn: (this.getNodeParameter('options.isReadyColumn', '') as string) || null,
	};
}

// Whether an already-registered webhook matches the desired config (event order doesn't matter).
function webhookMatches(
	fields: GristWebhookList['webhooks'][number]['fields'],
	desired: ReturnType<typeof desiredWebhookFields>,
): boolean {
	return (
		fields?.url === desired.url &&
		fields?.tableId === desired.tableId &&
		(fields?.isReadyColumn || null) === desired.isReadyColumn &&
		sameEventTypes(fields?.eventTypes, desired.eventTypes)
	);
}

const authentication: INodeProperties = {
	displayName: 'Authentication',
	name: 'authentication',
	type: 'options',
	options: [
		{
			name: 'API Key',
			value: 'apiKey',
		},
		{
			name: 'OAuth2',
			value: 'oAuth2',
		},
	],
	default: 'apiKey',
};

export class GristTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Grist Trigger',
		name: 'gristTrigger',
		icon: 'file:grist.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Grist records are added or updated',
		defaults: {
			name: 'Grist Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gristApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
			},
			{
				name: 'gristOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			authentication,
			{
				displayName: 'Document',
				name: 'docId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The Grist document to watch',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchDocs',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. utN3ysvktaDRm1hAUJJ8PH',
						hint: 'Found in the document URL or in Document Settings',
					},
				],
			},
			{
				displayName: 'Table',
				name: 'tableId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['docId.value'],
				},
				description: 'The table to watch',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchTables',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. Table1',
					},
				],
			},
			{
				displayName: 'Trigger On',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['add'],
				description: 'The record events that start the workflow',
				options: [
					{
						name: 'Record Created',
						value: 'add',
						description: 'A new record is added to the table',
					},
					{
						name: 'Record Updated',
						value: 'update',
						description: 'An existing record in the table is changed',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Ready Column Name or ID',
						name: 'isReadyColumn',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: ['docId.value', 'tableId.value'],
							loadOptionsMethod: 'getReadyColumns',
						},
						default: '',
						description:
							'A toggle (boolean) column that is true when a record is ready. The workflow only triggers once a record becomes ready, which lets you fill in a record over several steps and trigger only when it is complete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			getReadyColumns,
		},

		listSearch: {
			searchDocs,
			searchTables,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const docId = getResourceId.call(this, 'docId');
				const desired = desiredWebhookFields.call(this);

				const { webhooks } = (await gristApiRequest.call(
					this,
					'GET',
					`/docs/${docId}/webhooks`,
				)) as GristWebhookList;

				// Match on the full configuration, not just the URL: a webhook left over with a different
				// table, event set, or ready column must not be reused, or it would fire with stale config.
				const existing = webhooks.find((webhook) => webhookMatches(webhook.fields, desired));
				if (!existing) {
					return false;
				}

				webhookData.webhookId = existing.id;
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const docId = getResourceId.call(this, 'docId');

				const body = { webhooks: [{ fields: desiredWebhookFields.call(this) }] };

				const { webhooks } = (await gristApiRequest.call(
					this,
					'POST',
					`/docs/${docId}/webhooks`,
					body,
				)) as GristWebhookCreated;

				webhookData.webhookId = webhooks[0].id;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return true;
				}

				const docId = getResourceId.call(this, 'docId');
				try {
					await gristApiRequest.call(
						this,
						'DELETE',
						`/docs/${docId}/webhooks/${webhookData.webhookId as string}`,
					);
				} catch {
					return false;
				}

				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Grist POSTs an array of changed records; emit one workflow item per record.
		return {
			workflowData: [this.helpers.returnJsonArray(this.getBodyData())],
		};
	}
}
