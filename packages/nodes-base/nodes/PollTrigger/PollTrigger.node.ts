import {
	attachToolExpressionVariables,
	jsonParse,
	NodeConnectionTypes,
	NodeOperationError,
	setSafeObjectProperty,
	type GenericValue,
	type IDataObject,
	type IHttpRequestOptions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';

import {
	detectionProperties,
	GENERIC_AUTH_TYPES,
	requestProperties,
	sourceProperties,
} from './description';
import { poll } from './poller';
import type { FetchPage, PageRequest, PageResponse, PollConfig } from './poller';
import {
	hashScope,
	linkHeaderNext,
	missingRequestVariables,
	parseDate,
	parseId,
	usesDate,
	usesId,
	usesVariable,
	type ApiStyle,
	type PaginationMode,
} from './utils';

type PollStaticData = { scope?: string; poller?: unknown };

type Settings = {
	style: ApiStyle;
	pagination: PaginationMode;
	firstPage: number;
	pageSize: number;
	maxPages: number;
	maxItems: number;
	skewMs: number;
};

type Computed = { key: string; sortKey: number };

type FullResponse = { body: unknown; headers: IDataObject; statusCode: number };

type ConnectedTool = {
	schema?: unknown;
	func?: (args: IDataObject) => Promise<unknown>;
	invoke: (args: IDataObject) => Promise<unknown>;
};

const TOOL_ARGUMENT: Record<'offset' | 'pageNumber' | 'cursor' | 'nextUrl', string> = {
	offset: 'page_offset',
	pageNumber: 'page_number',
	cursor: 'page_cursor',
	nextUrl: 'page_cursor',
};

const TOOL_VARIABLE: Record<keyof typeof TOOL_ARGUMENT, string> = {
	offset: '$page.offset',
	pageNumber: '$page.number',
	cursor: '$page.cursor',
	nextUrl: '$page.cursor',
};

const SCOPE_PARAMETERS = [
	'source',
	'method',
	'url',
	'authentication',
	'genericAuthType',
	'queryParameters',
	'headerParameters',
	'jsonBody',
	'items',
	'itemKey',
	'apiStyle',
	'sortDate',
	'sortId',
	'pagination',
	'nextCursor',
	'firstPage',
	'nextUrl',
	'hasMore',
	'options.pageSize',
];

const REQUEST_PARAMETERS = ['url', 'queryParameters', 'headerParameters', 'jsonBody'];

const isDataObject = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const toItem = (value: unknown): IDataObject => {
	if (isDataObject(value)) return value;
	if (
		typeof value === 'object' ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return { value };
	}
	return { value: String(value) };
};

const isConnectedTool = (value: unknown): value is ConnectedTool =>
	typeof value === 'object' &&
	value !== null &&
	'invoke' in value &&
	typeof value.invoke === 'function';

const schemaKeys = (schema: unknown): string[] | undefined =>
	typeof schema === 'object' && schema !== null && 'shape' in schema && isDataObject(schema.shape)
		? Object.keys(schema.shape)
		: undefined;

const isEmpty = (value: unknown) => value === undefined || value === null || value === '';

const toPollerPagination = (pagination: PaginationMode): PollConfig['pagination'] => {
	if (pagination === 'offset') return 'offset';
	if (pagination === 'pageNumber') return 'page';
	return 'token';
};

const pageKeys = (request: PageRequest, firstPage: number): IDataObject => {
	if (request.kind === 'offset') {
		return {
			offset: request.offset,
			number: Math.floor(request.offset / request.limit) + firstPage,
			size: request.limit,
		};
	}
	if (request.kind === 'page') {
		return {
			offset: (request.page - 1) * request.limit,
			number: request.page - 1 + firstPage,
			size: request.limit,
		};
	}
	return { size: request.limit, cursor: request.token };
};

const firstRequest = (settings: Settings, since?: number): PageRequest => {
	const sinceField = since === undefined ? {} : { since };
	if (settings.pagination === 'offset') {
		return { kind: 'offset', offset: 0, limit: settings.pageSize, ...sinceField };
	}
	if (settings.pagination === 'pageNumber') {
		return { kind: 'page', page: 1, limit: settings.pageSize, ...sinceField };
	}
	return { kind: 'token', limit: settings.pageSize, ...sinceField };
};

function readSettings(this: IPollFunctions): Settings {
	return {
		style: this.getNodeParameter('apiStyle', 'latest') as ApiStyle,
		pagination: this.getNodeParameter('pagination', 'none') as PaginationMode,
		firstPage: this.getNodeParameter('firstPage', 1) as number,
		pageSize: this.getNodeParameter('options.pageSize', 50) as number,
		maxPages: this.getNodeParameter('options.maxPages', 5) as number,
		maxItems: this.getNodeParameter('options.maxItems', 500) as number,
		skewMs: (this.getNodeParameter('options.skewMinutes', 5) as number) * 60_000,
	};
}

function rawParameters(this: IPollFunctions, names: string[]): Record<string, unknown> {
	return Object.fromEntries(
		names.map((name) => [name, this.getNodeParameter(name, null, { rawExpressions: true })]),
	);
}

function checkRequest(this: IPollFunctions, settings: Settings) {
	const source = JSON.stringify(rawParameters.call(this, REQUEST_PARAMETERS));
	const problems = missingRequestVariables(source, settings.style, settings.pagination);
	if (problems.length > 0) {
		throw new NodeOperationError(this.getNode(), problems[0], {
			description: problems.join('. '),
		});
	}
}

function nameValues(this: IPollFunctions, name: string, additionalKeys: IDataObject): IDataObject {
	const entries = this.getNodeParameter(`${name}.parameters`, [], { additionalKeys }) as Array<{
		name: string;
		value: GenericValue;
	}>;
	const result: IDataObject = {};
	// An unset page variable (no cursor on the first page) must leave the parameter out, not send it empty.
	for (const entry of entries) {
		if (
			entry.name === '' ||
			entry.value === '' ||
			entry.value === undefined ||
			entry.value === null
		)
			continue;
		setSafeObjectProperty(result, entry.name, entry.value);
	}
	return result;
}

function requestKeysFor(request: PageRequest, settings: Settings): IDataObject {
	return {
		$page: pageKeys(request, settings.firstPage),
		$cursor: {
			since: request.since === undefined ? undefined : new Date(request.since).toISOString(),
		},
	};
}

function readPage(
	this: IPollFunctions,
	settings: Settings,
	computed: WeakMap<object, Computed>,
	requestKeys: IDataObject,
	response: FullResponse,
	resolveNext: (next: string) => string,
): PageResponse {
	const responseKeys: IDataObject = { ...requestKeys, $response: { ...response } };
	const rawItems = this.getNodeParameter('items', undefined, {
		additionalKeys: responseKeys,
	});
	if (!Array.isArray(rawItems)) {
		throw new NodeOperationError(this.getNode(), 'Items must resolve to an array', {
			description: `The Items expression returned ${rawItems === null ? 'null' : typeof rawItems}. Point it at the list in the response, for example {{ $response.body.data }}.`,
		});
	}
	const items = rawItems.map(toItem);

	items.forEach((item, index) => {
		const options = { inputData: [{ json: item }], additionalKeys: responseKeys };
		const key: unknown = this.getNodeParameter('itemKey', undefined, options);
		if (isEmpty(key)) {
			throw new NodeOperationError(this.getNode(), `The Item Key of item ${index} is empty`);
		}
		let sortKey: number | string = 0;
		if (usesDate(settings.style)) {
			sortKey = parseDate(this.getNodeParameter('sortDate', undefined, options));
		} else if (usesId(settings.style)) {
			sortKey = parseId(this.getNodeParameter('sortId', undefined, options));
		}
		if (typeof sortKey === 'string') {
			throw new NodeOperationError(this.getNode(), `Item ${index}: ${sortKey}`);
		}
		computed.set(item, {
			key: typeof key === 'object' ? JSON.stringify(key) : String(key),
			sortKey,
		});
	});

	const hasMoreSource = this.getNodeParameter('hasMore', '', { rawExpressions: true });
	const explicitHasMore = isEmpty(hasMoreSource)
		? undefined
		: this.getNodeParameter('hasMore', false, { additionalKeys: responseKeys });

	let nextToken: string | undefined;
	if (settings.pagination === 'cursor') {
		const cursor: unknown = this.getNodeParameter('nextCursor', '', {
			additionalKeys: responseKeys,
		});
		nextToken = isEmpty(cursor) ? undefined : String(cursor);
	} else if (settings.pagination === 'nextUrl') {
		const configured: unknown = this.getNodeParameter('nextUrl', '', {
			additionalKeys: responseKeys,
		});
		const next = isEmpty(configured) ? linkHeaderNext(response.headers) : String(configured);
		if (next !== undefined) nextToken = resolveNext(next);
	}

	let hasMore: boolean;
	if (explicitHasMore !== undefined) {
		hasMore = explicitHasMore === true || explicitHasMore === 'true';
	} else if (settings.pagination === 'cursor' || settings.pagination === 'nextUrl') {
		hasMore = nextToken !== undefined;
	} else if (settings.pagination === 'none') {
		hasMore = false;
	} else {
		hasMore = items.length > 0;
	}

	return { items, hasMore, ...(nextToken === undefined ? {} : { nextToken }) };
}

function createFetchPage(
	this: IPollFunctions,
	settings: Settings,
	computed: WeakMap<object, Computed>,
): FetchPage {
	const method = this.getNodeParameter('method', 'GET') as 'GET' | 'POST';
	const authentication = this.getNodeParameter('authentication', 'none') as string;
	const credentialType =
		authentication === 'genericCredentialType'
			? (this.getNodeParameter('genericAuthType', 'httpHeaderAuth') as string)
			: undefined;
	if (credentialType && !GENERIC_AUTH_TYPES.some((type) => type === credentialType)) {
		throw new NodeOperationError(this.getNode(), `Unsupported auth type "${credentialType}"`);
	}
	let origin: string | undefined;

	const resolveUrl = (additionalKeys: IDataObject) => {
		const url = String(this.getNodeParameter('url', '', { additionalKeys })).trim();
		if (!/^https?:\/\//.test(url)) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid URL: ${url}. URL must start with "http" or "https".`,
			);
		}
		origin = new URL(url).origin;
		return url;
	};

	const send = async (options: IHttpRequestOptions): Promise<FullResponse> => {
		const response: unknown = credentialType
			? await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options)
			: await this.helpers.httpRequest(options);
		if (!isDataObject(response)) {
			throw new NodeOperationError(this.getNode(), 'The request returned no response');
		}
		return {
			body: response.body,
			headers: isDataObject(response.headers) ? response.headers : {},
			statusCode: Number(response.statusCode),
		};
	};

	return async (request: PageRequest): Promise<PageResponse> => {
		const requestKeys = requestKeysFor(request, settings);

		const nextUrl =
			settings.pagination === 'nextUrl' && request.kind === 'token' ? request.token : undefined;
		let url: string;
		let qs: IDataObject = {};
		if (nextUrl) {
			if (origin === undefined) resolveUrl(requestKeys);
			if (new URL(nextUrl).origin !== origin) {
				throw new NodeOperationError(
					this.getNode(),
					`The next URL ${nextUrl} is not on the origin of the request (${origin})`,
				);
			}
			url = nextUrl;
		} else {
			url = resolveUrl(requestKeys);
			qs = nameValues.call(this, 'queryParameters', requestKeys);
		}

		let body: IDataObject | undefined;
		if (method === 'POST') {
			const rawBody = this.getNodeParameter('jsonBody', '', { additionalKeys: requestKeys });
			if (isDataObject(rawBody)) body = rawBody;
			else if (typeof rawBody === 'string' && rawBody.trim() !== '') {
				body = jsonParse<IDataObject>(rawBody, {
					errorMessage: 'The JSON body is not valid JSON',
				});
			}
		}

		const response = await send({
			method,
			url,
			qs,
			headers: nameValues.call(this, 'headerParameters', requestKeys),
			body,
			json: true,
			returnFullResponse: true,
		});

		return readPage.call(
			this,
			settings,
			computed,
			requestKeys,
			response,
			(next) => new URL(next, url).href,
		);
	};
}

