import { Workflow } from './Workflow';
import { WorkflowHooks } from './WorkflowHooks';
import { WorkflowOperationError } from './WorkflowErrors';
import { NodeApiError, NodeOperationError } from './NodeErrors';
import * as express from 'express';

export type IAllExecuteFunctions = IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions | ITriggerFunctions | IWebhookFunctions;

export interface IBinaryData {
	[key: string]: string | undefined;
	data: string;
	mimeType: string;
	fileName?: string;
	directory?: string;
	fileExtension?: string;
}

export interface IOAuth2Options {
	includeCredentialsOnRefreshOnBody?: boolean;
	property?: string;
	tokenType?: string;
	keepBearer?: boolean;
	tokenExpiredStatusCode?: number;
}

export interface IConnection {
	// The node the connection is to
	node: string;

	// The type of the input on destination node (for example "main")
	type: string;

	// The output/input-index of destination node (if node has multiple inputs/outputs of the same type)
	index: number;
}

export type ExecutionError = WorkflowOperationError | NodeOperationError | NodeApiError;

// Get used to gives nodes access to credentials
export interface IGetCredentials {
	get(type: string, name: string): Promise<ICredentialsEncrypted>;
}

export abstract class ICredentials {
	name: string;
	type: string;
	data: string | undefined;
	nodesAccess: ICredentialNodeAccess[];

	constructor(name: string, type: string, nodesAccess: ICredentialNodeAccess[], data?: string) {
		this.name = name;
		this.type = type;
		this.nodesAccess = nodesAccess;
		this.data = data;
	}

	abstract getData(encryptionKey: string, nodeType?: string): ICredentialDataDecryptedObject;
	abstract getDataKey(key: string, encryptionKey: string, nodeType?: string): CredentialInformation;
	abstract getDataToSave(): ICredentialsEncrypted;
	abstract hasNodeAccess(nodeType: string): boolean;
	abstract setData(data: ICredentialDataDecryptedObject, encryptionKey: string): void;
	abstract setDataKey(key: string, data: CredentialInformation, encryptionKey: string): void;
}

// Defines which nodes are allowed to access the credentials and
// when that access got grented from which user
export interface ICredentialNodeAccess {
	nodeType: string;
	user?: string;
	date?: Date;
}

export interface ICredentialsDecrypted {
	name: string;
	type: string;
	nodesAccess: ICredentialNodeAccess[];
	data?: ICredentialDataDecryptedObject;
}

export interface ICredentialsEncrypted {
	name: string;
	type: string;
	nodesAccess: ICredentialNodeAccess[];
	data?: string;
}

export interface ICredentialsExpressionResolveValues {
	connectionInputData: INodeExecutionData[];
	itemIndex: number;
	node: INode;
	runExecutionData: IRunExecutionData | null;
	runIndex: number;
	workflow: Workflow;
}

export abstract class ICredentialsHelper {
	encryptionKey: string;

	constructor(encryptionKey: string) {
		this.encryptionKey = encryptionKey;
	}

	abstract getCredentials(name: string, type: string): Promise<ICredentials>;
	abstract getDecrypted(name: string, type: string, mode: WorkflowExecuteMode, raw?: boolean, expressionResolveValues?: ICredentialsExpressionResolveValues): Promise<ICredentialDataDecryptedObject>;
	abstract updateCredentials(name: string, type: string, data: ICredentialDataDecryptedObject): Promise<void>;
}

export interface ICredentialType {
	name: string;
	displayName: string;
	extends?: string[];
	properties: INodeProperties[];
	documentationUrl?: string;
	__overwrittenProperties?: string[];
}

export interface ICredentialTypes {
	credentialTypes?: {
		[key: string]: ICredentialType
	};
	init(credentialTypes?: { [key: string]: ICredentialType }): Promise<void>;
	getAll(): ICredentialType[];
	getByName(credentialType: string): ICredentialType;
}

// The way the credentials get saved in the database (data encrypted)
export interface ICredentialData {
	name: string;
	data: string; // Contains the access data as encrypted JSON string
	nodesAccess: ICredentialNodeAccess[];
}

