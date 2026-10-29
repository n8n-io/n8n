import { buildDispatcher, dispatchedFetch } from '@n8n/backend-network/transport';
import { EventSource, type ErrorEvent } from 'eventsource';
import type {
	IDataObject,
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, OperationalError, jsonParse } from 'n8n-workflow';

// These statuses reconnect and resend `Last-Event-ID`, as eventsource v2 did.
// eventsource v3 closes the stream on any non-200 status.
const RECONNECT_STATUSES = new Set([500, 502, 503, 504]);

/**
 * The fetch API rejects a URL that contains credentials, so move them to a
 * Basic auth header.
 */
function splitCredentials(rawUrl: string) {
	const url = new URL(rawUrl);
	if (!url.username && !url.password) return { url, authorization: undefined };

	const credentials = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
	const authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
	url.username = '';
	url.password = '';
	return { url, authorization };
}

export class SseTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SSE Trigger',
		name: 'sseTrigger',
		icon: 'node:sse-trigger',
		iconColor: 'dark-blue',
		group: ['trigger'],
		version: 1,
		description: 'Triggers the workflow when Server-Sent Events occur',
		eventTriggerDescription: '',
		activationMessage: 'You can now make calls to your SSE URL to trigger executions.',
		defaults: {
			name: 'SSE Trigger',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>While building your workflow</b>, click the 'execute step' button, then trigger an SSE event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, publish it. Then every time a change is detected, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
				active:
					"<b>While building your workflow</b>, click the 'execute step' button, then trigger an SSE event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time a change is detected, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			},
			activationHint:
				'Once you’ve finished building your workflow, publish it to have it also listen continuously (you just won’t see those executions here).',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'http://example.com',
				description: 'The URL to receive the SSE from',
				required: true,
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const url = this.getNodeParameter('url') as string;

		const egressFilter = this.helpers.getSecureEgressFilter();
		const validation = await egressFilter.validateUrl(url);
		if (!validation.ok) {
			throw new NodeOperationError(this.getNode(), validation.error);
		}

		const { url: connectUrl, authorization } = splitCredentials(url);

		// An SSE stream can stay idle for long periods, so no body timeout applies.
		// The headers timeout bounds how long activation waits for a hanging server.
		const dispatcher = buildDispatcher('env', egressFilter, {
			timeouts: { bodyTimeout: 0, headersTimeout: 10_000 },
		});
		const eventSource = new EventSource(connectUrl, {
			fetch: async (input, init) => {
				const response = await dispatchedFetch(dispatcher, input, {
					...init,
					headers: { ...init?.headers, ...(authorization && { Authorization: authorization }) },
				});
				if (!RECONNECT_STATUSES.has(response.status)) return response;

				// eventsource treats a rejected fetch as a network error and reconnects.
				await response.body?.cancel();
				throw new OperationalError(`HTTP ${response.status}`);
			},
		});

		eventSource.onmessage = (event) => {
			const eventData = jsonParse<IDataObject>(event.data as string, {
				errorMessage: 'Invalid JSON for event data',
			});
			this.emit([this.helpers.returnJsonArray([eventData])]);
		};

		const connectionError = (event: ErrorEvent) => {
			const status = event.code === undefined ? '' : ` (HTTP ${event.code})`;
			return new NodeOperationError(this.getNode(), `The SSE connection failed${status}`, {
				description: event.message,
			});
		};

		// Wait for the first outcome so a permanent failure throws here, where
		// activation retries it with backoff. Reporting it through `emitError` instead
		// makes n8n re-register the trigger at once, which loops while the failure
		// persists. A temporary failure reconnects on its own, so activation continues.
		await new Promise<void>((resolve, reject) => {
			eventSource.onopen = () => resolve();
			eventSource.onerror = (event) => {
				if (eventSource.readyState !== EventSource.CLOSED) return resolve();
				eventSource.close();
				reject(connectionError(event));
			};
		});

		// Temporary failures reconnect on their own. A closed stream (e.g. a 4xx
		// response) does not, so report it instead of going quiet.
		eventSource.onerror = (event) => {
			if (eventSource.readyState !== EventSource.CLOSED) return;
			this.emitError(connectionError(event));
		};

		async function closeFunction() {
			eventSource.close();
		}

		return {
			closeFunction,
		};
	}
}