function checkTool(this: IPollFunctions, tool: ConnectedTool, settings: Settings) {
	const keys = schemaKeys(tool.schema);
	const toolParameters = this.getParentNodes(this.getNode().name, {
		connectionType: NodeConnectionTypes.AiTool,
		depth: 1,
		includeNodeParameters: true,
	}).map((node) => node.parameters);
	if (keys === undefined && toolParameters.length === 0) return;
	const source = JSON.stringify(toolParameters);
	const uses = (variable: string, argument: string) =>
		usesVariable(source, variable) || (keys?.includes(argument) ?? false);
	const problems: string[] = [];
	if (settings.pagination !== 'none') {
		const variable = TOOL_VARIABLE[settings.pagination];
		const argument = TOOL_ARGUMENT[settings.pagination];
		if (!uses(variable, argument)) {
			problems.push(
				`The connected tool does not use {{ ${variable} }} or {{ $fromAI('${argument}') }}`,
			);
		}
	}
	if (settings.style === 'oldestFirstSince' && !uses('$cursor.since', 'since')) {
		problems.push("The connected tool does not use {{ $cursor.since }} or {{ $fromAI('since') }}");
	}
	if (problems.length > 0) {
		throw new NodeOperationError(this.getNode(), problems[0], {
			description: problems.join('. '),
		});
	}
}

