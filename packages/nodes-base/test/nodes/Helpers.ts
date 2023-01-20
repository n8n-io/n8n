import { readFileSync } from 'fs';
import { Credentials } from 'n8n-core';
import {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IDeferredPromise,
	IExecuteWorkflowInfo,
	IHttpRequestHelper,
	IHttpRequestOptions,
	ILogger,
	INode,
	INodeCredentialsDetails,
	INodeType,
	INodeTypeData,
	INodeTypes,
	IRun,
	ITaskData,
	IVersionedNodeType,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	LoggerProxy,
	NodeHelpers,
	WorkflowHooks,
} from 'n8n-workflow';
import { WorkflowTestData } from './types';

export class CredentialsHelper extends ICredentialsHelper {
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestParams: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		return requestParams;
	}

	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		return undefined;
	}

	getParentTypes(name: string): string[] {
		return [];
	}

	async getDecrypted(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentialDataDecryptedObject> {
		return {};
	}

	async getCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<Credentials> {
		return new Credentials({ id: null, name: '' }, '', [], '');
	}

	async updateCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<void> {}
}

export function WorkflowExecuteAdditionalData(
	waitPromise: IDeferredPromise<IRun>,
	nodeExecutionOrder: string[],
): IWorkflowExecuteAdditionalData {
	const hookFunctions = {
		nodeExecuteAfter: [
			async (nodeName: string, data: ITaskData): Promise<void> => {
				nodeExecutionOrder.push(nodeName);
			},
		],
		workflowExecuteAfter: [
			async (fullRunData: IRun): Promise<void> => {
				waitPromise.resolve(fullRunData);
			},
		],
	};

	const workflowData: IWorkflowBase = {
		name: '',
		createdAt: new Date(),
		updatedAt: new Date(),
		active: true,
		nodes: [],
		connections: {},
	};

	return {
		credentialsHelper: new CredentialsHelper(''),
		hooks: new WorkflowHooks(hookFunctions, 'trigger', '1', workflowData),
		executeWorkflow: async (workflowInfo: IExecuteWorkflowInfo): Promise<any> => {},
		sendMessageToUI: (message: string) => {},
		restApiUrl: '',
		encryptionKey: 'test',
		timezone: 'America/New_York',
		webhookBaseUrl: 'webhook',
		webhookWaitingBaseUrl: 'webhook-waiting',
		webhookTestBaseUrl: 'webhook-test',
		userId: '123',
	};
}

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {};
	getByName(nodeType: string): INodeType | IVersionedNodeType {
		return this.nodeTypes[nodeType].type;
	}

	addNode(nodeTypeName: string, nodeType: INodeType | IVersionedNodeType) {
		const loadedNode = {
			[nodeTypeName]: {
				sourcePath: '',
				type: nodeType,
			},
		};
		this.nodeTypes = {
			...this.nodeTypes,
			...loadedNode,
		};
		//Object.assign(this.nodeTypes, loadedNode);
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.nodeTypes[nodeType].type, version);
	}
}

let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}
	return nodeTypesInstance;
}

export function setup(nodes: INodeType[]) {
	const nodeTypes = NodeTypes();
	for (const node of nodes) {
		nodeTypes.addNode('n8n-nodes-base.' + node.description.name, node);
	}
	const fakeLogger = {
		log: () => {},
		debug: () => {},
		verbose: () => {},
		info: () => {},
		warn: () => {},
		error: () => {},
	} as ILogger;
	LoggerProxy.init(fakeLogger);
	return nodeTypes;
}

export function getResultNodeData(result: IRun, testData: WorkflowTestData) {
	return Object.keys(testData.output.nodeData).map((nodeName) => {
		if (result.data.resultData.runData[nodeName] === undefined) {
			throw new Error(`Data for node "${nodeName}" is missing!`);
		}
		const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
			if (nodeData.data === undefined) {
				return null;
			}
			return nodeData.data.main[0]!.map((entry) => entry.json);
		});
		return {
			nodeName,
			resultData,
		};
	});
}

export function readJsonFileSync(path: string) {
	return JSON.parse(readFileSync(path, 'utf-8'));
}
