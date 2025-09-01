import {
	AGENT_LANGCHAIN_NODE_TYPE,
	AGENT_TOOL_LANGCHAIN_NODE_TYPE,
	AI_TRANSFORM_NODE_TYPE,
	CHAIN_LLM_LANGCHAIN_NODE_TYPE,
	CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	CODE_NODE_TYPE,
	EVALUATION_NODE_TYPE,
	EVALUATION_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_NODE_TYPE,
	FREE_AI_CREDITS_ERROR_TYPE,
	FREE_AI_CREDITS_USED_ALL_CREDITS_ERROR_CODE,
	FROM_AI_AUTO_GENERATED_MARKER,
	HTTP_REQUEST_NODE_TYPE,
	HTTP_REQUEST_TOOL_LANGCHAIN_NODE_TYPE,
	LANGCHAIN_CUSTOM_TOOLS,
	MERGE_NODE_TYPE,
	OPEN_AI_API_CREDENTIAL_TYPE,
	OPENAI_LANGCHAIN_NODE_TYPE,
	STICKY_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
} from './constants';
import { ApplicationError } from '@n8n/errors';
import type { NodeApiError } from './errors/node-api.error';
import type {
	IConnection,
	INode,
	INodeNameIndex,
	INodesGraph,
	INodeGraphItem,
	INodesGraphResult,
	IWorkflowBase,
	INodeTypes,
	IDataObject,
	IRunData,
	ITaskData,
	IRun,
	INodeParameterResourceLocator,
} from './interfaces';
import { NodeConnectionTypes } from './interfaces';
import { getNodeParameters } from './node-helpers';
import { jsonParse } from './utils';
import { DEFAULT_EVALUATION_METRIC } from './evaluation-helpers';

const isNodeApiError = (error: unknown): error is NodeApiError =>
	typeof error === 'object' && error !== null && 'name' in error && error?.name === 'NodeApiError';

export function getNodeTypeForName(workflow: IWorkflowBase, nodeName: string): INode | undefined {
	return workflow.nodes.find((node) => node.name === nodeName);
}

export function isNumber(value: unknown): value is number {
	return typeof value === 'number';
}

const countPlaceholders = (text: string) => {
	const placeholder = /(\{[a-zA-Z0-9_]+\})/g;
	let returnData = 0;

	try {
		const matches = text.matchAll(placeholder);
		for (const _ of matches) returnData++;
	} catch (error) {}

	return returnData;
};

const countPlaceholdersInParameters = (parameters: IDataObject[]) => {
	let returnData = 0;

	for (const parameter of parameters) {
		if (!parameter.value) {
			//count parameters provided by model
			returnData++;
		} else {
			//check if any placeholders in user provided value
			returnData += countPlaceholders(String(parameter.value));
		}
	}

	return returnData;
};

type XYPosition = [number, number];

function areOverlapping(
	topLeft: XYPosition,
	bottomRight: XYPosition,
	targetPos: XYPosition,
): boolean {
	return (
		targetPos[0] > topLeft[0] &&
		targetPos[1] > topLeft[1] &&
		targetPos[0] < bottomRight[0] &&
		targetPos[1] < bottomRight[1]
	);
}

const URL_PARTS_REGEX = /(?<protocolPlusDomain>.*?\..*?)(?<pathname>\/.*)/;

export function getDomainBase(raw: string, urlParts = URL_PARTS_REGEX): string {
	try {
		const url = new URL(raw);

		return [url.protocol, url.hostname].join('//');
	} catch {
		const match = urlParts.exec(raw);

		if (!match?.groups?.protocolPlusDomain) return '';

		return match.groups.protocolPlusDomain;
	}
}

function isSensitive(segment: string) {
	if (/^v\d+$/.test(segment)) return false;

	return /%40/.test(segment) || /\d/.test(segment) || /^[0-9A-F]{8}/i.test(segment);
}

export const ANONYMIZATION_CHARACTER = '*';

function sanitizeRoute(raw: string, check = isSensitive, char = ANONYMIZATION_CHARACTER) {
	return raw
		.split('/')
		.map((segment) => (check(segment) ? char.repeat(segment.length) : segment))
		.join('/');
}

/**
 * Return pathname plus query string from URL, anonymizing IDs in route and query params.
 */
