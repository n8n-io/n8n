import { readFileSync, readdirSync, mkdtempSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { isEmpty } from 'lodash';
import { get } from 'lodash';
import { BinaryDataManager, Credentials, constructExecutionMetaData } from 'n8n-core';
import type {
	CredentialLoadingDetails,
	ICredentialDataDecryptedObject,
	ICredentialType,
	ICredentialTypeData,
	ICredentialTypes,
	IDataObject,
	IDeferredPromise,
	IExecuteFunctions,
	IExecuteWorkflowInfo,
	IGetNodeParameterOptions,
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
	NodeLoadingDetails,
} from 'n8n-workflow';
import { ICredentialsHelper, LoggerProxy, NodeHelpers, WorkflowHooks } from 'n8n-workflow';
import { executeWorkflow } from './ExecuteWorkflow';
import type { WorkflowTestData } from './types';

import { FAKE_CREDENTIALS_DATA } from './FakeCredentialsMap';

const baseDir = path.resolve(__dirname, '../..');

const getFakeDecryptedCredentials = (
	nodeCredentials: INodeCredentialsDetails,
	type: string,
	fakeCredentialsMap: IDataObject,
) => {
	if (nodeCredentials && fakeCredentialsMap[JSON.stringify(nodeCredentials)]) {
		return fakeCredentialsMap[JSON.stringify(nodeCredentials)] as ICredentialDataDecryptedObject;
	}

	if (type && fakeCredentialsMap[type]) {
		return fakeCredentialsMap[type] as ICredentialDataDecryptedObject;
	}

	return {};
};

export const readJsonFileSync = <T = any>(filePath: string) =>
	JSON.parse(readFileSync(path.join(baseDir, filePath), 'utf-8')) as T;

const knownCredentials = readJsonFileSync<Record<string, CredentialLoadingDetails>>(
	'dist/known/credentials.json',
);

const knownNodes = readJsonFileSync<Record<string, NodeLoadingDetails>>('dist/known/nodes.json');

class CredentialType implements ICredentialTypes {
	credentialTypes: ICredentialTypeData = {};

	addCredential(credentialTypeName: string, credentialType: ICredentialType) {
		this.credentialTypes[credentialTypeName] = {
			sourcePath: '',
			type: credentialType,
		};
	}

	recognizes(credentialType: string): boolean {
		return credentialType in this.credentialTypes;
	}

	getByName(credentialType: string): ICredentialType {
		return this.credentialTypes[credentialType].type;
	}

	getNodeTypesToTestWith(type: string): string[] {
		return knownCredentials[type]?.nodesToTestWith ?? [];
	}

	getParentTypes(typeName: string): string[] {
		return [];
	}
}

export class CredentialsHelper extends ICredentialsHelper {
	constructor(private credentialTypes: ICredentialTypes) {
		super('');
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestParams: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const credentialType = this.credentialTypes.getByName(typeName);
		if (typeof credentialType.authenticate === 'function') {
			return credentialType.authenticate(credentials, requestParams);
		}
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
		return getFakeDecryptedCredentials(nodeCredentials, type, FAKE_CREDENTIALS_DATA);
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
	workflowTestData?: WorkflowTestData,
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
		credentialsHelper: new CredentialsHelper(credentialTypes),
		hooks: new WorkflowHooks(hookFunctions, 'trigger', '1', workflowData),
		executeWorkflow: async (workflowInfo: IExecuteWorkflowInfo): Promise<any> => {},
		sendMessageToUI: (message: string) => {},
		restApiUrl: '',
		encryptionKey: 'test',
		timezone: workflowTestData?.input.workflowData.settings?.timezone || 'America/New_York',
		webhookBaseUrl: 'webhook',
		webhookWaitingBaseUrl: 'webhook-waiting',
		webhookTestBaseUrl: 'webhook-test',
		userId: '123',
		variables: {},
	};
}

class NodeTypes implements INodeTypes {
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
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.nodeTypes[nodeType].type, version);
	}
}

export function createTemporaryDir(prefix = 'n8n') {
	return mkdtempSync(path.join(tmpdir(), prefix));
}

