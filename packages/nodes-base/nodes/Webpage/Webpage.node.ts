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
		builderHint: {
			searchHint:
				'Serves a complete HTML page at a custom URL path: landing page, website, portfolio, docs or another static page. Put the whole self-contained HTML5 document in `html`. A page view starts no execution, so the node has no outputs and needs no other nodes. Prefer it over Webhook + Respond to Webhook for pages. For live data, let the page script fetch a Webhook in the same workflow that responds with JSON.',
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
				builderHint: {
					propertyHint:
						"URL path without a leading slash, for example 'my-page' for /my-page. Use the path that the user names. Otherwise use a short kebab-case slug.",
					placeholderSupported: false,
				},
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
				builderHint: {
					propertyHint:
						"Default to 'none'. n8n exposes inbound trigger URLs publicly by design. Use 'n8nOAuth2' only when the user explicitly asks that only signed-in n8n users can open the page. This protects only the HTML: a Webhook that the page calls with fetch() stays public.",
				},
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
				builderHint: {
					propertyHint:
						'A complete, self-contained HTML5 document, from the doctype to the closing html tag, with real copy for the request. Never use lorem ipsum. Inline style and script tags and CDN links are allowed. n8n serves it as is and does not resolve expressions. The page runs in a sandbox with an opaque origin: it cannot use cookies, localStorage or the n8n session of the visitor, but its scripts can fetch other webhook URLs of this instance. In the SDK source, escape each backslash first, then each backtick and each dollar sign that comes before an opening brace, in the template literal.',
					placeholderSupported: false,
				},
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