export function getDomainPath(raw: string, urlParts = URL_PARTS_REGEX): string {
	try {
		const url = new URL(raw);

		if (!url.hostname) throw new ApplicationError('Malformed URL');

		return sanitizeRoute(url.pathname);
	} catch {
		const match = urlParts.exec(raw);

		if (!match?.groups?.pathname) return '';

		// discard query string
		const route = match.groups.pathname.split('?').shift() as string;

		return sanitizeRoute(route);
	}
}

function getNumberOfItemsInRuns(runs: ITaskData[]): number {
	return runs.reduce((total, run) => {
		const data = run.data ?? {};
		let count = 0;
		Object.keys(data).forEach((type) => {
			const conn = data[type] ?? [];
			conn.forEach((branch) => {
				count += (branch ?? []).length;
			});
		});

		return total + count;
	}, 0);
}

export function generateNodesGraph(
	workflow: Partial<IWorkflowBase>,
	nodeTypes: INodeTypes,
	options?: {
		sourceInstanceId?: string;
		nodeIdMap?: { [curr: string]: string };
		isCloudDeployment?: boolean;
		runData?: IRunData;
	},
): INodesGraphResult {
	const { runData } = options ?? {};
	const nodeGraph: INodesGraph = {
		node_types: [],
		node_connections: [],
		nodes: {},
		notes: {},
		is_pinned: Object.keys(workflow.pinData ?? {}).length > 0,
	};
	const nameIndices: INodeNameIndex = {};
	const webhookNodeNames: string[] = [];
	const evaluationTriggerNodeNames: string[] = [];

	const nodes = (workflow.nodes ?? []).filter((node) => node.type === STICKY_NODE_TYPE);
	const otherNodes = (workflow.nodes ?? []).filter((node) => node.type !== STICKY_NODE_TYPE);

	nodes.forEach((stickyNote: INode, index: number) => {
		const stickyType = nodeTypes.getByNameAndVersion(STICKY_NODE_TYPE, stickyNote.typeVersion);
		if (!stickyType) {
			return;
		}

		let nodeParameters: IDataObject = {};

		try {
			nodeParameters =
				getNodeParameters(
					stickyType.description.properties,
					stickyNote.parameters,
					true,
					false,
					stickyNote,
					stickyType.description,
				) ?? {};
		} catch {
			// prevent node param resolution from failing graph generation
		}

		const height: number = typeof nodeParameters.height === 'number' ? nodeParameters.height : 0;
		const width: number = typeof nodeParameters.width === 'number' ? nodeParameters.width : 0;

		const topLeft = stickyNote.position;
		const bottomRight: [number, number] = [topLeft[0] + width, topLeft[1] + height];
		const overlapping = Boolean(
			otherNodes.find((node) => areOverlapping(topLeft, bottomRight, node.position)),
		);
		nodeGraph.notes[index] = {
			overlapping,
			position: topLeft,
			height,
			width,
		};
	});

	// eslint-disable-next-line complexity
	otherNodes.forEach((node: INode, index: number) => {
		nodeGraph.node_types.push(node.type);
		const nodeItem: INodeGraphItem = {
			id: node.id,
			type: node.type,
			version: node.typeVersion,
			position: node.position,
		};

		if (runData?.[node.name]) {
			const runs = runData[node.name] ?? [];
			nodeItem.runs = runs.length;

			nodeItem.items_total = getNumberOfItemsInRuns(runs);
		}

		if (options?.sourceInstanceId) {
			nodeItem.src_instance_id = options.sourceInstanceId;
		}

		if (node.id && options?.nodeIdMap?.[node.id]) {
			nodeItem.src_node_id = options.nodeIdMap[node.id];
		}

		if (node.type === AI_TRANSFORM_NODE_TYPE && options?.isCloudDeployment) {
			nodeItem.prompts = { instructions: node.parameters.instructions as string };
		} else if (node.type === AGENT_LANGCHAIN_NODE_TYPE) {
			nodeItem.agent = (node.parameters.agent as string) ?? 'toolsAgent';

			if (node.typeVersion >= 2.1) {
				const options = node.parameters?.options;
				if (
					typeof options === 'object' &&
					options &&
					'enableStreaming' in options &&
					options.enableStreaming === false
				) {
					nodeItem.is_streaming = false;
				} else {
					nodeItem.is_streaming = true;
				}
			}
		} else if (node.type === MERGE_NODE_TYPE) {
			nodeItem.operation = node.parameters.mode as string;

			if (options?.isCloudDeployment && node.parameters.mode === 'combineBySql') {
				nodeItem.sql = node.parameters.query as string;
			}
		} else if (node.type === HTTP_REQUEST_NODE_TYPE && node.typeVersion === 1) {
			try {
				nodeItem.domain = new URL(node.parameters.url as string).hostname;
			} catch {
				nodeItem.domain = getDomainBase(node.parameters.url as string);
			}
		} else if (node.type === HTTP_REQUEST_NODE_TYPE && node.typeVersion > 1) {
			const { authentication } = node.parameters as { authentication: string };

			nodeItem.credential_type = {
				none: 'none',
				genericCredentialType: node.parameters.genericAuthType as string,
				predefinedCredentialType: node.parameters.nodeCredentialType as string,
			}[authentication];

			nodeItem.credential_set = node.credentials ? Object.keys(node.credentials).length > 0 : false;

			const { url } = node.parameters as { url: string };

			nodeItem.domain_base = getDomainBase(url);
			nodeItem.domain_path = getDomainPath(url);
			nodeItem.method = node.parameters.requestMethod as string;
		} else if (HTTP_REQUEST_TOOL_LANGCHAIN_NODE_TYPE === node.type) {
			if (!nodeItem.toolSettings) nodeItem.toolSettings = {};

			nodeItem.toolSettings.url_type = 'other';
			nodeItem.toolSettings.uses_auth = false;
			nodeItem.toolSettings.placeholders = 0;
			nodeItem.toolSettings.query_from_model_only = false;
			nodeItem.toolSettings.headers_from_model_only = false;
			nodeItem.toolSettings.body_from_model_only = false;

			const toolUrl = (node.parameters?.url as string) ?? '';
			nodeItem.toolSettings.placeholders += countPlaceholders(toolUrl);

			const authType = (node.parameters?.authentication as string) ?? '';

			if (authType && authType !== 'none') {
				nodeItem.toolSettings.uses_auth = true;
			}

			if (toolUrl.startsWith('{') && toolUrl.endsWith('}')) {
				nodeItem.toolSettings.url_type = 'any';
			} else if (toolUrl.includes('google.com')) {
				nodeItem.toolSettings.url_type = 'google';
			}

			if (node.parameters?.sendBody) {
				if (node.parameters?.specifyBody === 'model') {
					nodeItem.toolSettings.body_from_model_only = true;
				}

				if (node.parameters?.jsonBody) {
					nodeItem.toolSettings.placeholders += countPlaceholders(
						node.parameters?.jsonBody as string,
					);
				}

				if (node.parameters?.parametersBody) {
					const parameters = (node.parameters?.parametersBody as IDataObject)
						.values as IDataObject[];

					nodeItem.toolSettings.placeholders += countPlaceholdersInParameters(parameters);
				}
			}

			if (node.parameters?.sendHeaders) {
				if (node.parameters?.specifyHeaders === 'model') {
					nodeItem.toolSettings.headers_from_model_only = true;
				}

				if (node.parameters?.jsonHeaders) {
					nodeItem.toolSettings.placeholders += countPlaceholders(
						node.parameters?.jsonHeaders as string,
					);
				}

				if (node.parameters?.parametersHeaders) {
					const parameters = (node.parameters?.parametersHeaders as IDataObject)
						.values as IDataObject[];

					nodeItem.toolSettings.placeholders += countPlaceholdersInParameters(parameters);
				}
			}

			if (node.parameters?.sendQuery) {
				if (node.parameters?.specifyQuery === 'model') {
					nodeItem.toolSettings.query_from_model_only = true;
				}

				if (node.parameters?.jsonQuery) {
					nodeItem.toolSettings.placeholders += countPlaceholders(
						node.parameters?.jsonQuery as string,
					);
				}

				if (node.parameters?.parametersQuery) {
					const parameters = (node.parameters?.parametersQuery as IDataObject)
						.values as IDataObject[];

					nodeItem.toolSettings.placeholders += countPlaceholdersInParameters(parameters);
				}
			}
		} else if (node.type === WEBHOOK_NODE_TYPE) {
			webhookNodeNames.push(node.name);
			const responseMode = node.parameters?.responseMode;
			nodeItem.response_mode = typeof responseMode === 'string' ? responseMode : 'onReceived';
		} else if (node.type === CHAT_TRIGGER_NODE_TYPE) {
			// Capture streaming response mode parameter
			const options = node.parameters?.options;
			if (
				typeof options === 'object' &&
				options &&
				'responseMode' in options &&
				typeof options.responseMode === 'string'
			) {
				nodeItem.response_mode = options.responseMode;
			}
			// Capture public chat setting
			const isPublic = node.parameters?.public;
			if (typeof isPublic === 'boolean') {
				nodeItem.public_chat = isPublic;
			}
		} else if (
			node.type === EXECUTE_WORKFLOW_NODE_TYPE ||
			node.type === WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE
		) {
			if (node.parameters?.workflowId) {
				nodeItem.workflow_id = node.parameters?.workflowId as string;
			}
		} else if (node.type === EVALUATION_TRIGGER_NODE_TYPE) {
			evaluationTriggerNodeNames.push(node.name);
		} else if (
			node.type === EVALUATION_NODE_TYPE &&
			options?.isCloudDeployment &&
			node.parameters?.operation === 'setMetrics'
		) {
			const metrics = node.parameters?.metrics as IDataObject | undefined;

			// If metrics are not defined, it means the node is using preconfigured metric
			if (!metrics) {
				const predefinedMetricKey =
					(node.parameters?.metric as string | undefined) ?? DEFAULT_EVALUATION_METRIC;
				nodeItem.metric_names = [predefinedMetricKey];
			} else {
				nodeItem.metric_names = (metrics.assignments as Array<{ name: string }> | undefined)?.map(
					(metric: { name: string }) => metric.name,
				);
			}
		} else if (node.type === CODE_NODE_TYPE) {
			const { language } = node.parameters;
			nodeItem.language =
				language === undefined ? 'javascript' : language === 'python' ? 'python' : 'unknown';
		} else {
			try {
				const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
				if (nodeType) {
					const nodeParameters = getNodeParameters(
						nodeType.description.properties,
						node.parameters,
						true,
						false,
						node,
						nodeType.description,
					);

					if (nodeParameters) {
						const keys: Array<'operation' | 'resource' | 'mode'> = [
							'operation',
							'resource',
							'mode',
						];
						keys.forEach((key) => {
							if (nodeParameters.hasOwnProperty(key)) {
								nodeItem[key] = nodeParameters[key]?.toString();
							}
						});
					}
				}
			} catch (e: unknown) {
				if (
					!(
						e instanceof Error &&
						typeof e.message === 'string' &&
						e.message.includes('Unrecognized node type')
					)
				) {
					throw e;
				}
			}
		}

		if (options?.isCloudDeployment === true) {
			if (node.type === OPENAI_LANGCHAIN_NODE_TYPE) {
				nodeItem.prompts =
					(((node.parameters?.messages as IDataObject) ?? {}).values as IDataObject[]) ?? [];
			}

			if (node.type === AGENT_LANGCHAIN_NODE_TYPE || node.type === AGENT_TOOL_LANGCHAIN_NODE_TYPE) {
				const prompts: IDataObject = {};

				if (node.parameters?.text) {
					prompts.text = node.parameters.text as string;
				}
				const nodeOptions = node.parameters?.options as IDataObject;

				if (nodeOptions) {
					const optionalMessagesKeys = [
						'humanMessage',
						'systemMessage',
						'humanMessageTemplate',
						'prefix',
						'suffixChat',
						'suffix',
						'prefixPrompt',
						'suffixPrompt',
					];

					for (const key of optionalMessagesKeys) {
						if (nodeOptions[key]) {
							prompts[key] = nodeOptions[key] as string;
						}
					}
				}

				if (Object.keys(prompts).length) {
					nodeItem.prompts = prompts;
				}
			}

			if (node.type === CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE) {
				nodeItem.prompts = (
					(((node.parameters?.options as IDataObject) ?? {})
						.summarizationMethodAndPrompts as IDataObject) ?? {}
				).values as IDataObject;
			}

			if (LANGCHAIN_CUSTOM_TOOLS.includes(node.type)) {
				nodeItem.prompts = {
					description: (node.parameters?.description as string) ?? '',
				};
			}

			if (node.type === CHAIN_LLM_LANGCHAIN_NODE_TYPE) {
				nodeItem.prompts =
					(((node.parameters?.messages as IDataObject) ?? {}).messageValues as IDataObject[]) ?? [];
			}

			if (node.type === MERGE_NODE_TYPE && node.parameters?.operation === 'combineBySql') {
				nodeItem.sql = node.parameters?.query as string;
			}
		}

		nodeGraph.nodes[index.toString()] = nodeItem;
		nameIndices[node.name] = index.toString();
	});

	const getGraphConnectionItem = (startNode: string, connectionItem: IConnection) => {
		return { start: nameIndices[startNode], end: nameIndices[connectionItem.node] };
	};

	Object.keys(workflow.connections ?? []).forEach((nodeName) => {
		const connections = workflow.connections?.[nodeName];
		if (!connections) {
			return;
		}

		Object.keys(connections).forEach((key) => {
			connections[key].forEach((element) => {
				(element ?? []).forEach((element2) => {
					nodeGraph.node_connections.push(getGraphConnectionItem(nodeName, element2));
				});
			});
		});
	});

	return { nodeGraph, nameIndices, webhookNodeNames, evaluationTriggerNodeNames };
}

