import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { conditionFields } from './ConditionDescription';
import { zendeskApiRequest, zendeskApiRequestAllItems } from './GenericFunctions';
import { triggerPlaceholders } from './TriggerPlaceholders';
import { verifySignature } from './ZendeskTriggerHelpers';

export class ZendeskTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zendesk Trigger',
		name: 'zendeskTrigger',
		icon: 'file:zendesk.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle Zendesk events via webhooks',
		defaults: {
			name: 'Zendesk Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zendeskApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiToken'],
					},
				},
			},
			{
				name: 'zendeskOAuth2Api',
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
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'API Token',
						value: 'apiToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'apiToken',
			},
			{
				displayName: 'Service',
				name: 'service',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Support',
						value: 'support',
					},
				],
				default: 'support',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						service: ['support'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Field Names or IDs',
						name: 'fields',
						description:
							'The fields to return the values of. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						type: 'multiOptions',
						default: [],
						typeOptions: {
							loadOptionsMethod: 'getFields',
						},
					},
				],
				placeholder: 'Add option',
			},
			{
				displayName: 'Conditions',
				name: 'conditions',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						service: ['support'],
					},
				},
				description: 'The condition to set',
				default: {},
				options: [
					{
						name: 'all',
						displayName: 'All',
						values: [...conditionFields],
					},
					{
						name: 'any',
						displayName: 'Any',
						values: [...conditionFields],
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the fields to display them to user so that they can
			// select them easily
			async getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = triggerPlaceholders;
				const customFields = [
					'text',
					'textarea',
					'date',
					'integer',
					'decimal',
					'regexp',
					'multiselect',
					'tagger',
				];
				const fields = await zendeskApiRequestAllItems.call(
					this,
					'ticket_fields',
					'GET',
					'/ticket_fields',
				);
				for (const field of fields) {
					if (customFields.includes(field.type as string) && field.removable && field.active) {
						const fieldName = field.title;
						const fieldId = field.id;
						returnData.push({
							name: fieldName,
							value: `ticket.ticket_field_${fieldId}`,
							description: `Custom field ${fieldName}`,
						});
					}
				}
				return returnData;
			},
			// Get all the groups to display them to user so that they can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groups = await zendeskApiRequestAllItems.call(this, 'groups', 'GET', '/groups');
				for (const group of groups) {
					const groupName = group.name;
					const groupId = group.id;
					returnData.push({
						name: groupName,
						value: groupId,
					});
				}
				return returnData;
			},
			// Get all the users to display them to user so that they can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await zendeskApiRequestAllItems.call(this, 'users', 'GET', '/users');
				for (const user of users) {
					const userName = user.name;
					const userId = user.id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				returnData.push({
					name: 'Current User',
					value: 'current_user',
				});
				returnData.push({
					name: 'Requester',
					value: 'requester_id',
				});
				return returnData;
			},
		},
	};

	webhookMethods = {
		default: {
			/**
			 * Checks whether the Zendesk webhook and trigger created by this workflow
			 * still exist. Returns true only when both are confirmed present, which
			 * prevents unnecessary recreation and avoids the scenario where a failed
			 * create() call causes clearWebhooks() to delete the Zendesk webhook.
			 *
			 * We intentionally do NOT delete triggers owned by other workflows.
			 * Duplicated n8n workflows share the same webhook URL, so cleaning up
			 * "unknown" triggers would silently destroy a sibling workflow's setup.
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const webhookData = this.getWorkflowStaticData('node');

				// ── Step 1: find the Zendesk webhook by endpoint URL ────────────────
				// https://developer.zendesk.com/api-reference/event-connectors/webhooks/webhooks/#list-webhooks
				const webhooksResponse = await zendeskApiRequest.call(this, 'GET', '/webhooks');
				const webhooks: Array<{ id: string; endpoint: string }> = webhooksResponse.webhooks ?? [];

				const matchingWebhook = webhooks.find((w) => w.endpoint === webhookUrl);

				if (!matchingWebhook) {
					// Webhook is gone — clear any stale references so create() starts fresh
					delete webhookData.targetId;
					delete webhookData.webhookId;
					return false;
				}

				// Keep targetId in sync with Zendesk (the ID is stable, but be defensive)
				webhookData.targetId = matchingWebhook.id;

				// ── Step 2: confirm our specific trigger still exists ────────────────
				// If we have no stored trigger ID this is a fresh activation (e.g. first
				// run, or the workflow was duplicated). Fall through to create().
				if (webhookData.webhookId === undefined) {
					return false;
				}

				// https://developer.zendesk.com/api-reference/ticketing/business-rules/triggers/#list-triggers
				const triggers: Array<{
					id: string | number;
					actions: Array<{ field: string; value: string[] }>;
				}> = await zendeskApiRequestAllItems.call(this, 'triggers', 'GET', '/triggers/active');

				const ourTriggerExists = triggers.some(
					(trigger) =>
						trigger.id.toString() === (webhookData.webhookId as string).toString() &&
						trigger.actions[0]?.field === 'notification_webhook' &&
						trigger.actions[0]?.value[0]?.toString() === matchingWebhook.id,
				);

				if (ourTriggerExists) {
					return true;
				}

				// Trigger is gone — clear the stale ID so create() makes a fresh one
				delete webhookData.webhookId;
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const webhookData = this.getWorkflowStaticData('node');
				const service = this.getNodeParameter('service') as string;

				if (service === 'support') {
					const message: IDataObject = {};
					const resultAll = [],
						resultAny = [];
					const conditions = this.getNodeParameter('conditions') as IDataObject;
					const options = this.getNodeParameter('options') as IDataObject;

					if (Object.keys(conditions).length === 0) {
						throw new NodeOperationError(this.getNode(), 'You must have at least one condition');
					}

					if (options.fields) {
						for (const field of options.fields as string[]) {
							message[field] = `{{${field}}}`;
						}
					} else {
						message['ticket.id'] = '{{ticket.id}}';
					}

					const conditionsAll = conditions.all as [IDataObject];
					if (conditionsAll) {
						for (const conditionAll of conditionsAll) {
							const aux: IDataObject = {};
							aux.field = conditionAll.field;
							aux.operator = conditionAll.operation;
							if (
								conditionAll.operation !== 'changed' &&
								conditionAll.operation !== 'not_changed'
							) {
								aux.value = conditionAll.value;
							} else {
								aux.value = null;
							}
							resultAll.push(aux);
						}
					}

					const conditionsAny = conditions.any as [IDataObject];
					if (conditionsAny) {
						for (const conditionAny of conditionsAny) {
							const aux: IDataObject = {};
							aux.field = conditionAny.field;
							aux.operator = conditionAny.operation;
							if (
								conditionAny.operation !== 'changed' &&
								conditionAny.operation !== 'not_changed'
							) {
								aux.value = conditionAny.value;
							} else {
								aux.value = null;
							}
							resultAny.push(aux);
						}
					}

					const urlParts = new URL(webhookUrl);

					const bodyTrigger: IDataObject = {
						trigger: {
							title: `n8n-webhook:${urlParts.pathname}`,
							conditions: {
								all: resultAll,
								any: resultAny,
							},
							actions: [
								{
									field: 'notification_webhook',
									value: [],
								},
							],
						},
					};

					const bodyTarget: IDataObject = {
						webhook: {
							name: 'n8n webhook',
							endpoint: webhookUrl,
							http_method: 'POST',
							status: 'active',
							request_format: 'json',
							subscriptions: ['conditional_ticket_events'],
						},
					};
					let target: IDataObject = {};

					// if target id exists but trigger does not then reuse the target
					// and create the trigger else create both
					if (webhookData.targetId !== undefined) {
						target.id = webhookData.targetId;
					} else {
						// create a webhook
						// https://developer.zendesk.com/api-reference/event-connectors/webhooks/webhooks/#create-or-clone-webhook
						target = (await zendeskApiRequest.call(this, 'POST', '/webhooks', bodyTarget))
							.webhook as IDataObject;
					}

					// Fetch the signing secret for webhook signature verification
					// https://developer.zendesk.com/api-reference/event-connectors/webhooks/webhooks/#show-webhook-signing-secret
					const signingSecretResponse = await zendeskApiRequest.call(
						this,
						'GET',
						`/webhooks/${String(target.id)}/signing_secret`,
					);
					const secret: string | undefined = signingSecretResponse?.signing_secret?.secret;
					if (secret) {
						webhookData.webhookSecret = secret;
					}

					((bodyTrigger.trigger as IDataObject).actions as IDataObject[])[0].value = [
						target.id,
						JSON.stringify(message),
					];

					const { trigger } = await zendeskApiRequest.call(this, 'POST', '/triggers', bodyTrigger);
					webhookData.webhookId = trigger.id;
					webhookData.targetId = target.id;
				}
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				let deletionSucceeded = true;
				try {
					await zendeskApiRequest.call(this, 'DELETE', `/triggers/${webhookData.webhookId}`);

					// Only delete the Zendesk webhook if no other triggers still reference it.
					// A duplicated n8n workflow shares the same webhook URL and may have its
					// own trigger pointing at the same Zendesk webhook — deleting the webhook
					// would silently break the sibling workflow's incoming events.
					const remainingTriggers: Array<{
						actions: Array<{ field: string; value: unknown[] }>;
					}> = await zendeskApiRequestAllItems.call(this, 'triggers', 'GET', '/triggers/active');

					const webhookStillInUse = remainingTriggers.some(
						(trigger) =>
							trigger.actions[0]?.field === 'notification_webhook' &&
							String(trigger.actions[0]?.value[0]) === String(webhookData.targetId),
					);

					if (!webhookStillInUse) {
						await zendeskApiRequest.call(this, 'DELETE', `/webhooks/${webhookData.targetId}`);
					}
				} catch {
					// The remote resource may already be gone (e.g. deleted in Zendesk
					// manually, or removed when a duplicated workflow was deactivated).
					// We still fall through to the finally block so stale IDs are cleared,
					// ensuring the next activation starts with a clean slate instead of
					// trying to reuse a webhook that no longer exists.
					deletionSucceeded = false;
				} finally {
					delete webhookData.webhookId;
					delete webhookData.targetId;
					delete webhookData.webhookSecret;
				}
				return deletionSucceeded;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Verify the webhook signature before processing
		if (!verifySignature.call(this)) {
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();
			return {
				noWebhookResponse: true,
			};
		}

		const req = this.getRequestObject();
		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
