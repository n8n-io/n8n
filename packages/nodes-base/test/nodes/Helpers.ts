import { readFileSync, readdirSync, mkdtempSync } from 'fs';
import { BinaryDataManager, Credentials, loadClassInIsolation } from 'n8n-core';
import {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IDataObject,
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
	LoadingDetails,
	LoggerProxy,
	NodeHelpers,
	WorkflowHooks,
} from 'n8n-workflow';
import { executeWorkflow } from './ExecuteWorkflow';
import { WorkflowTestData } from './types';
import path from 'path';
import { tmpdir } from 'os';
import { isEmpty } from 'lodash';

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

let knownNodes: Record<string, LoadingDetails> | null = null;

const loadKnownNodes = (): Record<string, LoadingDetails> => {
	if (knownNodes === null) {
		knownNodes = JSON.parse(readFileSync('dist/known/nodes.json').toString());
	}
	return knownNodes!;
};

export async function initBinaryDataManager(mode: 'default' | 'filesystem' = 'default') {
	const temporaryDir = mkdtempSync(path.join(tmpdir(), 'n8n'));
	await BinaryDataManager.init({
		mode,
		availableModes: mode,
		localStoragePath: temporaryDir,
		binaryDataTTL: 1,
		persistedBinaryDataTTL: 1,
	});
}

export function setup(testData: Array<WorkflowTestData> | WorkflowTestData) {
	if (!Array.isArray(testData)) {
		testData = [testData];
	}

	const knownNodes = loadKnownNodes();

	const nodeTypes = NodeTypes();
	const nodeNames = Array.from(
		new Set(testData.flatMap((data) => data.input.workflowData.nodes.map((n) => n.type))),
	);

	for (const nodeName of nodeNames) {
		if (!nodeName.startsWith('n8n-nodes-base.')) {
			throw new Error(`Unknown node type: ${nodeName}`);
		}
		const loadInfo = knownNodes[nodeName.replace('n8n-nodes-base.', '')];
		if (!loadInfo) {
			throw new Error(`Unknown node type: ${nodeName}`);
		}
		const node = loadClassInIsolation(
			path.join(process.cwd(), loadInfo.sourcePath),
			loadInfo.className,
		) as INodeType;
		nodeTypes.addNode(nodeName, node);
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
			return nodeData.data.main[0]!.map((entry) => {
				if (entry.binary && isEmpty(entry.binary)) delete entry.binary;
				delete entry.pairedItem;
				return entry;
			});
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

export const equalityTest = async (testData: WorkflowTestData, types: INodeTypes) => {
	// execute workflow
	const { result } = await executeWorkflow(testData, types);

	// check if result node data matches expected test data
	const resultNodeData = getResultNodeData(result, testData);

	resultNodeData.forEach(({ nodeName, resultData }) => {
		return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
	});

	expect(result.finished).toEqual(true);
};

const preparePinData = (pinData: IDataObject) => {
	const returnData = Object.keys(pinData).reduce(
		(acc, key) => {
			const data = pinData[key] as IDataObject[];
			acc[key] = [data as IDataObject[]];
			return acc;
		},
		{} as {
			[key: string]: IDataObject[][];
		},
	);
	return returnData;
};

export const workflowToTests = (workflowFiles: string[]) => {
	const testCases: WorkflowTestData[] = [];
	for (const filePath of workflowFiles) {
		const description = filePath.replace('.json', '');
		const workflowData = readJsonFileSync(filePath);
		if (workflowData.pinData === undefined) {
			throw new Error('Workflow data does not contain pinData');
		}

		const nodeData = preparePinData(workflowData.pinData);

		delete workflowData.pinData;

		const input = { workflowData };
		const output = { nodeData };

		testCases.push({ description, input, output });
	}
	return testCases;
};

export const testWorkflows = (workflows: string[]) => {
	const tests = workflowToTests(workflows);

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => equalityTest(testData, nodeTypes));
	}
};

export const getWorkflowFilenames = (dirname: string) => {
	const workflows: string[] = [];

	const filenames = readdirSync(dirname);
	const testFolder = dirname.split(`${path.sep}nodes-base${path.sep}`)[1];
	filenames.forEach((file) => {
		if (file.includes('.json')) {
			workflows.push(path.join(testFolder, file));
		}
	});

	return workflows;
};