export function extractLastExecutedNodeCredentialData(
	runData: IRun,
): null | { credentialId: string; credentialType: string } {
	const nodeCredentials = runData?.data?.executionData?.nodeExecutionStack?.[0]?.node?.credentials;

	if (!nodeCredentials) return null;

	const credentialType = Object.keys(nodeCredentials)[0] ?? null;

	if (!credentialType) return null;

	const { id } = nodeCredentials[credentialType];

	if (!id) return null;

	return { credentialId: id, credentialType };
}

export const userInInstanceRanOutOfFreeAiCredits = (runData: IRun): boolean => {
	const credentials = extractLastExecutedNodeCredentialData(runData);

	if (!credentials) return false;

	if (credentials.credentialType !== OPEN_AI_API_CREDENTIAL_TYPE) return false;

	const { error } = runData.data.resultData;

	if (!isNodeApiError(error) || !error.messages[0]) return false;

	const rawErrorResponse = error.messages[0].replace(`${error.httpCode} -`, '');

	try {
		const errorResponse = jsonParse<{ error: { code: number; type: string } }>(rawErrorResponse);
		if (
			errorResponse?.error?.type === FREE_AI_CREDITS_ERROR_TYPE &&
			errorResponse.error.code === FREE_AI_CREDITS_USED_ALL_CREDITS_ERROR_CODE
		) {
			return true;
		}
	} catch {
		return false;
	}

	return false;
};

