import {
   IHookFunctions,
   IWebhookFunctions,
} from 'n8n-core';

import {
   IDataObject,
   INodeType,
   INodeTypeDescription,
   IWebhookResponseData,
} from 'n8n-workflow';

/*
import {
	autofriendApiRequest,
} from './GenericFunctions';

import {
	snakeCase,
} from 'change-case';
*/


export class GllueTrigger implements INodeType {
   description: INodeTypeDescription = {
	   displayName: 'Gllue Trigger',
	   name: 'gllueTrigger',
	   icon: 'file:gllue.svg',
	   group: ['trigger'],
	   version: 1,
	   subtitle: '={{$parameter["event"]}}',
	   description: 'Handle Gllue events via webhooks',
	   defaults: {
		   name: 'Gllue Trigger',
		   color: '#4285f4',
	   },
	   inputs: [],
	   outputs: ['main'],
	   credentials: [],
	   webhooks: [
		   {
			   name: 'default',
			   httpMethod: 'POST',
			   responseMode: 'onReceived',
			   path: 'webhook',
		   },
	   ],
	   properties: [],
   };
   async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
	   return {
		   workflowData: [],
	   };
   }
}
