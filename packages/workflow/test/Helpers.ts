import get from 'lodash/get';
import type {
	IAdditionalCredentialOptions,
	IAllExecuteFunctions,
	IContextObject,
	ICredentialDataDecryptedObject,
	ICredentialsEncrypted,
	IDataObject,
	IExecuteData,
	IExecuteFunctions,
	IExecuteResponsePromiseData,
	IExecuteSingleFunctions,
	IExecuteWorkflowInfo,
	IHttpRequestHelper,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowBase,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	IWorkflowExecuteAdditionalData,
	NodeParameterValue,
	WorkflowExecuteMode,
} from '@/Interfaces';
import { ICredentials, ICredentialsHelper } from '@/Interfaces';
import type { Workflow } from '@/Workflow';
import { WorkflowDataProxy } from '@/WorkflowDataProxy';
import { WorkflowHooks } from '@/WorkflowHooks';
import * as NodeHelpers from '@/NodeHelpers';
import { deepCopy } from '@/utils';
import { getGlobalState } from '@/GlobalState';
import { ApplicationError } from '@/errors/application.error';
import { NodeTypes as NodeTypesClass } from './NodeTypes';
import { readFileSync } from 'fs';
import path from 'path';

export interface INodeTypesObject {
	[key: string]: INodeType;
}

export class Credentials extends ICredentials {
	hasNodeAccess() {
		return true;
	}

	setData(data: ICredentialDataDecryptedObject) {
		this.data = JSON.stringify(data);
	}

	getData(): ICredentialDataDecryptedObject {
		if (this.data === undefined) {
			throw new ApplicationError('No data is set so nothing can be returned');
		}
		return JSON.parse(this.data);
	}

	getDataToSave(): ICredentialsEncrypted {
		if (this.data === undefined) {
			throw new ApplicationError('No credentials were set to save');
		}

		return {
			id: this.id,
			name: this.name,
			type: this.type,
			data: this.data,
			nodesAccess: this.nodesAccess,
		};
	}
}

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
	): Promise<{ updatedCredentials: boolean; data: ICredentialDataDecryptedObject }> {
		return { updatedCredentials: false, data: {} };
	}

	getParentTypes(name: string): string[] {
		return [];
	}

	async getDecrypted(
		additionalData: IWorkflowExecuteAdditionalData,
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentialDataDecryptedObject> {
		return {};
	}

	async getCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentials> {
		return new Credentials({ id: null, name: '' }, '', [], '');
	}

	async updateCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<void> {}
}

export function getNodeParameter(
	workflow: Workflow,
	runExecutionData: IRunExecutionData | null,
	runIndex: number,
	connectionInputData: INodeExecutionData[],
	node: INode,
	parameterName: string,
	itemIndex: number,
	mode: WorkflowExecuteMode,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
	executeData: IExecuteData,
	fallbackValue?: any,
): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object {
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	if (nodeType === undefined) {
		throw new ApplicationError('Node type is unknown so cannot return parameter value', {
			tags: { nodeType: node.type },
		});
	}

	const value = get(node.parameters, parameterName, fallbackValue);

	if (value === undefined) {
		throw new ApplicationError('Could not get parameter', { extra: { parameterName } });
	}

	let returnData;
	try {
		returnData = workflow.expression.getParameterValue(
			value,
			runExecutionData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			additionalKeys,
		);
	} catch (e) {
		e.message += ` [Error in parameter: "${parameterName}"]`;
		throw e;
	}

	return returnData;
}

export function getExecuteFunctions(
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	runIndex: number,
	connectionInputData: INodeExecutionData[],
	inputData: ITaskDataConnections,
	node: INode,
	itemIndex: number,
	additionalData: IWorkflowExecuteAdditionalData,
	executeData: IExecuteData,
	mode: WorkflowExecuteMode,
): IExecuteFunctions {
	return ((workflow, runExecutionData, connectionInputData, inputData, node) => {
		return {
			continueOnFail: () => {
				return false;
			},
			evaluateExpression: (expression: string, itemIndex: number) => {
				return expression;
			},
			async executeWorkflow(
				workflowInfo: IExecuteWorkflowInfo,
				inputData?: INodeExecutionData[],
			): Promise<any> {
				return await additionalData.executeWorkflow(workflowInfo, additionalData, { inputData });
			},
			getContext(type: string): IContextObject {
				return NodeHelpers.getContext(runExecutionData, type, node);
			},
			async getCredentials(
				type: string,
				itemIndex?: number,
			): Promise<ICredentialDataDecryptedObject> {
				return {
					apiKey: '12345',
				};
			},
			getExecutionId: (): string => {
				return additionalData.executionId!;
			},
			getInputData: (inputIndex = 0, inputName = 'main') => {
				if (!inputData.hasOwnProperty(inputName)) {
					// Return empty array because else it would throw error when nothing is connected to input
					return [];
				}

				if (inputData[inputName].length < inputIndex) {
					throw new ApplicationError('Could not get input index', {
						extra: { inputIndex, inputName },
					});
				}

				if (inputData[inputName][inputIndex] === null) {
					throw new ApplicationError('Value of input did not get set', {
						extra: { inputIndex, inputName },
					});
				}

				return inputData[inputName][inputIndex] as INodeExecutionData[];
			},
			getNodeParameter: (
				parameterName: string,
				itemIndex: number,
				fallbackValue?: any,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object => {
				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					{},
					fallbackValue,
				);
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getNode: () => {
				return deepCopy(node);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return workflow.settings.timezone ?? getGlobalState().defaultTimezone;
			},
			getExecuteData: (): IExecuteData => {
				return executeData;
			},
			getWorkflow: () => {
				return {
					id: workflow.id,
					name: workflow.name,
					active: workflow.active,
				};
			},
			getWorkflowDataProxy: (itemIndex: number): IWorkflowDataProxyData => {
				const dataProxy = new WorkflowDataProxy(
					workflow,
					runExecutionData,
					runIndex,
					itemIndex,
					node.name,
					connectionInputData,
					{},
					mode,
					{},
					executeData,
				);
				return dataProxy.getDataProxy();
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			prepareOutputData: NodeHelpers.prepareOutputData,
			async putExecutionToWait(waitTill: Date): Promise<void> {
				runExecutionData.waitTill = waitTill;
			},
			sendMessageToUI(...args: any[]): void {
				if (mode !== 'manual') {
					return;
				}
				try {
					if (additionalData.sendMessageToUI) {
						additionalData.sendMessageToUI(node.name, args);
					}
				} catch (error) {
					console.error(`There was a problem sending message to UI: ${error.message}`);
				}
			},
			async sendResponse(response: IExecuteResponsePromiseData): Promise<void> {
				await additionalData.hooks?.executeHookFunctions('sendResponse', [response]);
			},
			helpers: {
				async httpRequest(
					requestOptions: IHttpRequestOptions,
				): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
					return {
						body: {
							headers: {},
							statusCode: 200,
							requestOptions,
						},
					};
				},
				async requestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return {
						body: {
							headers: {},
							statusCode: 200,
							credentialsType,
							requestOptions,
							additionalCredentialOptions,
						},
					};
				},
				async httpRequestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return {
						body: {
							headers: {},
							statusCode: 200,
							credentialsType,
							requestOptions,
							additionalCredentialOptions,
						},
					};
				},
			},
		};
	})(workflow, runExecutionData, connectionInputData, inputData, node);
}