export type FromAICount = {
	aiNodeCount: number;
	aiToolCount: number;
	fromAIOverrideCount: number;
	fromAIExpressionCount: number;
};

export function resolveAIMetrics(nodes: INode[], nodeTypes: INodeTypes): FromAICount | {} {
	const resolvedNodes = nodes
		.map((x) => [x, nodeTypes.getByNameAndVersion(x.type, x.typeVersion)] as const)
		.filter((x) => !!x[1]?.description);

	const aiNodeCount = resolvedNodes.reduce(
		(acc, x) => acc + Number(x[1].description.codex?.categories?.includes('AI')),
		0,
	);

	if (aiNodeCount === 0) return {};

	let fromAIOverrideCount = 0;
	let fromAIExpressionCount = 0;

	const tools = resolvedNodes.filter((node) =>
		node[1].description.codex?.subcategories?.AI?.includes('Tools'),
	);

	for (const [node, _] of tools) {
		// FlatMap to support values in resourceLocators
		const values = Object.values(node.parameters).flatMap((param) => {
			if (param && typeof param === 'object' && 'value' in param) param = param.value;
			return typeof param === 'string' ? param : [];
		});

		// Note that we don't match the i in `fromAI` to support lower case i (though we miss fromai)
		const overrides = values.reduce(
			(acc, value) => acc + Number(value.startsWith(`={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromA`)),
			0,
		);

		fromAIOverrideCount += overrides;
		// check for = to avoid scanning lengthy text fields
		// this will re-count overrides
		fromAIExpressionCount +=
			values.reduce(
				(acc, value) => acc + Number(value[0] === '=' && value.includes('$fromA', 2)),
				0,
			) - overrides;
	}

	return {
		aiNodeCount,
		aiToolCount: tools.length,
		fromAIOverrideCount,
		fromAIExpressionCount,
	};
}