export async function initBinaryDataManager(mode: 'default' | 'filesystem' = 'default') {
	const temporaryDir = createTemporaryDir();
	await BinaryDataManager.init({
		mode,
		availableModes: mode,
		localStoragePath: temporaryDir,
		binaryDataTTL: 1,
		persistedBinaryDataTTL: 1,
	});
	return temporaryDir;
}

const credentialTypes = new CredentialType();

export function setup(testData: WorkflowTestData[] | WorkflowTestData) {
	if (!Array.isArray(testData)) {
		testData = [testData];
	}

	const nodeTypes = new NodeTypes();

	const nodes = [...new Set(testData.flatMap((data) => data.input.workflowData.nodes))];
	const credentialNames = nodes
		.filter((n) => n.credentials)
		.flatMap(({ credentials }) => Object.keys(credentials!));
	for (const credentialName of credentialNames) {
		const loadInfo = knownCredentials[credentialName];
		if (!loadInfo) {
			throw new Error(`Unknown credential type: ${credentialName}`);
		}
		const sourcePath = loadInfo.sourcePath.replace(/^dist\//, './').replace(/\.js$/, '.ts');
		const nodeSourcePath = path.join(baseDir, sourcePath);
		const credential = new (require(nodeSourcePath)[loadInfo.className])() as ICredentialType;
		credentialTypes.addCredential(credentialName, credential);
	}

	const nodeNames = nodes.map((n) => n.type);
	for (const nodeName of nodeNames) {
		if (!nodeName.startsWith('n8n-nodes-base.')) {
			throw new Error(`Unknown node type: ${nodeName}`);
		}
		const loadInfo = knownNodes[nodeName.replace('n8n-nodes-base.', '')];
		if (!loadInfo) {
			throw new Error(`Unknown node type: ${nodeName}`);
		}
		const sourcePath = loadInfo.sourcePath.replace(/^dist\//, './').replace(/\.js$/, '.ts');
		const nodeSourcePath = path.join(baseDir, sourcePath);
		const node = new (require(nodeSourcePath)[loadInfo.className])() as INodeType;
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
		const error = result.data.resultData.error;
		// If there was an error running the workflow throw it for easier debugging
		// and to surface all issues
		if (error?.cause) throw error.cause;
		if (error) throw error;

		if (result.data.resultData.runData[nodeName] === undefined) {
			// log errors from other nodes
			Object.keys(result.data.resultData.runData).forEach((key) => {
				const error = result.data.resultData.runData[key][0]?.error;
				if (error) {
					console.log(`Node ${key}\n`, error);
				}
			});

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

export const equalityTest = async (testData: WorkflowTestData, types: INodeTypes) => {
	// execute workflow
	const { result } = await executeWorkflow(testData, types);

	// check if result node data matches expected test data
	const resultNodeData = getResultNodeData(result, testData);
	resultNodeData.forEach(({ nodeName, resultData }) => {
		const msg = `Equality failed for "${testData.description}" at node "${nodeName}"`;
		return expect(resultData, msg).toEqual(testData.output.nodeData[nodeName]);
	});

	expect(result.finished).toEqual(true);
};

const preparePinData = (pinData: IDataObject) => {
	const returnData = Object.keys(pinData).reduce(
		(acc, key) => {
			const data = pinData[key] as IDataObject[];
			acc[key] = [data];
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
		const workflowData = readJsonFileSync<IWorkflowBase>(filePath);
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
		if (file.endsWith('.json')) {
			workflows.push(path.join(testFolder, file));
		}
	});

	return workflows;
};

export const createMockExecuteFunction = (
	nodeParameters: IDataObject,
	nodeMock: INode,
	continueBool = false,
) => {
	const fakeExecuteFunction = {
		getNodeParameter(
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject | undefined,
			options?: IGetNodeParameterOptions | undefined,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters, parameter, fallbackValue);
		},
		getNode() {
			return nodeMock;
		},
		continueOnFail() {
			return continueBool;
		},
		helpers: {
			constructExecutionMetaData,
		},
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};