// The encrypted credentials which the nodes can access
export type CredentialInformation = string | number | boolean | IDataObject;


// The encrypted credentials which the nodes can access
export interface ICredentialDataDecryptedObject {
	[key: string]: CredentialInformation;
}

// First array index: The output/input-index (if node has multiple inputs/outputs of the same type)
// Second array index: The different connections (if one node is connected to multiple nodes)
export type NodeInputConnections = IConnection[][];

export interface INodeConnections {
	// Input name
	[key: string]: NodeInputConnections;
}

export interface IConnections {
	// Node name
	[key: string]: INodeConnections;
}

export type GenericValue = string | object | number | boolean | undefined | null;

export interface IDataObject {
	[key: string]: GenericValue | IDataObject | GenericValue[] | IDataObject[];
}


export interface IGetExecutePollFunctions {
	(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, activation: WorkflowActivateMode): IPollFunctions;
}

export interface IGetExecuteTriggerFunctions {
	(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, activation: WorkflowActivateMode): ITriggerFunctions;
}


export interface IGetExecuteFunctions {
	(workflow: Workflow, runExecutionData: IRunExecutionData, runIndex: number, connectionInputData: INodeExecutionData[], inputData: ITaskDataConnections, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode): IExecuteFunctions;
}


export interface IGetExecuteSingleFunctions {
	(workflow: Workflow, runExecutionData: IRunExecutionData, runIndex: number, connectionInputData: INodeExecutionData[], inputData: ITaskDataConnections, node: INode, itemIndex: number, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode): IExecuteSingleFunctions;
}


export interface IGetExecuteHookFunctions {
	(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, activation: WorkflowActivateMode, isTest?: boolean, webhookData?: IWebhookData): IHookFunctions;
}


export interface IGetExecuteWebhookFunctions {
	(workflow: Workflow, node: INode, additionalData: IWorkflowExecuteAdditionalData, mode: WorkflowExecuteMode, webhookData: IWebhookData): IWebhookFunctions;
}


export interface IExecuteData {
	data: ITaskDataConnections;
	node: INode;
}

export type IContextObject = {
	[key: string]: any; // tslint:disable-line:no-any
};


export interface IExecuteContextData {
	// Keys are: "flow" | "node:<NODE_NAME>"
	[key: string]: IContextObject;
}


export interface IExecuteFunctions {
	continueOnFail(): boolean;
	evaluateExpression(expression: string, itemIndex: number): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[];
	executeWorkflow(workflowInfo: IExecuteWorkflowInfo, inputData?: INodeExecutionData[]): Promise<any>; // tslint:disable-line:no-any
	getContext(type: string): IContextObject;
	getCredentials(type: string, itemIndex?: number): Promise<ICredentialDataDecryptedObject | undefined>;
	getInputData(inputIndex?: number, inputName?: string): INodeExecutionData[];
	getMode(): WorkflowExecuteMode;
	getNode(): INode;
	getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object; //tslint:disable-line:no-any
	getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData;
	getWorkflowStaticData(type: string): IDataObject;
	getRestApiUrl(): string;
	getTimezone(): string;
	getWorkflow(): IWorkflowMetadata;
	prepareOutputData(outputData: INodeExecutionData[], outputIndex?: number): Promise<INodeExecutionData[][]>;
	helpers: {
		[key: string]: (...args: any[]) => any //tslint:disable-line:no-any
	};
}


