import {
	IHookFunctions,
	IWebhookFunctions,
  } from 'n8n-core';

  import {
	IDataObject,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
	ILoadOptionsFunctions,
	INodePropertyOptions,
  } from 'n8n-workflow';
  import {
	paypalApiRequest,
 } from './GenericFunctions';

  export class PayPalTrigger implements INodeType {
	description: INodeTypeDescription = {
	  displayName: 'PayPal Trigger',
	  name: 'PayPal',
	  icon: 'file:paypal.png',
	  group: ['trigger'],
	  version: 1,
	  description: 'Handle PayPal events via webhooks',
	  defaults: {
		name: 'PayPal Trigger',
		color: '#32325d',
	  },
	  inputs: [],
	  outputs: ['main'],
	  credentials: [
			  {
				  name: 'paypalApi',
				  required: true,
			  }
		  ],
	  webhooks: [
		{
		  name: 'default',
		  httpMethod: 'POST',
		  reponseMode: 'onReceived',
		  path: 'webhook',
		},
	  ],
	  properties: [
		{
		  displayName: 'Events',
		  name: 'events',
		  type: 'multiOptions',
		  required: true,
		  default: [],
		  description: 'The event to listen to.',
		  typeOptions: {
			  loadOptionsMethod: 'getEvents'
		  }
		}
	  ],
	};

	methods = {
		loadOptions: {
			// Get all the events types to display them to user so that he can
			// select them easily
			async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let events;
				try {
					events = await paypalApiRequest.call(this, '/webhooks-event-types', 'GET');
				} catch (err) {
					throw new Error(`PayPal Error: ${err}`);
				}
				for (const event of events.event_types) {
					const eventName = event.name;
					const eventId = event.name;
					const eventDescription = event.description;

					returnData.push({
						name: eventName,
						value: eventId,
						description: eventDescription,
					});
				}
				return returnData;
			},
		},
	};

	// @ts-ignore (because of request)
	  webhookMethods = {
		  default: {
			  async checkExists(this: IHookFunctions): Promise<boolean> {
		  const webhookData = this.getWorkflowStaticData('node');


				  return true;
			  },
			  async delete(this: IHookFunctions): Promise<boolean> {
				  const webhookData = this.getWorkflowStaticData('node');


				  return true;
			  },
		  },
	  };

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
	  const bodyData = this.getBodyData() as IDataObject;
		  const req = this.getRequestObject();

		  const events = this.getNodeParameter('events', []) as string[];

		  const eventType = bodyData.type as string | undefined;

		  return {
			  workflowData: [
				  this.helpers.returnJsonArray(req.body)
			  ],
		  };
	}
  }
