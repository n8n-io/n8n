import { getNodeParameters } from './NodeHelpers';
import type {
	IConnection,
	INode,
	INodeNameIndex,
	INodesGraph,
	INodeGraphItem,
	INodesGraphResult,
	IWorkflowBase,
	INodeTypes,
} from './Interfaces';
import { ApplicationError } from './errors/application.error';

const STICKY_NODE_TYPE = 'n8n-nodes-base.stickyNote';

export function getNodeTypeForName(workflow: IWorkflowBase, nodeName: string): INode | undefined {
	return workflow.nodes.find((node) => node.name === nodeName);
}

export function isNumber(value: unknown): value is number {
	return typeof value === 'number';
}

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

export function generateNodesGraph(
	workflow: Partial<IWorkflowBase>,
	nodeTypes: INodeTypes,
	options?: {
		sourceInstanceId?: string;
		nodeIdMap?: { [curr: string]: string };
	},
): INodesGraphResult {
	const nodeGraph: INodesGraph = {
		node_types: [],
		node_connections: [],
		nodes: {},
		notes: {},
		is_pinned: Object.keys(workflow.pinData ?? {}).length > 0,
	};
	const nameIndices: INodeNameIndex = {};
	const webhookNodeNames: string[] = [];

	const notes = (workflow.nodes ?? []).filter((node) => node.type === STICKY_NODE_TYPE);
	const otherNodes = (workflow.nodes ?? []).filter((node) => node.type !== STICKY_NODE_TYPE);

	notes.forEach((stickyNote: INode, index: number) => {
		const stickyType = nodeTypes.getByNameAndVersion(STICKY_NODE_TYPE, stickyNote.typeVersion);
		if (!stickyType) {
			return;
		}

		const nodeParameters =
			getNodeParameters(
				stickyType.description.properties,
				stickyNote.parameters,
				true,
				false,
				stickyNote,
			) ?? {};

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

	otherNodes.forEach((node: INode, index: number) => {
		nodeGraph.node_types.push(node.type);
		const nodeItem: INodeGraphItem = {
			id: node.id,
			type: node.type,
			version: node.typeVersion,
			position: node.position,
		};

		if (options?.sourceInstanceId) {
			nodeItem.src_instance_id = options.sourceInstanceId;
		}

		if (node.id && options?.nodeIdMap?.[node.id]) {
			nodeItem.src_node_id = options.nodeIdMap[node.id];
		}

		if (node.type === 'n8n-nodes-base.httpRequest' && node.typeVersion === 1) {
			try {
				nodeItem.domain = new URL(node.parameters.url as string).hostname;
			} catch {
				nodeItem.domain = getDomainBase(node.parameters.url as string);
			}
		} else if (node.type === 'n8n-nodes-base.httpRequest' && node.typeVersion > 1) {
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
		} else if (node.type === 'n8n-nodes-base.webhook') {
			webhookNodeNames.push(node.name);
		} else {
			try {
				const nodeType = nodeTypes.getByNameAndVersion(node.type);
				if (nodeType) {
					const nodeParameters = getNodeParameters(
						nodeType.description.properties,
						node.parameters,
						true,
						false,
						node,
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
				if (!(e instanceof Error && e.message.includes('Unrecognized node type'))) {
					throw e;
				}
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
				element.forEach((element2) => {
					nodeGraph.node_connections.push(getGraphConnectionItem(nodeName, element2));
				});
			});
		});
	});

	return { nodeGraph, nameIndices, webhookNodeNames };
}
