import { getHtmlSandboxCSP, isWebhookHtmlSandboxingDisabled } from 'n8n-core';
import type {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { n8nOAuth2Auth } from 'n8n-workflow';

import { placeholder } from './placeholder';

export class Webpage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webpage',
		name: 'webpage',
		icon: 'fa:globe',
		iconColor: 'azure',
		group: ['trigger'],
		version: 1,
		description: 'Serve an HTML page at a custom URL',
		activationMessage: 'Your page is now live at its production URL.',
		defaults: {
			name: 'Webpage',
		},
		inputs: [],
		outputs: [],
		parameterPane: 'wide',
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				isFullPath: true,
				path: '={{ $parameter["path"] || $webhookId }}',
				ndvHideMethod: true,
			},
		],
		triggerPanel: {
			header: 'Preview your page on the canvas',
			executionsHelp:
				'Opening the page does not run the workflow. <br /><br /> <b>While you build</b>, the canvas shows a preview of your draft. <br /><br /> <b>To share the page</b>, publish the workflow. The page is then live at the production URL. Publish again to make later changes live.',
			activationHint: {
				active:
					'Your page is live at the production URL. Publish again to make your latest changes live.',
				inactive: 'Publish this workflow to make your page live at the production URL.',
			},
		},
		properties: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'my-page',
				description: "The final segment of the page's production URL",
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'n8n User Auth',
						// The Webhook and MCP Trigger nodes store the same value. The OAuth
						// resource resolvers recognise it.
						value: 'n8nOAuth2',
						description: 'Only signed-in n8n users who can run this workflow can open the page',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				// The resolvers read the raw value, so it must never be an expression.
				noDataExpression: true,
				description: 'Who can open the page',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: {
					editor: 'htmlEditor',
					rows: 20,
				},
				default: placeholder,
				noDataExpression: true,
				description: 'The HTML document to serve. n8n sends it as is.',
			},
			// The canvas size of the node. The canvas writes these values.
			{
				displayName: 'Width',
				name: 'width',
				type: 'hidden',
				default: 480,
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'hidden',
				default: 320,
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		if (this.getNodeParameter('authentication', 'none') === 'n8nOAuth2') {
			// A page view runs nothing. So the node only checks the visitor and does not
			// establish a trigger identity.
			const authResult = await n8nOAuth2Auth(this, {
				realm: 'n8n Webpage',
				method: req.method,
				browserFlow: 'auto',
			});
			if (authResult === 'handled') {
				return { noWebhookResponse: true };
			}
		}

		const html = this.getNodeParameter('html', '');

		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		// The page is author-controlled HTML served on the n8n origin. The sandbox gives
		// it an opaque origin, so its scripts cannot use the visitor's n8n session.
		if (!isWebhookHtmlSandboxingDisabled()) {
			res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		}
		res.status(200).send(typeof html === 'string' ? html : '');

		// No workflowData, so no execution starts.
		return { noWebhookResponse: true };
	}
}
