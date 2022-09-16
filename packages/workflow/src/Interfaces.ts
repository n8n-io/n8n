/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-cycle */
// eslint-disable-next-line import/no-extraneous-dependencies
// eslint-disable-next-line max-classes-per-file
import * as express from 'express';
import * as FormData from 'form-data';
import { URLSearchParams } from 'url';
import { IDeferredPromise } from './DeferredPromise';
import { Workflow } from './Workflow';
import { WorkflowHooks } from './WorkflowHooks';
import { WorkflowActivationError } from './WorkflowActivationError';
import { WorkflowOperationError } from './WorkflowErrors';
import { NodeApiError, NodeOperationError } from './NodeErrors';

export interface IAdditionalCredentialOptions {
	oauth2?: IOAuth2Options;
	credentialsDecrypted?: ICredentialsDecrypted;
}

export type IAllExecuteFunctions =
	| IExecuteFunctions
	| IExecutePaginationFunctions
	| IExecuteSingleFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IPollFunctions
	| ITriggerFunctions
	| IWebhookFunctions;

export interface IBinaryData {
	[key: string]: string | undefined;
	data: string;
	mimeType: string;
	fileName?: string;
	directory?: string;
	fileExtension?: string;
	id?: string;
}

// All properties in this interface except for
// "includeCredentialsOnRefreshOnBody" will get
// removed once we add the OAuth2 hooks to the
// credentials file.
export interface IOAuth2Options {
	includeCredentialsOnRefreshOnBody?: boolean;
	property?: string;
	tokenType?: string;
	keepBearer?: boolean;
	tokenExpiredStatusCode?: number;
	keyToIncludeInAccessTokenHeader?: string;
}

export interface IConnection {
	// The node the connection is to
	node: string;

	// The type of the input on destination node (for example "main")
	type: string;

	// The output/input-index of destination node (if node has multiple inputs/outputs of the same type)
	index: number;
}

export type ExecutionError =
	| WorkflowActivationError
	| WorkflowOperationError
	| NodeOperationError
	| NodeApiError;

// Get used to gives nodes access to credentials
export interface IGetCredentials {
	get(type: string, id: string | null): Promise<ICredentialsEncrypted>;
}

export abstract class ICredentials {
	id?: string;

	name: string;

	type: string;

	data: string | undefined;

	nodesAccess: ICredentialNodeAccess[];