function toolResponse(this: IPollFunctions, output: unknown): FullResponse {
	const parsed =
		typeof output === 'string'
			? jsonParse<unknown>(output, {
					errorMessage: `The connected tool did not return JSON: ${output.slice(0, 200)}`,
				})
			: output;
	const entries = Array.isArray(parsed) ? parsed : [parsed];
	const [first] = entries;
	if (entries.length === 1 && isDataObject(first) && 'body' in first && 'headers' in first) {
		return {
			body: first.body,
			headers: isDataObject(first.headers) ? first.headers : {},
			statusCode: Number(first.statusCode ?? 200),
		};
	}
	return { body: entries.length === 1 ? first : entries, headers: {}, statusCode: 200 };
}

function createToolFetchPage(
	this: IPollFunctions,
	tool: ConnectedTool,
	settings: Settings,
	computed: WeakMap<object, Computed>,
): FetchPage {
	const keys = schemaKeys(tool.schema);
	const call = async (args: IDataObject, variables: IDataObject): Promise<unknown> => {
		if (typeof tool.func === 'function') {
			return await tool.func(attachToolExpressionVariables(args, variables));
		}
		const declared =
			keys === undefined
				? args
				: Object.fromEntries(Object.entries(args).filter(([name]) => keys.includes(name)));
		return await tool.invoke(declared);
	};

	return async (request: PageRequest): Promise<PageResponse> => {
		const requestKeys = requestKeysFor(request, settings);
		const page = pageKeys(request, settings.firstPage);
		const args: IDataObject = {
			page_offset: page.offset,
			page_number: page.number,
			page_size: page.size,
			page_cursor: page.cursor,
			since: request.since === undefined ? undefined : new Date(request.since).toISOString(),
		};
		const definedArgs = Object.fromEntries(
			Object.entries(args).filter(([, value]) => value !== undefined),
		);
		const response = toolResponse.call(this, await call(definedArgs, requestKeys));
		return readPage.call(this, settings, computed, requestKeys, response, (next) => {
			try {
				return new URL(next).href;
			} catch {
				throw new NodeOperationError(this.getNode(), `The next URL ${next} is not an absolute URL`);
			}
		});
	};
}