export type VectorStoreMetrics = {
	insertedIntoVectorStore: boolean;
	queriedDataFromVectorStore: boolean;
};

export function resolveVectorStoreMetrics(
	nodes: INode[],
	nodeTypes: INodeTypes,
	run: IRun,
): VectorStoreMetrics | {} {
	const resolvedNodes = nodes
		.map((x) => [x, nodeTypes.getByNameAndVersion(x.type, x.typeVersion)] as const)
		.filter((x) => !!x[1]?.description);

	const vectorStores = resolvedNodes.filter(
		(x) =>
			x[1].description.codex?.categories?.includes('AI') &&
			x[1].description.codex?.subcategories?.AI?.includes('Vector Stores'),
	);

	if (vectorStores.length === 0) return {};

	const runData = run?.data?.resultData?.runData;
	const succeededVectorStores = vectorStores.filter((x) =>
		runData?.[x[0].name]?.some((execution) => execution.executionStatus === 'success'),
	);

	const insertingVectorStores = succeededVectorStores.filter(
		(x) => x[0].parameters?.mode === 'insert',
	);
	const retrievingVectorStores = succeededVectorStores.filter((x) =>
		['retrieve-as-tool', 'retrieve', 'load'].find((y) => y === x[0].parameters?.mode),
	);

	return {
		insertedIntoVectorStore: insertingVectorStores.length > 0,
		queriedDataFromVectorStore: retrievingVectorStores.length > 0,
	};
}