export function getExecuteSingleFunctions(
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	runIndex: number,
	connectionInputData: INodeExecutionData[],
	inputData: ITaskDataConnections,
	node: INode,
	itemIndex: number,
	additionalData: IWorkflowExecuteAdditionalData,
	executeData: IExecuteData,
	mode: WorkflowExecuteMode,
): IExecuteSingleFunctions {
	return ((workflow, runExecutionData, connectionInputData, inputData, node, itemIndex) => {
		return {
			continueOnFail: () => {
				return false;
			},
			evaluateExpression: (expression: string, evaluateItemIndex: number | undefined) => {
				return expression;
			},
			getContext(type: string): IContextObject {
				return NodeHelpers.getContext(runExecutionData, type, node);
			},
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject> {
				return {
					apiKey: '12345',
				};
			},
			getInputData: (inputIndex = 0, inputName = 'main') => {
				if (!inputData.hasOwnProperty(inputName)) {
					// Return empty array because else it would throw error when nothing is connected to input
					return { json: {} };
				}

				if (inputData[inputName].length < inputIndex) {
					throw new ApplicationError('Could not get input index', {
						extra: { inputIndex, inputName },
					});
				}

				const allItems = inputData[inputName][inputIndex];

				if (allItems === null) {
					throw new ApplicationError('Value of input did not get set', {
						extra: { inputIndex, inputName },
					});
				}

				if (allItems[itemIndex] === null) {
					throw new ApplicationError('Value of input with item index did not get set', {
						extra: { inputIndex, inputName, itemIndex },
					});
				}

				return allItems[itemIndex];
			},
			getItemIndex: () => {
				return itemIndex;
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getNode: () => {
				return deepCopy(node);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return workflow.settings.timezone ?? getGlobalState().defaultTimezone;
			},
			getExecuteData: (): IExecuteData => {
				return executeData;
			},
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object => {
				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					{},
					fallbackValue,
				);
			},
			getWorkflow: () => {
				return {
					id: workflow.id,
					name: workflow.name,
					active: workflow.active,
				};
			},
			getWorkflowDataProxy: (): IWorkflowDataProxyData => {
				const dataProxy = new WorkflowDataProxy(
					workflow,
					runExecutionData,
					runIndex,
					itemIndex,
					node.name,
					connectionInputData,
					{},
					mode,
					{},
					executeData,
				);
				return dataProxy.getDataProxy();
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			helpers: {
				async httpRequest(
					requestOptions: IHttpRequestOptions,
				): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
					return {
						body: {
							headers: {},
							statusCode: 200,
							requestOptions,
						},
					};
				},
				async requestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return {
						body: {
							headers: {},
							statusCode: 200,
							credentialsType,
							requestOptions,
							additionalCredentialOptions,
						},
					};
				},
				async httpRequestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return {
						body: {
							headers: {},
							statusCode: 200,
							credentialsType,
							requestOptions,
							additionalCredentialOptions,
						},
					};
				},
			},
		};
	})(workflow, runExecutionData, connectionInputData, inputData, node, itemIndex);
}

let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}

export function WorkflowExecuteAdditionalData(): IWorkflowExecuteAdditionalData {
	const workflowData: IWorkflowBase = {
		name: '',
		createdAt: new Date(),
		updatedAt: new Date(),
		active: true,
		nodes: [],
		connections: {},
	};

	return {
		credentialsHelper: new CredentialsHelper(),
		hooks: new WorkflowHooks({}, 'trigger', '1', workflowData),
		executeWorkflow: async (workflowInfo: IExecuteWorkflowInfo): Promise<any> => {},
		sendDataToUI: (message: string) => {},
		restApiUrl: '',
		webhookBaseUrl: 'webhook',
		webhookWaitingBaseUrl: 'webhook-waiting',
		webhookTestBaseUrl: 'webhook-test',
		userId: '123',
	};
}

const BASE_DIR = path.resolve(__dirname, '..');
export const readJsonFileSync = <T>(filePath: string) =>
	JSON.parse(readFileSync(path.join(BASE_DIR, filePath), 'utf-8')) as T;
