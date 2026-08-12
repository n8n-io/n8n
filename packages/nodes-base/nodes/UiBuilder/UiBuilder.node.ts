import { formatUiDefinitionIssues, validateUiDefinition } from '@n8n/ui-builder/schema';
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
		// The shape of a definition is carried by the generated `UiDefinition` type,
		// which the workflow SDK builds from the component kit itself. What is left
		// for prose is what a type cannot say: that the expressions inside are not
		// n8n's, and how an app is wired to the workflow serving it.
		builderHint: {
			searchHint:
				'Serves an interactive web app defined in this node. Pair with an API Router trigger: one endpoint serves the page, the rest answer the app’s actions.',
			relatedNodes: [
				{
					nodeType: 'n8n-nodes-base.apiRouter',
					relationHint: 'Serves the page and gives each app action its own endpoint',
				},
				{
					nodeType: 'n8n-nodes-base.dataTable',
					relationHint: 'Backs an app action with storage',
				},
			],
			extraTypeDefContent: [
				{
					// eslint-disable-next-line @n8n/community-nodes/no-builder-hint-leakage -- the `={{ }}` below is UI Builder's own expression language, not n8n's wire format, and telling the builder apart from n8n's is the whole point of this hint. `expr()` would be the wrong advice here.
					content: `<patterns>
<pattern title="Expressions inside a definition are the app's own, not n8n's">
\`={{ ... }}\` in a definition is resolved in the browser, against the app's
state — never by n8n, which passes the definition through untouched. The names
in scope are the app's:

  $state    everything an action has written into the app
  $route    { path, params } of the page on screen
  $pages    [{ id, path, title }] for every page, in document order
  $loading  { [action]: boolean }, keyed by the trigger's last path segment
  $item     bound by an enclosing repeat, with $index

There is no $json, no $node, no $now. Writing one produces a blank prop, not an
error. Conversely, an n8n expression belongs nowhere in this parameter.
</pattern>

<pattern title="An input is one binding, named once">
\`model\` is the place in state an input both reads and writes — not a write
target paired with a separate \`value\` to display. Name the path once:

const nameInput = { id: 'name', type: 'input', props: {
  model: 'form.name',
  placeholder: 'Order name',
}, tree: {} };

Everything else reading \`$state.form.name\` — a request body, another
component — then sees what was typed.
</pattern>

<pattern title="An action is a chain of steps, run in order">
\`onClick\`, \`onEnter\` and \`onMount\` hold a list, not a single call. A webhook
step's \`request\` is the body to send, as an expression (unset sends all of
state). It does not place the reply anywhere: the reply becomes \`$response\` for
the steps after it, and a \`set\` step decides what of it is worth keeping. Give
the step a \`key\` when a chain calls more than once, and the answers are also at
\`$responses.<key>\`. A webhook answering \`ok: false\` ends the chain, which is
what stops a failed save from navigating away from the form that failed.

onClick: [
  { kind: 'webhook', url: '{webhookBaseUrl}/orders-app/orders', method: 'POST', request: '={{ $state.form }}' },
  { kind: 'set', path: 'form', value: {} },
  { kind: 'notify', message: 'Order added', type: 'success' },
  { kind: 'navigate', to: '/' },
]

To keep a reply, set from it:

  { kind: 'webhook', url: '…/orders', method: 'GET' },
  { kind: 'set', path: 'orders', value: '={{ $response }}' },

A step's expressions resolve as that step runs, so a step after a webhook sees
what that webhook answered.
</pattern>

<pattern title="A whole app: API Router serves the page and the actions">
One API Router trigger on a base path, one endpoint per thing the app does. Its
outputs are its endpoints in order, so endpoint 0 goes to the UI Builder node
and the rest go to whatever answers them.

  [API Router  basePath: orders-app]
    GET  /        -> [UI Builder]        the page itself
    GET  /orders  -> [Data table: get]   answers the list
    POST /orders  -> [Data table: insert]

The UI Builder node answers its own request with the page, so that branch takes
NO Respond to Webhook node. The data branches need none either: the router's
default "Respond: Automatically" returns the last node's JSON.

Action URLs are absolute production webhook URLs
(\`{webhookBaseUrl}/<basePath>/<endpoint>\`), so the workflow has to be PUBLISHED
before the app works — saving is not enough.

const definition = {
  id: 'app', type: 'frame', props: { defaultPage: '/' },
  tree: {
    header: [{ id: 'nav', type: 'repeat', props: { items: '={{ $pages }}', direction: 'horizontal' }, tree: {
      default: [{ id: 'nav-btn', type: 'button', props: {
        label: '={{ $item.title }}',
        variant: 'tertiary',
        active: '={{ $route.path === $item.path }}',
        onClick: [{ kind: 'navigate', to: '={{ $item.path }}' }],
      }, tree: {} }],
    } }],
    default: [{ id: 'list', type: 'page', props: {
      path: '/', title: 'Orders',
      onEnter: [
        { kind: 'webhook', url: '{webhookBaseUrl}/orders-app/orders', method: 'GET' },
        { kind: 'set', path: 'orders', value: '={{ $response }}' },
      ],
    }, tree: {
      default: [{ id: 'rows', type: 'table', props: { rows: '={{ $state.orders }}', columns: 'name,qty' }, tree: {} }],
    } }],
  },
};

A nav bar is a repeat over \`$pages\` with a button inside — the frame draws none
of its own.
</pattern>
</patterns>`,
				},
			],
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

			// A definition the renderer cannot make sense of would otherwise serve a
			// blank page and say nothing about why, which is the one failure this
			// node is in a position to explain. Every problem at once, since whoever
			// is fixing it — a person or an agent reading this message — wants the
			// list rather than the first entry of it.
			const issues = validateUiDefinition(definition);
			if (issues.length > 0) {
				throw new NodeOperationError(
					this.getNode(),
					`Definition is not a valid UI: ${formatUiDefinitionIssues(issues)}`,
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
