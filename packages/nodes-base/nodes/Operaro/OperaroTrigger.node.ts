import type {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class OperaroTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Operaro Trigger',
		name: 'operaroTrigger',
		icon: 'file:operaro.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens for Operaro platform events via webhook',
		defaults: {
			name: 'Operaro Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Order Created', value: 'order.created' },
					{ name: 'Order Updated', value: 'order.updated' },
					{ name: 'Order Cancelled', value: 'order.cancelled' },
					{ name: 'Customer Created', value: 'customer.created' },
					{ name: 'Customer Updated', value: 'customer.updated' },
					{ name: 'Product Created', value: 'product.created' },
					{ name: 'Product Updated', value: 'product.updated' },
					{ name: 'Product Deleted', value: 'product.deleted' },
					{ name: 'Inventory Updated', value: 'inventory.updated' },
					{ name: 'Content Post Scheduled', value: 'content.scheduled' },
					{ name: 'Content Post Published', value: 'content.published' },
					{ name: 'Notification Sent', value: 'notification.sent' },
				],
				default: 'order.created',
				required: true,
				description: 'The Operaro platform event to listen for',
			},
			{
				displayName: 'Filter by Tenant',
				name: 'tenantId',
				type: 'string',
				default: '',
				description:
					'Optionally filter events to a specific tenant ID. Leave empty to receive events from all tenants.',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const headerData = this.getHeaderData();
		const event = this.getNodeParameter('event') as string;
		const tenantId = this.getNodeParameter('tenantId', '') as string;

		// Validate the incoming event type matches what we're listening for
		const incomingEvent =
			(body.event as string | undefined) ??
			(headerData['x-operaro-event'] as string | undefined);

		if (incomingEvent && incomingEvent !== event) {
			return { noWebhookResponse: true };
		}

		// Filter by tenant if specified
		if (tenantId) {
			const incomingTenantId =
				(body.tenantId as string | undefined) ??
				(headerData['x-operaro-tenant-id'] as string | undefined);

			if (incomingTenantId && incomingTenantId !== tenantId) {
				return { noWebhookResponse: true };
			}
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray({
					event: incomingEvent ?? event,
					timestamp: new Date().toISOString(),
					...(body as Record<string, unknown>),
				}),
			],
		};
	}
}