	constructor(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		nodesAccess: ICredentialNodeAccess[],
		data?: string,
	) {
		this.id = nodeCredentials.id ?? undefined;
		this.name = nodeCredentials.name;
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
// when that access got granted from which user
export interface ICredentialNodeAccess {
	nodeType: string;
	user?: string;
	date?: Date;
}

export interface ICredentialsDecrypted {
	id: string | number;
	name: string;
	type: string;
	nodesAccess: ICredentialNodeAccess[];
	data?: ICredentialDataDecryptedObject;
}

export interface ICredentialsEncrypted {
	id?: string | number;
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

// Simplified options of request library
export interface IRequestOptionsSimplified {
	auth?: {
		username: string;
		password: string;
	};
	body: IDataObject;
	headers: IDataObject;
	qs: IDataObject;
}

export interface IRequestOptionsSimplifiedAuth {
	auth?: {
		username: string;
		password: string;
	};
	body?: IDataObject;
	headers?: IDataObject;
	qs?: IDataObject;
	skipSslCertificateValidation?: boolean | string;
}

export interface IHttpRequestHelper {
	helpers: { httpRequest: IAllExecuteFunctions['helpers']['httpRequest'] };
}
export abstract class ICredentialsHelper {
	encryptionKey: string;

	constructor(encryptionKey: string) {
		this.encryptionKey = encryptionKey;
	}

	abstract getParentTypes(name: string): string[];

	abstract authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		workflow: Workflow,
		node: INode,
		defaultTimezone: string,
	): Promise<IHttpRequestOptions>;

	abstract preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined>;

	abstract getCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentials>;

	abstract getDecrypted(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		mode: WorkflowExecuteMode,
		defaultTimezone: string,
		raw?: boolean,
		expressionResolveValues?: ICredentialsExpressionResolveValues,
	): Promise<ICredentialDataDecryptedObject>;

	abstract updateCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<void>;
}

export interface IAuthenticateBase {
	type: string;
	properties:
		| {
				[key: string]: string;
		  }
		| IRequestOptionsSimplifiedAuth;
}

export interface IAuthenticateGeneric extends IAuthenticateBase {
	type: 'generic';
	properties: IRequestOptionsSimplifiedAuth;
}

export type IAuthenticate =
	| ((
			credentials: ICredentialDataDecryptedObject,
			requestOptions: IHttpRequestOptions,
	  ) => Promise<IHttpRequestOptions>)
	| IAuthenticateGeneric;

export interface IAuthenticateRuleBase {
	type: string;
	properties: {
		[key: string]: string | number;
	};
	errorMessage?: string;
}

export interface IAuthenticateRuleResponseCode extends IAuthenticateRuleBase {
	type: 'responseCode';
	properties: {
		value: number;
		message: string;
	};
}

export interface IAuthenticateRuleResponseSuccessBody extends IAuthenticateRuleBase {
	type: 'responseSuccessBody';
	properties: {
		message: string;
		key: string;
		value: any;
	};
}

type Override<A extends object, B extends object> = Omit<A, keyof B> & B;

export namespace DeclarativeRestApiSettings {
	// The type below might be extended
	// with new options that need to be parsed as expressions
	export type HttpRequestOptions = Override<
		IHttpRequestOptions,
		{ skipSslCertificateValidation?: string | boolean; url?: string }
	>;

	export type ResultOptions = {
		maxResults?: number | string;
		options: HttpRequestOptions;
		paginate?: boolean | string;
		preSend: PreSendAction[];
		postReceive: Array<{
			data: {
				parameterValue: string | IDataObject | undefined;
			};
			actions: PostReceiveAction[];
		}>;
		requestOperations?: IN8nRequestOperations;
	};
}

export interface ICredentialTestRequest {
	request: DeclarativeRestApiSettings.HttpRequestOptions;
	rules?: IAuthenticateRuleResponseCode[] | IAuthenticateRuleResponseSuccessBody[];
}

export interface ICredentialTestRequestData {
	nodeType?: INodeType;
	testRequest: ICredentialTestRequest;
}

export interface ICredentialType {
	name: string;
	displayName: string;
	icon?: string;
	extends?: string[];
	properties: INodeProperties[];
	documentationUrl?: string;
	__overwrittenProperties?: string[];
	authenticate?: IAuthenticate;
	preAuthentication?: (
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	) => Promise<IDataObject>;
	test?: ICredentialTestRequest;
	genericAuth?: boolean;
}

export interface ICredentialTypes {
	credentialTypes?: ICredentialTypeData;
	init(credentialTypes?: ICredentialTypeData): Promise<void>;
	getAll(): ICredentialType[];
	getByName(credentialType: string): ICredentialType;
}

// The way the credentials get saved in the database (data encrypted)
export interface ICredentialData {
	id?: string;
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

export interface INodeConnection {
	sourceIndex: number;
	destinationIndex: number;
}

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

// export type IExecuteResponsePromiseData = IDataObject;
export type IExecuteResponsePromiseData = IDataObject | IN8nHttpFullResponse;

export interface INodeTypeNameVersion {
	name: string;
	version: number;
}

export interface IGetExecutePollFunctions {
	(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): IPollFunctions;
}

export interface IGetExecuteTriggerFunctions {
	(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): ITriggerFunctions;
}

export interface IRunNodeResponse {
	data: INodeExecutionData[][] | null | undefined;
	closeFunction?: () => Promise<void>;
}
export interface IGetExecuteFunctions {
	(
		workflow: Workflow,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		connectionInputData: INodeExecutionData[],
		inputData: ITaskDataConnections,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		executeData: IExecuteData,
		mode: WorkflowExecuteMode,
	): IExecuteFunctions;
}

export interface IGetExecuteSingleFunctions {
	(
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
	): IExecuteSingleFunctions;
}

export interface IGetExecuteHookFunctions {
	(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		isTest?: boolean,
		webhookData?: IWebhookData,
	): IHookFunctions;
}

export interface IGetExecuteWebhookFunctions {
	(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		webhookData: IWebhookData,
	): IWebhookFunctions;
}

export interface ISourceDataConnections {
	// Key for each input type and because there can be multiple inputs of the same type it is an array
	// null is also allowed because if we still need data for a later while executing the workflow set temporary to null
	// the nodes get as input TaskDataConnections which is identical to this one except that no null is allowed.
	[key: string]: Array<ISourceData[] | null>;
}

export interface IExecuteData {
	data: ITaskDataConnections;
	node: INode;
	source: ITaskDataConnectionsSource | null;
}

export type IContextObject = {
	[key: string]: any;
};

export interface IExecuteContextData {
	// Keys are: "flow" | "node:<NODE_NAME>"
	[key: string]: IContextObject;
}

export type IHttpRequestMethods = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';

export interface IHttpRequestOptions {
	url: string;
	baseURL?: string;
	headers?: IDataObject;
	method?: IHttpRequestMethods;
	body?: FormData | GenericValue | GenericValue[] | Buffer | URLSearchParams;
	qs?: IDataObject;
	arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
	auth?: {
		username: string;
		password: string;
	};
	disableFollowRedirect?: boolean;
	encoding?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
	skipSslCertificateValidation?: boolean;
	returnFullResponse?: boolean;
	ignoreHttpStatusErrors?: boolean;
	proxy?: {
		host: string;
		port: number;
		auth?: {
			username: string;
			password: string;
		};
		protocol?: string;
	};
	timeout?: number;
	json?: boolean;
}

export type IN8nHttpResponse = IDataObject | Buffer | GenericValue | GenericValue[] | null;

export interface IN8nHttpFullResponse {
	body: IN8nHttpResponse;
	headers: IDataObject;
	statusCode: number;
	statusMessage?: string;
}

export interface IN8nRequestOperations {
	pagination?:
		| IN8nRequestOperationPaginationOffset
		| ((
				this: IExecutePaginationFunctions,
				requestOptions: DeclarativeRestApiSettings.ResultOptions,
		  ) => Promise<INodeExecutionData[]>);
}

export interface IN8nRequestOperationPaginationBase {
	type: string;
	properties: {
		[key: string]: string | number;
	};
}

export interface IN8nRequestOperationPaginationOffset extends IN8nRequestOperationPaginationBase {
	type: 'offset';
	properties: {
		limitParameter: string;
		offsetParameter: string;
		pageSize: number;
		rootProperty?: string; // Optional Path to option array
		type: 'body' | 'query';
	};
}

export interface IExecuteFunctions {
	continueOnFail(): boolean;
	evaluateExpression(
		expression: string,
		itemIndex: number,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[];
	executeWorkflow(
		workflowInfo: IExecuteWorkflowInfo,
		inputData?: INodeExecutionData[],
	): Promise<any>;
	getContext(type: string): IContextObject;
	getCredentials(type: string, itemIndex?: number): Promise<ICredentialDataDecryptedObject>;
	getInputData(inputIndex?: number, inputName?: string): INodeExecutionData[];
	getMode(): WorkflowExecuteMode;
	getNode(): INode;
	getNodeParameter<T extends { resource: string }>(
		parameterName: 'resource',
		itemIndex?: number,
	): T['resource'];
	// getNodeParameter(parameterName: 'operation', itemIndex?: number): string;
	getNodeParameter(
		parameterName: string,
		itemIndex: number,
		fallbackValue?: any,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object;
	getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData;
	getWorkflowStaticData(type: string): IDataObject;
	getRestApiUrl(): string;
	getTimezone(): string;
	getExecuteData(): IExecuteData;
	getWorkflow(): IWorkflowMetadata;
	prepareOutputData(
		outputData: INodeExecutionData[],
		outputIndex?: number,
	): Promise<INodeExecutionData[][]>;
	putExecutionToWait(waitTill: Date): Promise<void>;
	sendMessageToUI(message: any): void; // tslint:disable-line:no-any
	sendResponse(response: IExecuteResponsePromiseData): void; // tslint:disable-line:no-any
	helpers: {
		httpRequest(
			requestOptions: IHttpRequestOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		[key: string]: (...args: any[]) => any; // tslint:disable-line:no-any
	};
}

export interface IExecuteSingleFunctions {
	continueOnFail(): boolean;
	evaluateExpression(
		expression: string,
		itemIndex: number | undefined,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[];
	getContext(type: string): IContextObject;
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
	getInputData(inputIndex?: number, inputName?: string): INodeExecutionData;
	getItemIndex(): number;
	getMode(): WorkflowExecuteMode;
	getNode(): INode;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object;
	getRestApiUrl(): string;
	getTimezone(): string;
	getExecuteData(): IExecuteData;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowDataProxy(): IWorkflowDataProxyData;
	getWorkflowStaticData(type: string): IDataObject;
	helpers: {
		httpRequest(
			requestOptions: IHttpRequestOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		[key: string]: (...args: any[]) => any; // tslint:disable-line:no-any
	};
}

export interface IExecutePaginationFunctions extends IExecuteSingleFunctions {
	makeRoutingRequest(
		this: IAllExecuteFunctions,
		requestOptions: DeclarativeRestApiSettings.ResultOptions,
	): Promise<INodeExecutionData[]>;
}
export interface IExecuteWorkflowInfo {
	code?: IWorkflowBase;
	id?: string;
}

export type ICredentialTestFunction = (
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
) => Promise<INodeCredentialTestResult>;

export interface ICredentialTestFunctions {
	helpers: {
		[key: string]: (...args: any[]) => any;
	};
}

export interface ILoadOptionsFunctions {
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
	getNode(): INode;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object;
	getCurrentNodeParameter(
		parameterName: string,
	):
		| NodeParameterValue
		| INodeParameters
		| NodeParameterValue[]
		| INodeParameters[]
		| object
		| undefined;
	getCurrentNodeParameters(): INodeParameters | undefined;
	getTimezone(): string;
	getRestApiUrl(): string;
	helpers: {
		httpRequest(
			requestOptions: IHttpRequestOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		// TODO: Remove from here. Add it only now to LoadOptions as many nodes do import
		//       from n8n-workflow instead of n8n-core
		requestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: any, // tslint:disable-line:no-any
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		[key: string]: ((...args: any[]) => any) | undefined; // tslint:disable-line:no-any
	};
}

export interface IHookFunctions {
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
	getMode(): WorkflowExecuteMode;
	getActivationMode(): WorkflowActivateMode;
	getNode(): INode;
	getNodeWebhookUrl: (name: string) => string | undefined;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object;
	getTimezone(): string;
	getWebhookDescription(name: string): IWebhookDescription | undefined;
	getWebhookName(): string;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowStaticData(type: string): IDataObject;
	helpers: {
		httpRequest(
			requestOptions: IHttpRequestOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		[key: string]: (...args: any[]) => any; // tslint:disable-line:no-any
	};
}

export interface IPollFunctions {
	__emit(data: INodeExecutionData[][] | NodeApiError): void;
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
	getMode(): WorkflowExecuteMode;
	getActivationMode(): WorkflowActivateMode;
	getNode(): INode;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object;
	getRestApiUrl(): string;
	getTimezone(): string;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowStaticData(type: string): IDataObject;
	helpers: {
		httpRequest(
			requestOptions: IHttpRequestOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		[key: string]: (...args: any[]) => any; // tslint:disable-line:no-any
	};
}

export interface ITriggerFunctions {
	emit(
		data: INodeExecutionData[][],
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
		donePromise?: IDeferredPromise<IRun>,
	): void;
	emitError(error: Error, responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>): void;
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
	getMode(): WorkflowExecuteMode;
	getActivationMode(): WorkflowActivateMode;
	getNode(): INode;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object;
	getRestApiUrl(): string;
	getTimezone(): string;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowStaticData(type: string): IDataObject;
	helpers: {
		httpRequest(
			requestOptions: IHttpRequestOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		[key: string]: (...args: any[]) => any; // tslint:disable-line:no-any
	};
}

export interface IWebhookFunctions {
	getBodyData(): IDataObject;
	getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
	getHeaderData(): object;
	getMode(): WorkflowExecuteMode;
	getNode(): INode;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object;
	getNodeWebhookUrl: (name: string) => string | undefined;
	getParamsData(): object;
	getQueryData(): object;
	getRequestObject(): express.Request;
	getResponseObject(): express.Response;
	getTimezone(): string;
	getWebhookName(): string;
	getWorkflowStaticData(type: string): IDataObject;
	getWorkflow(): IWorkflowMetadata;
	prepareOutputData(
		outputData: INodeExecutionData[],
		outputIndex?: number,
	): Promise<INodeExecutionData[][]>;
	helpers: {
		httpRequest(
			requestOptions: IHttpRequestOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		httpRequestWithAuthentication(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IHttpRequestOptions,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<IN8nHttpResponse | IN8nHttpFullResponse>;
		[key: string]: (...args: any[]) => any; // tslint:disable-line:no-any
	};
}

export interface INodeCredentialsDetails {
	id: string | null;
	name: string;
}

export interface INodeCredentials {
	[key: string]: INodeCredentialsDetails;
}

export interface INode {
	id: string;
	name: string;
	typeVersion: number;
	type: string;
	position: [number, number];
	disabled?: boolean;
	notes?: string;
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

export interface IPinData {
	[nodeName: string]: INodeExecutionData[];
}

export interface INodes {
	[key: string]: INode;
}

export interface IObservableObject {
	[key: string]: any;
	__dataChanged: boolean;
}

export interface IBinaryKeyData {
	[key: string]: IBinaryData;
}

export interface IPairedItemData {
	item: number;
	input?: number; // If undefined "0" gets used
}

export interface INodeExecutionData {
	[key: string]:
		| IDataObject
		| IBinaryKeyData
		| IPairedItemData
		| IPairedItemData[]
		| NodeApiError
		| NodeOperationError
		| number
		| undefined;
	json: IDataObject;
	binary?: IBinaryKeyData;
	error?: NodeApiError | NodeOperationError;
	pairedItem?: IPairedItemData | IPairedItemData[] | number;
	index?: number;
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

export type NodePropertyTypes =
	| 'boolean'
	| 'collection'
	| 'color'
	| 'dateTime'
	| 'fixedCollection'
	| 'hidden'
	| 'json'
	| 'notice'
	| 'multiOptions'
	| 'number'
	| 'options'
	| 'string'
	| 'credentialsSelect';

export type CodeAutocompleteTypes = 'function' | 'functionItem';

export type EditorTypes = 'code' | 'json';

export interface ILoadOptions {
	routing?: {
		operations?: IN8nRequestOperations;
		output?: INodeRequestOutput;
		request?: DeclarativeRestApiSettings.HttpRequestOptions;
	};
}

export interface INodePropertyTypeOptions {
	alwaysOpenEditWindow?: boolean; // Supported by: string
	codeAutocomplete?: CodeAutocompleteTypes; // Supported by: string
	editor?: EditorTypes; // Supported by: string
	loadOptionsDependsOn?: string[]; // Supported by: options
	loadOptionsMethod?: string; // Supported by: options
	loadOptions?: ILoadOptions; // Supported by: options
	maxValue?: number; // Supported by: number
	minValue?: number; // Supported by: number
	multipleValues?: boolean; // Supported by: <All>
	multipleValueButtonText?: string; // Supported when "multipleValues" set to true
	numberPrecision?: number; // Supported by: number
	password?: boolean; // Supported by: string
	rows?: number; // Supported by: string
	showAlpha?: boolean; // Supported by: color
	sortable?: boolean; // Supported when "multipleValues" set to true
	expirable?: boolean; // Supported by: hidden (only in the credentials)
	[key: string]: any;
}

export interface IDisplayOptions {
	hide?: {
		[key: string]: NodeParameterValue[] | undefined;
	};
	show?: {
		[key: string]: NodeParameterValue[] | undefined;
	};
}

export interface INodeProperties {
	displayName: string;
	name: string;
	type: NodePropertyTypes;
	typeOptions?: INodePropertyTypeOptions;
	default: NodeParameterValue | INodeParameters | INodeParameters[] | NodeParameterValue[];
	description?: string;
	hint?: string;
	displayOptions?: IDisplayOptions;
	options?: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>;
	placeholder?: string;
	isNodeSetting?: boolean;
	noDataExpression?: boolean;
	required?: boolean;
	routing?: INodePropertyRouting;
	credentialTypes?: Array<
		'extends:oAuth2Api' | 'extends:oAuth1Api' | 'has:authenticate' | 'has:genericAuth'
	>;
}
export interface INodePropertyOptions {
	name: string;
	value: string | number | boolean;
	action?: string;
	description?: string;
	routing?: INodePropertyRouting;
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
	execute?(
		this: IExecuteFunctions,
	): Promise<INodeExecutionData[][] | NodeExecutionWithMetadata[][] | null>;
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
		};
		credentialTest?: {
			// Contains a group of functions that test credentials.
			[functionName: string]: ICredentialTestFunction;
		};
	};
	webhookMethods?: {
		[key: string]: IWebhookSetupMethods;
	};
}

export interface INodeVersionedType {
	nodeVersions: {
		[key: number]: INodeType;
	};
	currentVersion: number;
	description: INodeTypeBaseDescription;
	getNodeType: (version?: number) => INodeType;
}
export interface INodeCredentialTestResult {
	status: 'OK' | 'Error';
	message: string;
}

export interface INodeCredentialTestRequest {
	nodeToTestWith?: string; // node name i.e. slack
	credentials: ICredentialsDecrypted;
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
	testedBy?: ICredentialTestRequest | string; // Name of a function inside `loadOptions.credentialTest`
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

export interface INodeTypeBaseDescription {
	displayName: string;
	name: string;
	icon?: string;
	group: string[];
	description: string;
	documentationUrl?: string;
	subtitle?: string;
	defaultVersion?: number;
	codex?: CodexData;

	/**
	 * Whether the node must be hidden in the node creator panel,
	 * due to deprecation or as a special case (e.g. Start node)
	 */
	hidden?: true;
}

export interface INodePropertyRouting {
	operations?: IN8nRequestOperations; // Should be changed, does not sound right
	output?: INodeRequestOutput;
	request?: DeclarativeRestApiSettings.HttpRequestOptions;
	send?: INodeRequestSend;
}

export type PostReceiveAction =
	| ((
			this: IExecuteSingleFunctions,
			items: INodeExecutionData[],
			response: IN8nHttpFullResponse,
	  ) => Promise<INodeExecutionData[]>)
	| IPostReceiveBinaryData
	| IPostReceiveLimit
	| IPostReceiveRootProperty
	| IPostReceiveSet
	| IPostReceiveSetKeyValue
	| IPostReceiveSort;

export type PreSendAction = (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) => Promise<IHttpRequestOptions>;

export interface INodeRequestOutput {
	maxResults?: number | string;
	postReceive?: PostReceiveAction[];
}

export interface INodeRequestSend {
	preSend?: PreSendAction[];
	paginate?: boolean | string; // Where should this life?
	property?: string; // Maybe: propertyName, destinationProperty?
	propertyInDotNotation?: boolean; // Enabled by default
	type?: 'body' | 'query';
	value?: string;
}

export interface IPostReceiveBase {
	type: string;
	enabled?: boolean | string;
	properties: {
		[key: string]: string | number | IDataObject;
	};
	errorMessage?: string;
}

export interface IPostReceiveBinaryData extends IPostReceiveBase {
	type: 'binaryData';
	properties: {
		destinationProperty: string;
	};
}

export interface IPostReceiveLimit extends IPostReceiveBase {
	type: 'limit';
	properties: {
		maxResults: number | string;
	};
}

export interface IPostReceiveRootProperty extends IPostReceiveBase {
	type: 'rootProperty';
	properties: {
		property: string;
	};
}

export interface IPostReceiveSet extends IPostReceiveBase {
	type: 'set';
	properties: {
		value: string;
	};
}

export interface IPostReceiveSetKeyValue extends IPostReceiveBase {
	type: 'setKeyValue';
	properties: {
		[key: string]: string | number;
	};
}

export interface IPostReceiveSort extends IPostReceiveBase {
	type: 'sort';
	properties: {
		key: string;
	};
}

export interface INodeTypeDescription extends INodeTypeBaseDescription {
	version: number | number[];
	defaults: INodeParameters;
	eventTriggerDescription?: string;
	activationMessage?: string;
	inputs: string[];
	inputNames?: string[];
	outputs: string[];
	outputNames?: string[];
	properties: INodeProperties[];
	credentials?: INodeCredentialDescription[];
	maxNodes?: number; // How many nodes of that type can be created in a workflow
	polling?: boolean;
	requestDefaults?: DeclarativeRestApiSettings.HttpRequestOptions;
	requestOperations?: IN8nRequestOperations;
	hooks?: {
		[key: string]: INodeHookDescription[] | undefined;
		activate?: INodeHookDescription[];
		deactivate?: INodeHookDescription[];
	};
	webhooks?: IWebhookDescription[];
	translation?: { [key: string]: object };
	mockManualExecution?: true;
	triggerPanel?: {
		header?: string;
		executionsHelp?:
			| string
			| {
					active: string;
					inactive: string;
			  };
		activationHint?:
			| string
			| {
					active: string;
					inactive: string;
			  };
	};
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
	restartWebhook?: boolean;
}

export interface IWorkflowDataProxyData {
	[key: string]: any;
	$binary: any;
	$data: any;
	$env: any;
	$evaluateExpression: any;
	$item: any;
	$items: any;
	$json: any;
	$node: any;
	$parameter: any;
	$position: any;
	$workflow: any;
	$: any;
	$input: any;
	$thisItem: any;
	$thisRunIndex: number;
	$thisItemIndex: number;
	$now: any;
	$today: any;
}

export type IWorkflowDataProxyAdditionalKeys = IDataObject;

export interface IWorkflowMetadata {
	id?: number | string;
	name?: string;
	active: boolean;
}

export type WebhookHttpMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS';

export interface IWebhookResponseData {
	workflowData?: INodeExecutionData[][];
	webhookResponse?: any;
	noWebhookResponse?: boolean;
}

export type WebhookResponseData = 'allEntries' | 'firstEntryJson' | 'firstEntryBinary' | 'noData';
export type WebhookResponseMode = 'onReceived' | 'lastNode';

export interface INodeTypes {
	nodeTypes: INodeTypeData;
	init(nodeTypes?: INodeTypeData): Promise<void>;
	getAll(): Array<INodeType | INodeVersionedType>;
	getByNameAndVersion(nodeType: string, version?: number): INodeType | undefined;
}

export interface ICredentialTypeData {
	[key: string]: {
		type: ICredentialType;
		sourcePath: string;
	};
}

export interface INodeTypeData {
	[key: string]: {
		type: INodeType | INodeVersionedType;
		sourcePath: string;
	};
}

export interface IRun {
	data: IRunExecutionData;
	finished?: boolean;
	mode: WorkflowExecuteMode;
	waitTill?: Date;
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
		pinData?: IPinData;
		lastNodeExecuted?: string;
	};
	executionData?: {
		contextData: IExecuteContextData;
		nodeExecutionStack: IExecuteData[];
		waitingExecution: IWaitingForExecution;
		waitingExecutionSource: IWaitingForExecutionSource | null;
	};
	waitTill?: Date;
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
	source: Array<ISourceData | null>; // Is an array as nodes have multiple inputs
}

export interface ISourceData {
	previousNode: string;
	previousNodeOutput?: number; // If undefined "0" gets used
	previousNodeRun?: number; // If undefined "0" gets used
}

// The data for all the different kind of connections (like main) and all the indexes
export interface ITaskDataConnections {
	// Key for each input type and because there can be multiple inputs of the same type it is an array
	// null is also allowed because if we still need data for a later while executing the workflow set temporary to null
	// the nodes get as input TaskDataConnections which is identical to this one except that no null is allowed.
	[key: string]: Array<INodeExecutionData[] | null>;
}

// Keeps data while workflow gets executed and allows when provided to restart execution
export interface IWaitingForExecution {
	// Node name
	[key: string]: {
		// Run index
		[key: number]: ITaskDataConnections;
	};
}

export interface ITaskDataConnectionsSource {
	// Key for each input type and because there can be multiple inputs of the same type it is an array
	// null is also allowed because if we still need data for a later while executing the workflow set temporary to null
	// the nodes get as input TaskDataConnections which is identical to this one except that no null is allowed.
	[key: string]: Array<ISourceData | null>;
}

export interface IWaitingForExecutionSource {
	// Node name
	[key: string]: {
		// Run index
		[key: number]: ITaskDataConnectionsSource;
	};
}

export interface IWorkflowBase {
	id?: number | string | any;
	name: string;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	staticData?: IDataObject;
	pinData?: IPinData;
}

export interface IWorkflowCredentials {
	[credentialType: string]: {
		[id: string]: ICredentialsEncrypted;
	};
}

export interface IWorkflowExecuteHooks {
	[key: string]: Array<(...args: any[]) => Promise<void>> | undefined;
	nodeExecuteAfter?: Array<
		(nodeName: string, data: ITaskData, executionData: IRunExecutionData) => Promise<void>
	>;
	nodeExecuteBefore?: Array<(nodeName: string) => Promise<void>>;
	workflowExecuteAfter?: Array<(data: IRun, newStaticData: IDataObject) => Promise<void>>;
	workflowExecuteBefore?: Array<(workflow: Workflow, data: IRunExecutionData) => Promise<void>>;
	sendResponse?: Array<(response: IExecuteResponsePromiseData) => Promise<void>>;
}

export interface IWorkflowExecuteAdditionalData {
	credentialsHelper: ICredentialsHelper;
	encryptionKey: string;
	executeWorkflow: (
		workflowInfo: IExecuteWorkflowInfo,
		additionalData: IWorkflowExecuteAdditionalData,
		options?: {
			parentWorkflowId?: string;
			inputData?: INodeExecutionData[];
			parentExecutionId?: string;
			loadedWorkflowData?: IWorkflowBase;
			loadedRunData?: any;
			parentWorkflowSettings?: IWorkflowSettings;
		},
	) => Promise<any>;
	// hooks?: IWorkflowExecuteHooks;
	executionId?: string;
	hooks?: WorkflowHooks;
	httpResponse?: express.Response;
	httpRequest?: express.Request;
	restApiUrl: string;
	sendMessageToUI?: (source: string, message: any) => void;
	timezone: string;
	webhookBaseUrl: string;
	webhookWaitingBaseUrl: string;
	webhookTestBaseUrl: string;
	currentNodeParameters?: INodeParameters;
	executionTimeoutTimestamp?: number;
	userId: string;
}

export type WorkflowExecuteMode =
	| 'cli'
	| 'error'
	| 'integrated'
	| 'internal'
	| 'manual'
	| 'retry'
	| 'trigger'
	| 'webhook';
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

export interface IStatusCodeMessages {
	[key: string]: string;
}

export type CodexData = {
	categories?: string[];
	subcategories?: { [category: string]: string[] };
	alias?: string[];
};

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export type JsonObject = { [key: string]: JsonValue };

export type AllEntities<M> = M extends { [key: string]: string } ? Entity<M, keyof M> : never;

export type Entity<M, K> = K extends keyof M ? { resource: K; operation: M[K] } : never;

export type PropertiesOf<M extends { resource: string; operation: string }> = Array<
	Omit<INodeProperties, 'displayOptions'> & {
		displayOptions?: {
			[key in 'show' | 'hide']?: {
				resource?: Array<M['resource']>;
				operation?: Array<M['operation']>;
				[otherKey: string]: NodeParameterValue[] | undefined;
			};
		};
	}
>;

// Telemetry

export interface ITelemetryTrackProperties {
	user_id?: string;
	[key: string]: GenericValue;
}

export interface INodesGraph {
	node_types: string[];
	node_connections: IDataObject[];
	nodes: INodesGraphNode;
	notes: INotesGraphNode;
	is_pinned: boolean;
}

export interface INodesGraphNode {
	[key: string]: INodeGraphItem;
}

export interface INotesGraphNode {
	[key: string]: INoteGraphItem;
}

export interface INoteGraphItem {
	overlapping: boolean;
	position: [number, number];
	height: number;
	width: number;
}

export interface INodeGraphItem {
	id: string;
	type: string;
	resource?: string;
	operation?: string;
	domain?: string; // HTTP Request node v1
	domain_base?: string; // HTTP Request node v2
	domain_path?: string; // HTTP Request node v2
	position: [number, number];
	mode?: string;
	credential_type?: string; // HTTP Request node v2
	credential_set?: boolean; // HTTP Request node v2
	method?: string; // HTTP Request node v2
	src_node_id?: string;
	src_instance_id?: string;
}

export interface INodeNameIndex {
	[name: string]: string;
}

export interface INodesGraphResult {
	nodeGraph: INodesGraph;
	nameIndices: INodeNameIndex;
	webhookNodeNames: string[];
}

export interface ITelemetryClientConfig {
	url: string;
	key: string;
}

export interface ITelemetrySettings {
	enabled: boolean;
	config?: ITelemetryClientConfig;
}

export interface IConnectedNode {
	name: string;
	indicies: number[];
	depth: number;
}

export enum OAuth2GrantType {
	authorizationCode = 'authorizationCode',
	clientCredentials = 'clientCredentials',
}
export interface IOAuth2Credentials {
	grantType: 'authorizationCode' | 'clientCredentials';
	clientId: string;
	clientSecret: string;
	accessTokenUrl: string;
	authUrl: string;
	authQueryParameters: string;
	authentication: 'body' | 'header';
	scope: string;
	oauthTokenData?: IDataObject;
}

export type PublicInstalledPackage = {
	packageName: string;
	installedVersion: string;
	authorName?: string;
	authorEmail?: string;
	installedNodes: PublicInstalledNode[];
	createdAt: Date;
	updatedAt: Date;
	updateAvailable?: string;
	failedLoading?: boolean;
};

export type PublicInstalledNode = {
	name: string;
	type: string;
	latestVersion: string;
	package: PublicInstalledPackage;
};

export interface NodeExecutionWithMetadata extends INodeExecutionData {
	pairedItem: IPairedItemData | IPairedItemData[];
}