export interface IExecuteSingleFunctions {
	continueOnFail(): boolean;
	evaluateExpression(expression: string, itemIndex: number | undefined): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[];
	getContext(type: string): IContextObject;
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined>;
	getInputData(inputIndex?: number, inputName?: string): INodeExecutionData;
	getMode(): WorkflowExecuteMode;
	getNode(): INode;
	getNodeParameter(parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object; //tslint:disable-line:no-any
	getRestApiUrl(): string;
	getTimezone(): string;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowDataProxy(): IWorkflowDataProxyData;
	getWorkflowStaticData(type: string): IDataObject;
	helpers: {
		[key: string]: (...args: any[]) => any //tslint:disable-line:no-any
	};
}

export interface IExecuteWorkflowInfo {
	code?: IWorkflowBase;
	id?: string;
}

export interface ILoadOptionsFunctions {
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined>;
	getNode(): INode;
	getNodeParameter(parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object; //tslint:disable-line:no-any
	getCurrentNodeParameter(parameterName: string): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object | undefined;
	getCurrentNodeParameters(): INodeParameters | undefined;
	getTimezone(): string;
	getRestApiUrl(): string;
	helpers: {
		[key: string]: ((...args: any[]) => any) | undefined; //tslint:disable-line:no-any
	};
}

export interface IHookFunctions {
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined>;
	getMode(): WorkflowExecuteMode;
	getActivationMode(): WorkflowActivateMode;
	getNode(): INode;
	getNodeWebhookUrl: (name: string) => string | undefined;
	getNodeParameter(parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object; //tslint:disable-line:no-any
	getTimezone(): string;
	getWebhookDescription(name: string): IWebhookDescription | undefined;
	getWebhookName(): string;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowStaticData(type: string): IDataObject;
	helpers: {
		[key: string]: (...args: any[]) => any //tslint:disable-line:no-any
	};
}

export interface IPollFunctions {
	__emit(data: INodeExecutionData[][]): void;
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined>;
	getMode(): WorkflowExecuteMode;
	getActivationMode(): WorkflowActivateMode;
	getNode(): INode;
	getNodeParameter(parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object; //tslint:disable-line:no-any
	getRestApiUrl(): string;
	getTimezone(): string;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowStaticData(type: string): IDataObject;
	helpers: {
		[key: string]: (...args: any[]) => any //tslint:disable-line:no-any
	};
}

export interface ITriggerFunctions {
	emit(data: INodeExecutionData[][]): void;
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined>;
	getMode(): WorkflowExecuteMode;
	getActivationMode(): WorkflowActivateMode;
	getNode(): INode;
	getNodeParameter(parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object; //tslint:disable-line:no-any
	getRestApiUrl(): string;
	getTimezone(): string;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowStaticData(type: string): IDataObject;
	helpers: {
		[key: string]: (...args: any[]) => any //tslint:disable-line:no-any
	};
}

export interface IWebhookFunctions {
	getBodyData(): IDataObject;
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined>;
	getHeaderData(): object;
	getMode(): WorkflowExecuteMode;
	getNode(): INode;
	getNodeParameter(parameterName: string, fallbackValue?: any): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object; //tslint:disable-line:no-any
	getNodeWebhookUrl: (name: string) => string | undefined;
	getParamsData(): object;
	getQueryData(): object;
	getRequestObject(): express.Request;
	getResponseObject(): express.Response;
	getTimezone(): string;
	getWebhookName(): string;
	getWorkflowStaticData(type: string): IDataObject;
	getWorkflow(): IWorkflowMetadata;
	prepareOutputData(outputData: INodeExecutionData[], outputIndex?: number): Promise<INodeExecutionData[][]>;
	helpers: {
		[key: string]: (...args: any[]) => any //tslint:disable-line:no-any
	};
}

export interface INodeCredentials {
	[key: string]: string;
}

export interface INode {
	name: string;
	typeVersion: number;
	type: string;
	position: [number, number];
	disabled?: boolean;
	notesInFlow?: boolean;
	retryOnFail?: boolean;
	maxTries?: number;
	waitBetweenTries?: number;
	alwaysOutputData?: boolean;
	executeOnce?: boolean;
	continueOnFail?: boolean;
	parameters: INodeParameters;
	credentials?: INodeCredentials;
	webhookId?: string;
}


export interface INodes {
	[key: string]: INode;
}


export interface IObservableObject {
	[key: string]: any; // tslint:disable-line:no-any
	__dataChanged: boolean;
}


export interface IBinaryKeyData {
	[key: string]: IBinaryData;
}

export interface INodeExecutionData {
	[key: string]: IDataObject | IBinaryKeyData | undefined;
	// TODO: Rename this one as json does not really fit as it is not json (which is a string) it is actually a JS object
	json: IDataObject;
	// json: object;
	// json?: object;
	binary?: IBinaryKeyData;
}


export interface INodeExecuteFunctions {
	getExecutePollFunctions: IGetExecutePollFunctions;
	getExecuteTriggerFunctions: IGetExecuteTriggerFunctions;
	getExecuteFunctions: IGetExecuteFunctions;
	getExecuteSingleFunctions: IGetExecuteSingleFunctions;
	getExecuteHookFunctions: IGetExecuteHookFunctions;
	getExecuteWebhookFunctions: IGetExecuteWebhookFunctions;
}


// The values a node property can have
export type NodeParameterValue = string | number | boolean | undefined | null;

export interface INodeParameters {
	// TODO: Later also has to be possible to add multiple ones with the name name. So array has to be possible
	[key: string]: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[];
}


export type NodePropertyTypes = 'boolean' | 'collection' | 'color' | 'dateTime' | 'fixedCollection' | 'hidden' | 'json' | 'multiOptions' | 'number' | 'options' | 'string';

export type EditorTypes = 'code';

export interface INodePropertyTypeOptions {
	alwaysOpenEditWindow?: boolean; // Supported by: string
	editor?: EditorTypes;        // Supported by: string
	loadOptionsDependsOn?: string[];  // Supported by: options
	loadOptionsMethod?: string;  // Supported by: options
	maxValue?: number;           // Supported by: number
	minValue?: number;           // Supported by: number
	multipleValues?: boolean;    // Supported by: <All>
	multipleValueButtonText?: string;    // Supported when "multipleValues" set to true
	numberPrecision?: number;    // Supported by: number
	numberStepSize?: number;     // Supported by: number
	password?: boolean;          // Supported by: string
	rows?: number;               // Supported by: string
	showAlpha?: boolean;         // Supported by: color
	sortable?: boolean;          // Supported when "multipleValues" set to true
	[key: string]: boolean | number | string | EditorTypes | undefined | string[];
}

export interface IDisplayOptions {
	hide?: {
		[key: string]: NodeParameterValue[];
	};
	show?: {
		[key: string]: NodeParameterValue[];
	};
}


export interface INodeProperties {
	displayName: string;
	name: string;
	type: NodePropertyTypes;
	typeOptions?: INodePropertyTypeOptions;
	default: NodeParameterValue | INodeParameters | INodeParameters[] | NodeParameterValue[];
	description?: string;
	displayOptions?: IDisplayOptions;
	options?: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>;
	placeholder?: string;
	isNodeSetting?: boolean;
	noDataExpression?: boolean;
	required?: boolean;
}


export interface INodePropertyOptions {
	name: string;
	value: string | number;
	description?: string;
}

export interface INodePropertyCollection {
	displayName: string;
	name: string;
	values: INodeProperties[];
}

export interface IParameterDependencies {
	[key: string]: string[];
}

export interface IPollResponse {
	closeFunction?: () => Promise<void>;
}

export interface ITriggerResponse {
	closeFunction?: () => Promise<void>;
	// To manually trigger the run
	manualTriggerFunction?: () => Promise<void>;
	// Gets added automatically at manual workflow runs resolves with
	// the first emitted data
	manualTriggerResponse?: Promise<INodeExecutionData[][]>;
}

export interface INodeType {
	description: INodeTypeDescription;
	execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null>;
	executeSingle?(this: IExecuteSingleFunctions): Promise<INodeExecutionData>;
	poll?(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
	trigger?(this: ITriggerFunctions): Promise<ITriggerResponse | undefined>;
	webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>;
	hooks?: {
		[key: string]: (this: IHookFunctions) => Promise<boolean>;
	};
	methods?: {
		loadOptions?: {
			[key: string]: (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;
		}
	};
	webhookMethods?: {
		[key: string]: IWebhookSetupMethods;
	};
}

export type WebhookSetupMethodNames = 'checkExists' | 'create' | 'delete';


export interface IWebhookSetupMethods {
	[key: string]: ((this: IHookFunctions) => Promise<boolean>) | undefined;
	checkExists?: (this: IHookFunctions) => Promise<boolean>;
	create?: (this: IHookFunctions) => Promise<boolean>;
	delete?: (this: IHookFunctions) => Promise<boolean>;
}


export interface INodeCredentialDescription {
	name: string;
	required?: boolean;
	displayOptions?: IDisplayOptions;
}

export type INodeIssueTypes = 'credentials' | 'execution' | 'parameters' | 'typeUnknown';

export interface INodeIssueObjectProperty {
	[key: string]: string[];
}

export interface INodeIssueData {
	node: string;
	type: INodeIssueTypes;
	value: boolean | string | string[] | INodeIssueObjectProperty;
}

export interface INodeIssues {
	execution?: boolean;
	credentials?: INodeIssueObjectProperty;
	parameters?: INodeIssueObjectProperty;
	typeUnknown?: boolean;
	[key: string]: undefined | boolean | INodeIssueObjectProperty;
}

export interface IWorfklowIssues {
	[key: string]: INodeIssues;
}

export interface INodeTypeDescription {
	displayName: string;
	name: string;
	icon?: string;
	group: string[];
	version: number;
	description: string;
	defaults: INodeParameters;
	documentationUrl?: string;
	inputs: string[];
	inputNames?: string[];
	outputs: string[];
	outputNames?: string[];
	properties: INodeProperties[];
	credentials?: INodeCredentialDescription[];
	maxNodes?: number; // How many nodes of that type can be created in a workflow
	polling?: boolean;
	subtitle?: string;
	hooks?: {
		[key: string]: INodeHookDescription[] | undefined;
		activate?: INodeHookDescription[];
		deactivate?: INodeHookDescription[];
	};
	webhooks?: IWebhookDescription[];
}

export interface INodeHookDescription {
	method: string;
}

export interface IWebhookData {
	httpMethod: WebhookHttpMethod;
	node: string;
	path: string;
	webhookDescription: IWebhookDescription;
	workflowId: string;
	workflowExecuteAdditionalData: IWorkflowExecuteAdditionalData;
	webhookId?: string;
}

export interface IWebhookDescription {
	[key: string]: WebhookHttpMethod | WebhookResponseMode | boolean | string | undefined;
	httpMethod: WebhookHttpMethod | string;
	isFullPath?: boolean;
	name: string;
	path: string;
	responseBinaryPropertyName?: string;
	responseContentType?: string;
	responsePropertyName?: string;
	responseMode?: WebhookResponseMode | string;
	responseData?: WebhookResponseData | string;
}

export interface IWorkflowDataProxyData {
	$binary: any; // tslint:disable-line:no-any
	$data: any; // tslint:disable-line:no-any
	$env: any; // tslint:disable-line:no-any
	$evaluateExpression: any; // tslint:disable-line:no-any
	$item: any; // tslint:disable-line:no-any
	$items: any; // tslint:disable-line:no-any
	$json: any; // tslint:disable-line:no-any
	$node: any; // tslint:disable-line:no-any
	$parameter: any; // tslint:disable-line:no-any
	$workflow: any; // tslint:disable-line:no-any
}

export interface IWorkflowMetadata {
	id?: number | string;
	name?: string;
	active: boolean;
}

export type WebhookHttpMethod = 'GET' | 'POST' | 'HEAD' | 'OPTIONS';

export interface IWebhookResponseData {
	workflowData?: INodeExecutionData[][];
	webhookResponse?: any; // tslint:disable-line:no-any
	noWebhookResponse?: boolean;
}

export type WebhookResponseData = 'allEntries' | 'firstEntryJson' | 'firstEntryBinary';
export type WebhookResponseMode = 'onReceived' | 'lastNode';

export interface INodeTypes {
	nodeTypes: INodeTypeData;
	init(nodeTypes?: INodeTypeData): Promise<void>;
	getAll(): INodeType[];
	getByName(nodeType: string): INodeType | undefined;
}


export interface INodeTypeData {
	[key: string]: {
		type: INodeType;
		sourcePath: string;
	};
}

export interface IRun {
	data: IRunExecutionData;
	finished?: boolean;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt?: Date;
}


// Contains all the data which is needed to execute a workflow and so also to
// start restart it again after it did fail.
// The RunData, ExecuteData and WaitForExecution contain often the same data.
export interface IRunExecutionData {
	startData?: {
		destinationNode?: string;
		runNodeFilter?: string[];
	};
	resultData: {
		error?: ExecutionError;
		runData: IRunData;
		lastNodeExecuted?: string;
	};
	executionData?: {
		contextData: IExecuteContextData;
		nodeExecutionStack: IExecuteData[];
		waitingExecution: IWaitingForExecution;
	};
}


export interface IRunData {
	// node-name: result-data
	[key: string]: ITaskData[];
}


// The data that gets returned when a node runs
export interface ITaskData {
	startTime: number;
	executionTime: number;
	data?: ITaskDataConnections;
	error?: ExecutionError;
}


// The data for al the different kind of connectons (like main) and all the indexes
export interface ITaskDataConnections {
	// Key for each input type and because there can be multiple inputs of the same type it is an array
	// null is also allowed because if we still need data for a later while executing the workflow set teompoary to null
	// the nodes get as input TaskDataConnections which is identical to this one except that no null is allowed.
	[key: string]: Array<INodeExecutionData[] | null>;
}



// Keeps data while workflow gets executed and allows when provided to restart execution
export interface IWaitingForExecution {
	// Node name
	[key: string]: {
		// Run index
		[key: number]: ITaskDataConnections
	};
}


export interface IWorkflowBase {
	id?: number | string | any; // tslint:disable-line:no-any
	name: string;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	staticData?: IDataObject;
}

export interface IWorkflowCredentials {
	// Credential type
	[key: string]: {
		// Name
		[key: string]: ICredentialsEncrypted;
	};
}


export interface IWorkflowExecuteHooks {
	[key: string]: Array<((...args: any[]) => Promise<void>)> | undefined; // tslint:disable-line:no-any
	nodeExecuteAfter?: Array<((nodeName: string, data: ITaskData, executionData: IRunExecutionData) => Promise<void>)>;
	nodeExecuteBefore?: Array<((nodeName: string) => Promise<void>)>;
	workflowExecuteAfter?: Array<((data: IRun, newStaticData: IDataObject) => Promise<void>)>;
	workflowExecuteBefore?: Array<((workflow: Workflow, data: IRunExecutionData) => Promise<void>)>;
}

export interface IWorkflowExecuteAdditionalData {
	credentialsHelper: ICredentialsHelper;
	encryptionKey: string;
	executeWorkflow: (workflowInfo: IExecuteWorkflowInfo, additionalData: IWorkflowExecuteAdditionalData, inputData?: INodeExecutionData[], parentExecutionId?: string, loadedWorkflowData?: IWorkflowBase, loadedRunData?: any) => Promise<any>; // tslint:disable-line:no-any
	// hooks?: IWorkflowExecuteHooks;
	hooks?: WorkflowHooks;
	httpResponse?: express.Response;
	httpRequest?: express.Request;
	restApiUrl: string;
	timezone: string;
	webhookBaseUrl: string;
	webhookTestBaseUrl: string;
	currentNodeParameters?: INodeParameters;
	executionTimeoutTimestamp?: number;
}

export type WorkflowExecuteMode = 'cli' | 'error' | 'integrated' | 'internal' | 'manual' | 'retry' | 'trigger' | 'webhook';
export type WorkflowActivateMode = 'init' | 'create' | 'update' | 'activate' | 'manual';

export interface IWorkflowHooksOptionalParameters {
	parentProcessMode?: string;
	retryOf?: string;
	sessionId?: string;
}

export interface IWorkflowSettings {
	[key: string]: IDataObject | string | number | boolean | undefined;
}

export type LogTypes = 'debug' | 'verbose' | 'info' | 'warn' | 'error';

export interface ILogger {
	log: (type: LogTypes, message: string, meta?: object) => void;
	debug: (message: string, meta?: object) => void;
	verbose: (message: string, meta?: object) => void;
	info: (message: string, meta?: object) => void;
	warn: (message: string, meta?: object) => void;
	error: (message: string, meta?: object) => void;
}
export interface IRawErrorObject {
	[key: string]: string | object | number | boolean | undefined | null | string[] | object[] | number[] | boolean[];
}

export interface IStatusCodeMessages {
	[key: string]: string;
}
