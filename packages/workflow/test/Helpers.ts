import get from 'lodash.get';
import {
	CredentialInformation,
	IAdditionalCredentialOptions,
	IAllExecuteFunctions,
	IContextObject,
	ICredentialDataDecryptedObject,
	ICredentials,
	ICredentialsEncrypted,
	ICredentialsHelper,
	IDataObject,
	IExecuteFunctions,
	IExecuteResponsePromiseData,
	IExecuteSingleFunctions,
	IExecuteWorkflowInfo,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeData,
	INodeTypes,
	INodeVersionedType,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowBase,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	IWorkflowExecuteAdditionalData,
	NodeHelpers,
	NodeParameterValue,
	Workflow,
	WorkflowDataProxy,
	WorkflowExecuteMode,
	WorkflowHooks,
} from '../src';

export interface INodeTypesObject {
	[key: string]: INodeType;
}

export class Credentials extends ICredentials {
	hasNodeAccess(nodeType: string): boolean {
		return true;
	}

	setData(data: ICredentialDataDecryptedObject, encryptionKey: string): void {
		this.data = JSON.stringify(data);
	}

	setDataKey(key: string, data: CredentialInformation, encryptionKey: string): void {
		let fullData;
		try {
			fullData = this.getData(encryptionKey);
		} catch (e) {
			fullData = {};
		}

		fullData[key] = data;

		return this.setData(fullData, encryptionKey);
	}

	getData(encryptionKey: string, nodeType?: string): ICredentialDataDecryptedObject {
		if (this.data === undefined) {
			throw new Error('No data is set so nothing can be returned.');
		}
		return JSON.parse(this.data);
	}

	getDataKey(key: string, encryptionKey: string, nodeType?: string): CredentialInformation {
		const fullData = this.getData(encryptionKey, nodeType);

		if (fullData === null) {
			throw new Error(`No data was set.`);
		}

		// eslint-disable-next-line no-prototype-builtins
		if (!fullData.hasOwnProperty(key)) {
			throw new Error(`No data for key "${key}" exists.`);
		}

		return fullData[key];
	}

	getDataToSave(): ICredentialsEncrypted {
		if (this.data === undefined) {
			throw new Error(`No credentials were set to save.`);
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
	fallbackValue?: any,
): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object {
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	if (nodeType === undefined) {
		throw new Error(`Node type "${node.type}" is not known so can not return paramter value!`);
	}

	const value = get(node.parameters, parameterName, fallbackValue);

	if (value === undefined) {
		throw new Error(`Could not get parameter "${parameterName}"!`);
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
				return additionalData.executeWorkflow(workflowInfo, additionalData, inputData);
			},
			getContext(type: string): IContextObject {
				return NodeHelpers.getContext(runExecutionData, type, node);
			},
			async getCredentials(
				type: string,
				itemIndex?: number,
			): Promise<ICredentialDataDecryptedObject | undefined> {
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
					throw new Error(`Could not get input index "${inputIndex}" of input "${inputName}"!`);
				}

				if (inputData[inputName][inputIndex] === null) {
					// return [];
					throw new Error(`Value "${inputIndex}" of input "${inputName}" did not get set!`);
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
				return JSON.parse(JSON.stringify(node));
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return additionalData.timezone;
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
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					console.error(`There was a problem sending messsage to UI: ${error.message}`);
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
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined> {
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
					throw new Error(`Could not get input index "${inputIndex}" of input "${inputName}"!`);
				}

				const allItems = inputData[inputName][inputIndex];

				if (allItems === null) {
					// return [];
					throw new Error(`Value "${inputIndex}" of input "${inputName}" did not get set!`);
				}

				if (allItems[itemIndex] === null) {
					// return [];
					throw new Error(
						`Value "${inputIndex}" of input "${inputName}" with itemIndex "${itemIndex}" did not get set!`,
					);
				}

				return allItems[itemIndex];
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getNode: () => {
				return JSON.parse(JSON.stringify(node));
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return additionalData.timezone;
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

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {
		'test.set': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Set',
					name: 'set',
					group: ['input'],
					version: 1,
					description: 'Sets a value',
					defaults: {
						name: 'Set',
						color: '#0000FF',
					},
					inputs: ['main'],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Value1',
							name: 'value1',
							type: 'string',
							default: 'default-value1',
						},
						{
							displayName: 'Value2',
							name: 'value2',
							type: 'string',
							default: 'default-value2',
						},
					],
				},
			},
		},
		'test.setMulti': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Set Multi',
					name: 'setMulti',
					group: ['input'],
					version: 1,
					description: 'Sets multiple values',
					defaults: {
						name: 'Set Multi',
						color: '#0000FF',
					},
					inputs: ['main'],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Values',
							name: 'values',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: true,
							},
							default: {},
							options: [
								{
									name: 'string',
									displayName: 'String',
									values: [
										{
											displayName: 'Name',
											name: 'name',
											type: 'string',
											default: 'propertyName',
											placeholder: 'Name of the property to write data to.',
										},
										{
											displayName: 'Value',
											name: 'value',
											type: 'string',
											default: '',
											placeholder: 'The string value to write in the property.',
										},
									],
								},
							],
						},
					],
				},
			},
		},
	};

	async init(nodeTypes: INodeTypeData): Promise<void> {}

	getAll(): INodeType[] {
		return Object.values(this.nodeTypes).map((data) => NodeHelpers.getVersionedNodeType(data.type));
	}

	getByName(nodeType: string): INodeType | INodeVersionedType | undefined {
		return this.getByNameAndVersion(nodeType);
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
		credentialsHelper: new CredentialsHelper(''),
		hooks: new WorkflowHooks({}, 'trigger', '1', workflowData),
		executeWorkflow: async (workflowInfo: IExecuteWorkflowInfo): Promise<any> => {},
		sendMessageToUI: (message: string) => {},
		restApiUrl: '',
		encryptionKey: 'test',
		timezone: 'America/New_York',
		webhookBaseUrl: 'webhook',
		webhookWaitingBaseUrl: 'webhook-waiting',
		webhookTestBaseUrl: 'webhook-test',
	};
}
