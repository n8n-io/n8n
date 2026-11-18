import type {
	CompositeBuilder,
	CompositeDefinition,
	CompositeNodeType,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeTypeDescription,
} from 'n8n-workflow';
import { exposeProperties, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { mainProperties as httpRequestProperties } from '../HttpRequest/V3/Description';

const HTTP_REQUEST_TYPE = 'n8n-nodes-base.httpRequest';
const HTTP_REQUEST_VERSION = 4.2;
const SWITCH_TYPE = 'n8n-nodes-base.switch';
const SWITCH_VERSION = 3.2;
const WAIT_TYPE = 'n8n-nodes-base.wait';
const WAIT_VERSION = 1.1;

/** One exit input is the entry anchor and one is the timeout, so 99 remain: 49 attempts with Fail When. */
const MAX_ATTEMPTS = 49;

const requestProperties = exposeProperties(httpRequestProperties, HTTP_REQUEST_VERSION, {
	exclude: ['curlImport', 'infoMessage'],
});
const requestParameterNames = [...new Set(requestProperties.map((property) => property.name))];

const conditionsTypeOptions = {
	filter: { caseSensitive: true, typeValidation: 'strict' as const, version: 2 },
};

function expand(c: CompositeBuilder): void {
	const attempts = c.literal<number>('maxAttempts');
	const unit = c.literal<string>('intervalUnit');
	const onTimeout = c.literal<string>('onTimeout');
	const checkFailure = c.literal<boolean>('checkFailure');
	const options = (c.innerParameter('pollOptions') ?? {}) as IDataObject;

	const request = c.inputParameters(requestParameterNames);
	const interval = c.inputExpression('interval');

	const rules: INodeParameters[] = [
		{ conditions: c.innerParameter('doneWhen'), renameOutput: true, outputKey: 'Done' },
	];
	if (checkFailure) {
		rules.push({
			conditions: c.innerParameter('failWhen'),
			renameOutput: true,
			outputKey: 'Failed',
		});
	}
	const continueOutput = rules.length;

	const done = c.exit({ output: 0 });
	const failed = checkFailure
		? c.exit({ error: 'Fail When matched on attempt {index}' })
		: undefined;
	const timedOut =
		onTimeout === 'error'
			? c.exit({ error: `Not done after ${attempts} attempts` })
			: c.exit({ output: 1 });

	let previous = c.entry;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		const requestNode = c.addNode(`request ${attempt}`, {
			type: HTTP_REQUEST_TYPE,
			typeVersion: HTTP_REQUEST_VERSION,
			parameters: request,
			credentials: c.credentials(),
			continueOnFail: options.keepPollingOnError === true,
		});
		const check = c.addNode(`check ${attempt}`, {
			type: SWITCH_TYPE,
			typeVersion: SWITCH_VERSION,
			parameters: { mode: 'rules', rules: { values: rules }, options: { fallbackOutput: 'extra' } },
		});

		c.connect(previous, requestNode);
		c.connect(requestNode, check);
		c.connect(check.output(0), done);
		if (failed) c.connect(check.output(1), failed);

		if (attempt === attempts) {
			c.connect(check.output(continueOutput), timedOut);
			break;
		}

		const wait = c.addNode(`wait ${attempt}`, {
			type: WAIT_TYPE,
			typeVersion: WAIT_VERSION,
			parameters: { resume: 'timeInterval', amount: waitAmount(interval, attempt, options), unit },
		});
		c.connect(check.output(continueOutput), wait);
		previous = wait;
	}
}

function waitAmount(interval: string, attempt: number, options: IDataObject): string {
	if (options.backoff !== 'exponential') return `={{ ${interval} }}`;
	const grown = `${interval} * 2 ** ${attempt - 1}`;
	const max = typeof options.maxInterval === 'number' ? options.maxInterval : undefined;
	return max === undefined ? `={{ ${grown} }}` : `={{ Math.min(${grown}, ${max}) }}`;
}

