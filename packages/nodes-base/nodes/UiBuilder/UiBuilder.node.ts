import jwt from 'jsonwebtoken';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getAppPage } from './templates';

type JwtAuthCredential = {
	keyType: 'passphrase' | 'pemKey';
	secret?: string;
	privateKey?: string;
	algorithm: jwt.Algorithm;
};

const DEFAULT_DEFINITION = {
	id: 'page',
	type: 'page',
	props: {},
	tree: {},
};

export class UiBuilder implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UI Builder',
		name: 'uiBuilder',
		icon: 'fa:panels-top-left',
		iconColor: 'purple',
		group: ['output'],
		version: 1,
		description: 'Serve a UI defined in this node as a web app',
		respondsToWebhook: true,
		outputFieldRendering: { html: 'html' },
		defaults: {
			name: 'UI Builder',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'jwtAuth',
				required: true,
				displayOptions: { show: { authenticateActions: [true] } },
			},
		],
		properties: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'The name of this workflow',
				description:
					'Shown in the browser tab. A multi-page app puts the current page in front of it. Defaults to the name of this workflow.',
			},
			{
				displayName: 'Authenticate Actions',
				name: 'authenticateActions',
				type: 'boolean',
				default: false,
				description:
					'Whether to sign a short-lived token into the page for its actions to check. Set the action webhooks to JWT Auth with the same credential.',
			},
			{
				displayName: 'Token Lifetime (Seconds)',
				name: 'tokenTtl',
				type: 'number',
				default: 3600,
				displayOptions: { show: { authenticateActions: [true] } },
				description:
					'How long a served page can keep calling its actions. The page is the session, so this is the session length.',
			},
			{
				displayName: 'Definition',
				name: 'definition',
				type: 'uiBuilder',
				default: DEFAULT_DEFINITION,
				description:
					'The UI definition: a tree of { id, type, props, tree } records, edited in the builder panel',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			// An author who never opens the Title field still gets something better
			// than a generic one, and the workflow's name is what they called this.
			// One `||` chain, so an unsaved workflow with no name still lands on the
			// generic default rather than an empty tab.
			const title =
				(this.getNodeParameter('title', i, '') as string) || this.getWorkflow().name || 'n8n App';
			// `rawExpressions`: the definition's `={{ }}` values are the app's own
			// expression language, resolved in the browser against its state. Left to
			// resolve here they would be evaluated against `$json` and baked into the
			// page as whatever they came out as.
			const raw = this.getNodeParameter('definition', i, undefined, { rawExpressions: true });
			const authenticate = this.getNodeParameter('authenticateActions', i, false) as boolean;

			// The string branch is for workflows saved while the definition was stored
			// as JSON text; the builder writes the tree itself now.
			let definition: unknown;
			try {
				definition = typeof raw === 'string' ? JSON.parse(raw) : raw;
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Definition is not valid JSON: ${(error as Error).message}`,
					{ itemIndex: i },
				);
			}

			let token: string | undefined;

			if (authenticate) {
				const ttl = this.getNodeParameter('tokenTtl', i, 3600) as number;
				const credential = (await this.getCredentials('jwtAuth')) as JwtAuthCredential;
				const key = credential.keyType === 'pemKey' ? credential.privateKey : credential.secret;

				if (!key) {
					throw new NodeOperationError(
						this.getNode(),
						credential.keyType === 'pemKey'
							? 'The JWT credential has no private key, so this node cannot sign a token'
							: 'The JWT credential has no secret, so this node cannot sign a token',
						{ itemIndex: i },
					);
				}

				// The same credential the action webhooks verify with, which is what
				// ties a served page to the actions it is allowed to call.
				token = jwt.sign({ iss: 'n8n-ui-builder' }, key, {
					algorithm: credential.algorithm,
					expiresIn: ttl,
				});
			}

			returnData.push({
				json: { html: getAppPage(title, definition, token) },
				pairedItem: { item: i },
			});
		}

		// This node is the only thing that knows the page is HTML, so it answers the
		// request itself rather than leaving a Respond to Webhook node to say so.
		// `sendResponse` is a no-op when nothing is waiting on a response, which is
		// what makes a manual run, or a branch that responds some other way, safe.
		const [first] = returnData;
		if (first !== undefined) {
			await this.sendResponse({
				statusCode: 200,
				headers: { 'content-type': 'text/html; charset=utf-8' },
				body: first.json.html as string,
			});
		}

		return [returnData];
	}
}