type AgentNodeStructuredOutputErrorInfo = {
	output_parser_fail_reason?: string;
	model_name?: string;
	num_tools?: number;
};

/**
 * Extract additional debug information if the last executed node was an agent node
 */
export function extractLastExecutedNodeStructuredOutputErrorInfo(
	workflow: IWorkflowBase,
	nodeTypes: INodeTypes,
	runData: IRun,
): AgentNodeStructuredOutputErrorInfo {
	const info: AgentNodeStructuredOutputErrorInfo = {};

	if (runData?.data.resultData.error && runData.data.resultData.lastNodeExecuted) {
		const lastNode = getNodeTypeForName(workflow, runData.data.resultData.lastNodeExecuted);

		if (lastNode !== undefined) {
			if (lastNode.type === AGENT_LANGCHAIN_NODE_TYPE && lastNode.parameters.hasOutputParser) {
				// Add additional debug info for agent node structured output errors
				const agentOutputError = runData.data.resultData.runData[lastNode.name]?.[0]?.error;
				if (
					agentOutputError &&
					agentOutputError.message === "Model output doesn't fit required format"
				) {
					info.output_parser_fail_reason = agentOutputError.context
						?.outputParserFailReason as string;
				}

				if (workflow.connections) {
					// Count connected tools
					info.num_tools =
						Object.keys(workflow.connections).filter((node) =>
							workflow.connections[node]?.[NodeConnectionTypes.AiTool]?.[0]?.some(
								(connectedNode) => connectedNode.node === lastNode.name,
							),
						)?.length ?? 0;

					// Extract model name from the language model node if connected
					const languageModelNodeName = Object.keys(workflow.connections).find((node) =>
						workflow.connections[node]?.[NodeConnectionTypes.AiLanguageModel]?.[0]?.some(
							(connectedNode) => connectedNode.node === lastNode.name,
						),
					);
					if (languageModelNodeName) {
						const languageModelNode = getNodeTypeForName(workflow, languageModelNodeName);
						if (languageModelNode) {
							const nodeType = nodeTypes.getByNameAndVersion(
								languageModelNode.type,
								languageModelNode.typeVersion,
							);

							if (nodeType) {
								const nodeParameters = getNodeParameters(
									nodeType.description.properties,
									languageModelNode.parameters,
									true,
									false,
									languageModelNode,
									nodeType.description,
								);

								const modelNameKeys = ['model', 'modelName'] as const;
								for (const key of modelNameKeys) {
									if (nodeParameters?.[key]) {
										info.model_name =
											typeof nodeParameters[key] === 'string'
												? nodeParameters[key]
												: ((nodeParameters[key] as INodeParameterResourceLocator).value as string);

										if (info.model_name) {
											break;
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	return info;
}
