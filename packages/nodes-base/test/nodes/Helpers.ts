import { Container } from '@n8n/di';
import { readFileSync, readdirSync, mkdtempSync } from 'fs';
import { mock } from 'jest-mock-extended';
import { get } from 'lodash';
import { isEmpty } from 'lodash';
import { type BinaryDataConfig, BinaryDataService, constructExecutionMetaData } from 'n8n-core';
import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	IRun,
	IWorkflowBase,
	WorkflowTestData,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';
import nock from 'nock';
import { tmpdir } from 'os';
import path from 'path';

import { executeWorkflow } from './ExecuteWorkflow';
import { LoadNodesAndCredentials } from './load-nodes-and-credentials';

const baseDir = path.resolve(__dirname, '../..');

export const readJsonFileSync = <T = any>(filePath: string) =>
	JSON.parse(readFileSync(path.join(baseDir, filePath), 'utf-8')) as T;

const loadNodesAndCredentials = new LoadNodesAndCredentials(baseDir);
Container.set(LoadNodesAndCredentials, loadNodesAndCredentials);

beforeAll(async () => await loadNodesAndCredentials.init());
beforeEach(() => nock.disableNetConnect());

export function createTemporaryDir(prefix = 'n8n') {
	return mkdtempSync(path.join(tmpdir(), prefix));
}

export async function initBinaryDataService() {
	const binaryDataConfig = mock<BinaryDataConfig>({
		mode: 'default',
		availableModes: ['default'],
		localStoragePath: createTemporaryDir(),
	});
	const binaryDataService = new BinaryDataService(binaryDataConfig);
	await binaryDataService.init();
	Container.set(BinaryDataService, binaryDataService);
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

			throw new ApplicationError(`Data for node "${nodeName}" is missing!`, { level: 'warning' });
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

export const equalityTest = async (testData: WorkflowTestData) => {
	// execute workflow
	const { result } = await executeWorkflow(testData);

	// check if result node data matches expected test data
	const resultNodeData = getResultNodeData(result, testData);
	resultNodeData.forEach(({ nodeName, resultData }) => {
		const msg = `Equality failed for "${testData.description}" at node "${nodeName}"`;
		resultData.forEach((item) => {
			item?.forEach(({ binary, json }) => {
				if (binary) {
					// @ts-ignore
					delete binary.data.data;
					delete binary.data.directory;
				}

				// Convert errors to JSON so tests can compare
				if (json?.error instanceof Error) {
					json.error = JSON.parse(
						JSON.stringify(json.error, ['message', 'name', 'description', 'context']),
					);
				}
			});
		});
		return expect(resultData, msg).toEqual(testData.output.nodeData[nodeName]);
	});

	expect(result.finished || result.status === 'waiting').toEqual(true);
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
		const workflowData = readJsonFileSync<IWorkflowBase & Pick<WorkflowTestData, 'trigger'>>(
			filePath,
		);
		const testDir = path.join(baseDir, path.dirname(filePath));
		workflowData.nodes.forEach((node) => {
			if (node.parameters) {
				node.parameters = JSON.parse(
					JSON.stringify(node.parameters).replace(/"C:\\\\Test\\\\(.*)"/, `"${testDir}/$1"`),
				);
			}
		});
		if (workflowData.pinData === undefined) {
			throw new ApplicationError('Workflow data does not contain pinData', { level: 'warning' });
		}

		const nodeData = preparePinData(workflowData.pinData);
		delete workflowData.pinData;

		const { trigger } = workflowData;
		delete workflowData.trigger;

		const input = { workflowData };
		const output = { nodeData };

		testCases.push({ description, input, output, trigger });
	}
	return testCases;
};

export const testWorkflows = (workflows: string[]) => {
	const tests = workflowToTests(workflows);

	for (const testData of tests) {
		test(testData.description, async () => await equalityTest(testData));
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

export const createMockExecuteFunction = <T = IExecuteFunctions>(
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
	} as unknown as T;
	return fakeExecuteFunction;
};