export class PollTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Poll Trigger',
		name: 'pollTrigger',
		icon: { light: 'file:httprequest.svg', dark: 'file:httprequest.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Polls an API or a connected node and starts a workflow for each new item',
		subtitle:
			'={{$parameter["source"] === "tool" ? "Connected node" : $parameter["method"] + ": " + $parameter["url"]}}',
		defaults: { name: 'Poll Trigger' },
		credentials: GENERIC_AUTH_TYPES.map((name) => ({
			name,
			required: true,
			displayOptions: {
				show: { authentication: ['genericCredentialType'], genericAuthType: [name] },
			},
		})),
		polling: true,
		persistActivationCursor: true,
		inputs: [
			{
				type: NodeConnectionTypes.AiTool,
				displayName: 'Source',
				maxConnections: 1,
				required: false,
			},
		],
		outputs: [NodeConnectionTypes.Main],
		properties: [...sourceProperties, ...requestProperties, ...detectionProperties],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const settings = readSettings.call(this);
		const computed = new WeakMap<object, Computed>();
		let fetchPage: FetchPage;
		if (this.getNodeParameter('source', 'request') === 'tool') {
			const tool = await this.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
			if (!isConnectedTool(tool)) {
				throw new NodeOperationError(this.getNode(), 'Connect a tool to the Source input', {
					description: 'Source is Connected Tool, so the trigger needs one tool to fetch each page',
				});
			}
			checkTool.call(this, tool, settings);
			fetchPage = createToolFetchPage.call(this, tool, settings, computed);
		} else {
			checkRequest.call(this, settings);
			fetchPage = createFetchPage.call(this, settings, computed);
		}
		const lookup = (item: object): Computed => {
			const found = computed.get(item);
			if (!found) {
				throw new NodeOperationError(this.getNode(), 'An item reached the poller unevaluated');
			}
			return found;
		};

		if (this.getMode() === 'manual') {
			const since =
				settings.style === 'oldestFirstSince' ? Date.now() - 7 * 24 * 60 * 60 * 1000 : undefined;
			const page = await fetchPage(firstRequest(settings, since));
			const items = page.items.filter(isDataObject).map((item) => {
				const { key, sortKey } = lookup(item);
				const shownSortKey = usesDate(settings.style)
					? new Date(sortKey).toISOString()
					: usesId(settings.style)
						? sortKey
						: null;
				return { ...item, _poll: { key, sortKey: shownSortKey } };
			});
			return items.length > 0 ? [this.helpers.returnJsonArray(items)] : null;
		}

		const staticData = this.getWorkflowStaticData('node') as PollStaticData;
		const scope = hashScope(rawParameters.call(this, SCOPE_PARAMETERS));
		if (staticData.scope !== scope) {
			staticData.scope = scope;
			delete staticData.poller;
		}

		const config: PollConfig = {
			order:
				settings.style === 'latest'
					? 'latest'
					: settings.style.startsWith('newestFirst')
						? 'newestFirst'
						: 'oldestFirst',
			pagination: toPollerPagination(settings.pagination),
			pageSize: settings.pageSize,
			maxPages: settings.maxPages,
			maxItems: settings.maxItems,
			key: (item) => lookup(item).key,
			timestamp: (item) => lookup(item).sortKey,
			useSince: settings.style === 'oldestFirstSince',
			sortKeyIsTime: !usesId(settings.style),
			clock: () => Date.now(),
			skewMs: settings.skewMs,
			overlap: 2,
			maxStepBack: 3,
			seenLimit: Math.min(5000, 2 * settings.maxPages * settings.pageSize),
		};

		const result = await poll(config, staticData.poller, fetchPage);
		staticData.poller = result.state;
		for (const warning of result.warnings) this.logger.warn(`Poll Trigger: ${warning}`);

		const items = result.items.filter(isDataObject);
		return items.length > 0 ? [this.helpers.returnJsonArray(items)] : null;
	}
}