export class PollUntilDone implements CompositeNodeType {
	description: INodeTypeDescription = {
		displayName: 'Poll Until Done',
		name: 'pollUntilDone',
		icon: 'fa:sync-alt',
		iconColor: 'blue',
		group: ['transform'],
		version: 1,
		engines: ['v2'],
		subtitle: '={{$parameter["method"] + ": " + $parameter["url"]}}',
		description: 'Sends an HTTP request again and again until the response says the work is done',
		defaults: {
			name: 'Poll Until Done',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: `={{ $parameter.onTimeout === "error" ? [{ type: "${NodeConnectionTypes.Main}", displayName: "Done" }] : [{ type: "${NodeConnectionTypes.Main}", displayName: "Done" }, { type: "${NodeConnectionTypes.Main}", displayName: "Timed Out" }] }}`,
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'httpSslAuth',
				required: true,
				displayOptions: { show: { provideSslCertificates: [true] } },
			},
		],
		properties: [
			{
				displayName: 'This node runs only on engine v2',
				name: 'engineNotice',
				type: 'notice',
				default: '',
			},
			...requestProperties,
			{
				displayName: 'Done When',
				name: 'doneWhen',
				type: 'filter',
				default: {},
				typeOptions: conditionsTypeOptions,
				description:
					'Conditions on the latest response. In these conditions, the current item is the response.',
			},
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				default: 5,
				typeOptions: { minValue: 0 },
				description: 'How long to wait between two requests',
			},
			{
				displayName: 'Interval Unit',
				name: 'intervalUnit',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Seconds', value: 'seconds' },
					{ name: 'Minutes', value: 'minutes' },
					{ name: 'Hours', value: 'hours' },
				],
				default: 'seconds',
			},
			{
				displayName: 'Max Attempts',
				name: 'maxAttempts',
				type: 'number',
				noDataExpression: true,
				default: 10,
				typeOptions: { minValue: 1, maxValue: MAX_ATTEMPTS },
				description: 'How many requests to send at most. This value must be fixed.',
			},
			{
				displayName: 'On Timeout',
				name: 'onTimeout',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Output to "Timed Out" Branch',
						value: 'output',
						description: 'Send the last response to a second output',
					},
					{ name: 'Throw Error', value: 'error', description: 'Fail the node' },
				],
				default: 'output',
			},
			{
				displayName: 'Stop on Failure',
				name: 'checkFailure',
				type: 'boolean',
				noDataExpression: true,
				default: false,
				description: 'Whether to stop with an error when the response shows that the work failed',
			},
			{
				displayName: 'Fail When',
				name: 'failWhen',
				type: 'filter',
				default: {},
				typeOptions: conditionsTypeOptions,
				displayOptions: { show: { checkFailure: [true] } },
				description:
					'Conditions on the latest response. In these conditions, the current item is the response.',
			},
			{
				displayName: 'Poll Options',
				name: 'pollOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Backoff',
						name: 'backoff',
						type: 'options',
						options: [
							{ name: 'None', value: 'none' },
							{
								name: 'Exponential',
								value: 'exponential',
								description: 'Double the interval after each attempt',
							},
						],
						default: 'none',
					},
					{
						displayName: 'Max Interval',
						name: 'maxInterval',
						type: 'number',
						default: 60,
						description: 'The longest interval when the backoff is exponential',
					},
					{
						displayName: 'Keep Polling on Request Errors',
						name: 'keepPollingOnError',
						type: 'boolean',
						default: false,
						description:
							'Whether to continue when a request fails. The error is then the response that the conditions check.',
					},
				],
			},
		],
	};

	composite: CompositeDefinition = { expand };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		throw new NodeOperationError(
			this.getNode(),
			'Poll Until Done runs only on engine v2. Run this workflow on engine v2, or build the loop with HTTP Request, If and Wait nodes.',
		);
	}
}
