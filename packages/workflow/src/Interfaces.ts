/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as express from 'express';
import type FormData from 'form-data';
import type { PathLike } from 'fs';
import type { IncomingHttpHeaders } from 'http';
import type { OptionsWithUri, OptionsWithUrl } from 'request';
import type { RequestPromiseOptions } from 'request-promise-native';
import type { Readable } from 'stream';
import type { URLSearchParams } from 'url';

import type { AuthenticationMethod } from './Authentication';
import type { CODE_EXECUTION_MODES, CODE_LANGUAGES, LOG_LEVELS } from './Constants';
import type { IDeferredPromise } from './DeferredPromise';
import type { ExecutionStatus } from './ExecutionStatus';
import type { ExpressionError } from './errors/expression.error';
import type { Workflow } from './Workflow';
import type { WorkflowActivationError } from './errors/workflow-activation.error';
import type { WorkflowOperationError } from './errors/workflow-operation.error';
import type { WorkflowHooks } from './WorkflowHooks';
import type { NodeOperationError } from './errors/node-operation.error';
import type { NodeApiError } from './errors/node-api.error';

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

export type BinaryFileType = 'text' | 'json' | 'image' | 'audio' | 'video' | 'pdf' | 'html';
export interface IBinaryData {
	[key: string]: string | undefined;
	data: string;
	mimeType: string;
	fileType?: BinaryFileType;
	fileName?: string;
	directory?: string;
	fileExtension?: string;
	fileSize?: string; // TODO: change this to number and store the actual value
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
	| ExpressionError
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

	abstract getData(nodeType?: string): ICredentialDataDecryptedObject;

	abstract getDataToSave(): ICredentialsEncrypted;

	abstract hasNodeAccess(nodeType: string): boolean;

	abstract setData(data: ICredentialDataDecryptedObject): void;
}

export interface IUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
}

// Defines which nodes are allowed to access the credentials and
// when that access got granted from which user
export interface ICredentialNodeAccess {
	nodeType: string;
	user?: string;
	date?: Date;
}

export interface ICredentialsDecrypted {
	id: string;
	name: string;
	type: string;
	nodesAccess: ICredentialNodeAccess[];
	data?: ICredentialDataDecryptedObject;
	ownedBy?: IUser;
	sharedWith?: IUser[];
}

export interface ICredentialsEncrypted {
	id?: string;
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
		sendImmediately?: boolean;
	};
	body: IDataObject;
	headers: IDataObject;
	qs: IDataObject;
}

export interface IRequestOptionsSimplifiedAuth {
	auth?: {
		username: string;
		password: string;
		sendImmediately?: boolean;
	};
	body?: IDataObject;
	headers?: IDataObject;
	qs?: IDataObject;
	url?: string;
	skipSslCertificateValidation?: boolean | string;
}

export interface IHttpRequestHelper {
	helpers: { httpRequest: IAllExecuteFunctions['helpers']['httpRequest'] };
}
export abstract class ICredentialsHelper {
	abstract getParentTypes(name: string): string[];

	abstract authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		workflow: Workflow,
		node: INode,
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
		additionalData: IWorkflowExecuteAdditionalData,
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		mode: WorkflowExecuteMode,
		executeData?: IExecuteData,
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

type ICredentialHttpRequestNode = {
	name: string;
	docsUrl: string;
} & ({ apiBaseUrl: string } | { apiBaseUrlPlaceholder: string });

export interface ICredentialType {
	name: string;
	displayName: string;
	icon?: string;
	iconUrl?: string;
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
	httpRequestNode?: ICredentialHttpRequestNode;
}

export interface ICredentialTypes {
	recognizes(credentialType: string): boolean;
	getByName(credentialType: string): ICredentialType;
	getSupportedNodes(type: string): string[];
	getParentTypes(typeName: string): string[];
}

// The way the credentials get saved in the database (data encrypted)
export interface ICredentialData {
	id?: string;
	name: string;
	data: string; // Contains the access data as encrypted JSON string
	nodesAccess: ICredentialNodeAccess[];
}

// The encrypted credentials which the nodes can access
export type CredentialInformation = string | number | boolean | IDataObject | IDataObject[];

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

export type CloseFunction = () => Promise<void>;

export interface IDataObject {
	[key: string]: GenericValue | IDataObject | GenericValue[] | IDataObject[];
}

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
	closeFunction?: CloseFunction;
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
		closeFunctions: CloseFunction[],
		abortSignal?: AbortSignal,
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
		abortSignal?: AbortSignal,
	): IExecuteSingleFunctions;
}

export interface IGetExecuteHookFunctions {
	(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
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
		closeFunctions: CloseFunction[],
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
		sendImmediately?: boolean;
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

export interface PaginationOptions {
	binaryResult?: boolean;
	continue: boolean | string;
	request: IRequestOptionsSimplifiedAuth;
	requestInterval: number;
	maxRequests?: number;
}

export type IN8nHttpResponse = IDataObject | Buffer | GenericValue | GenericValue[] | null;

export interface IN8nHttpFullResponse {
	body: IN8nHttpResponse | Readable;
	__bodyResolved?: boolean;
	headers: IDataObject;
	statusCode: number;
	statusMessage?: string;
}

export interface IN8nRequestOperations {
	pagination?:
		| IN8nRequestOperationPaginationGeneric
		| IN8nRequestOperationPaginationOffset
		| ((
				this: IExecutePaginationFunctions,
				requestOptions: DeclarativeRestApiSettings.ResultOptions,
		  ) => Promise<INodeExecutionData[]>);
}

export interface IN8nRequestOperationPaginationBase {
	type: string;
	properties: {
		[key: string]: unknown;
	};
}

export interface IN8nRequestOperationPaginationGeneric extends IN8nRequestOperationPaginationBase {
	type: 'generic';
	properties: {
		continue: boolean | string;
		request: IRequestOptionsSimplifiedAuth;
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

export interface IGetNodeParameterOptions {
	contextNode?: INode;
	// extract value from regex, works only when parameter type is resourceLocator
	extractValue?: boolean;
	// get raw value of parameter with unresolved expressions
	rawExpressions?: boolean;
}

namespace ExecuteFunctions {
	namespace StringReturning {
		export type NodeParameter =
			| 'binaryProperty'
			| 'binaryPropertyName'
			| 'binaryPropertyOutput'
			| 'dataPropertyName'
			| 'dataBinaryProperty'
			| 'resource'
			| 'operation'
			| 'filePath'
			| 'encodingType';
	}

	namespace NumberReturning {
		export type NodeParameter = 'limit';
	}

	namespace BooleanReturning {
		export type NodeParameter =
			| 'binaryData'
			| 'download'
			| 'jsonParameters'
			| 'returnAll'
			| 'rawData'
			| 'resolveData';
	}

	namespace RecordReturning {
		export type NodeParameter = 'additionalFields' | 'filters' | 'options' | 'updateFields';
	}

	export type GetNodeParameterFn = {
		// @TECH_DEBT: Refactor to remove this barely used overload - N8N-5632
		getNodeParameter<T extends { resource: string }>(
			parameterName: 'resource',
			itemIndex?: number,
		): T['resource'];

		getNodeParameter(
			parameterName: StringReturning.NodeParameter,
			itemIndex: number,
			fallbackValue?: string,
			options?: IGetNodeParameterOptions,
		): string;
		getNodeParameter(
			parameterName: RecordReturning.NodeParameter,
			itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		): IDataObject;
		getNodeParameter(
			parameterName: BooleanReturning.NodeParameter,
			itemIndex: number,
			fallbackValue?: boolean,
			options?: IGetNodeParameterOptions,
		): boolean;
		getNodeParameter(
			parameterName: NumberReturning.NodeParameter,
			itemIndex: number,
			fallbackValue?: number,
			options?: IGetNodeParameterOptions,
		): number;
		getNodeParameter(
			parameterName: string,
			itemIndex: number,
			fallbackValue?: any,
			options?: IGetNodeParameterOptions,
		): NodeParameterValueType | object;
	};
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
		request: (uriOrObject: string | object, options?: object) => Promise<any>;
	};
}

interface BaseHelperFunctions {
	createDeferredPromise: <T = void>() => Promise<IDeferredPromise<T>>;
}

interface JsonHelperFunctions {
	returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
}

export interface FileSystemHelperFunctions {
	createReadStream(path: PathLike): Promise<Readable>;
	getStoragePath(): string;
	writeContentToFile(
		path: PathLike,
		content: string | Buffer | Readable,
		flag?: string,
	): Promise<void>;
}

export interface BinaryHelperFunctions {
	prepareBinaryData(
		binaryData: Buffer | Readable,
		filePath?: string,
		mimeType?: string,
	): Promise<IBinaryData>;
	setBinaryDataBuffer(data: IBinaryData, binaryData: Buffer): Promise<IBinaryData>;
	copyBinaryFile(): Promise<never>;
	binaryToBuffer(body: Buffer | Readable): Promise<Buffer>;
	getBinaryPath(binaryDataId: string): string;
	getBinaryStream(binaryDataId: string, chunkSize?: number): Promise<Readable>;
	getBinaryMetadata(binaryDataId: string): Promise<{
		fileName?: string;
		mimeType?: string;
		fileSize: number;
	}>;
}

export interface NodeHelperFunctions {
	copyBinaryFile(filePath: string, fileName: string, mimeType?: string): Promise<IBinaryData>;
}

export interface RequestHelperFunctions {
	request(uriOrObject: string | IDataObject | any, options?: IDataObject): Promise<any>;
	requestWithAuthentication(
		this: IAllExecuteFunctions,
		credentialsType: string,
		requestOptions: OptionsWithUri | RequestPromiseOptions,
		additionalCredentialOptions?: IAdditionalCredentialOptions,
	): Promise<any>;

	httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
	httpRequestWithAuthentication(
		this: IAllExecuteFunctions,
		credentialsType: string,
		requestOptions: IHttpRequestOptions,
		additionalCredentialOptions?: IAdditionalCredentialOptions,
	): Promise<any>;
	requestWithAuthenticationPaginated(
		this: IAllExecuteFunctions,
		requestOptions: OptionsWithUri,
		itemIndex: number,
		paginationOptions: PaginationOptions,
		credentialsType?: string,
		additionalCredentialOptions?: IAdditionalCredentialOptions,
	): Promise<any[]>;

	requestOAuth1(
		this: IAllExecuteFunctions,
		credentialsType: string,
		requestOptions: OptionsWithUrl | RequestPromiseOptions,
	): Promise<any>;
	requestOAuth2(
		this: IAllExecuteFunctions,
		credentialsType: string,
		requestOptions: OptionsWithUri | RequestPromiseOptions,
		oAuth2Options?: IOAuth2Options,
	): Promise<any>;
}

export interface FunctionsBase {
	logger: Logger;
	getCredentials(type: string, itemIndex?: number): Promise<ICredentialDataDecryptedObject>;
	getExecutionId(): string;
	getNode(): INode;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowStaticData(type: string): IDataObject;
	getTimezone(): string;
	getRestApiUrl(): string;
	getInstanceBaseUrl(): string;
	getInstanceId(): string;

	getMode?: () => WorkflowExecuteMode;
	getActivationMode?: () => WorkflowActivateMode;

	/** @deprecated */
	prepareOutputData(outputData: INodeExecutionData[]): Promise<INodeExecutionData[][]>;
}

type FunctionsBaseWithRequiredKeys<Keys extends keyof FunctionsBase> = FunctionsBase & {
	[K in Keys]: NonNullable<FunctionsBase[K]>;
};

export type ContextType = 'flow' | 'node';

type BaseExecutionFunctions = FunctionsBaseWithRequiredKeys<'getMode'> & {
	continueOnFail(): boolean;
	evaluateExpression(expression: string, itemIndex: number): NodeParameterValueType;
	getContext(type: ContextType): IContextObject;
	getExecuteData(): IExecuteData;
	getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData;
	getInputSourceData(inputIndex?: number, inputName?: string): ISourceData;
	getExecutionCancelSignal(): AbortSignal | undefined;
	onExecutionCancellation(handler: () => unknown): void;
};

// TODO: Create later own type only for Config-Nodes
export type IExecuteFunctions = ExecuteFunctions.GetNodeParameterFn &
	BaseExecutionFunctions & {
		executeWorkflow(
			workflowInfo: IExecuteWorkflowInfo,
			inputData?: INodeExecutionData[],
		): Promise<any>;
		getInputConnectionData(
			inputName: ConnectionTypes,
			itemIndex: number,
			inputIndex?: number,
		): Promise<unknown>;
		getInputData(inputIndex?: number, inputName?: string): INodeExecutionData[];
		getNodeOutputs(): INodeOutputConfiguration[];
		putExecutionToWait(waitTill: Date): Promise<void>;
		sendMessageToUI(message: any): void;
		sendResponse(response: IExecuteResponsePromiseData): void;

		// TODO: Make this one then only available in the new config one
		addInputData(
			connectionType: ConnectionTypes,
			data: INodeExecutionData[][] | ExecutionError,
			runIndex?: number,
		): { index: number };
		addOutputData(
			connectionType: ConnectionTypes,
			currentNodeRunIndex: number,
			data: INodeExecutionData[][] | ExecutionError,
		): void;

		nodeHelpers: NodeHelperFunctions;
		helpers: RequestHelperFunctions &
			BaseHelperFunctions &
			BinaryHelperFunctions &
			FileSystemHelperFunctions &
			JsonHelperFunctions & {
				normalizeItems(items: INodeExecutionData | INodeExecutionData[]): INodeExecutionData[];
				constructExecutionMetaData(
					inputData: INodeExecutionData[],
					options: { itemData: IPairedItemData | IPairedItemData[] },
				): NodeExecutionWithMetadata[];
				assertBinaryData(itemIndex: number, propertyName: string): IBinaryData;
				getBinaryDataBuffer(itemIndex: number, propertyName: string): Promise<Buffer>;
				copyInputItems(items: INodeExecutionData[], properties: string[]): IDataObject[];
			};
	};

export interface IExecuteSingleFunctions extends BaseExecutionFunctions {
	getInputData(inputIndex?: number, inputName?: string): INodeExecutionData;
	getItemIndex(): number;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object;

	helpers: RequestHelperFunctions &
		BaseHelperFunctions &
		BinaryHelperFunctions & {
			assertBinaryData(propertyName: string, inputIndex?: number): IBinaryData;
			getBinaryDataBuffer(propertyName: string, inputIndex?: number): Promise<Buffer>;
		};
}

export interface IExecutePaginationFunctions extends IExecuteSingleFunctions {
	makeRoutingRequest(
		this: IAllExecuteFunctions,
		requestOptions: DeclarativeRestApiSettings.ResultOptions,
	): Promise<INodeExecutionData[]>;
}

export interface ILoadOptionsFunctions extends FunctionsBase {
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object;
	getCurrentNodeParameter(
		parameterName: string,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object | undefined;
	getCurrentNodeParameters(): INodeParameters | undefined;
	helpers: RequestHelperFunctions;
}

export interface IPollFunctions
	extends FunctionsBaseWithRequiredKeys<'getMode' | 'getActivationMode'> {
	__emit(
		data: INodeExecutionData[][],
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
		donePromise?: IDeferredPromise<IRun>,
	): void;
	__emitError(error: Error, responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>): void;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object;
	helpers: RequestHelperFunctions &
		BaseHelperFunctions &
		BinaryHelperFunctions &
		JsonHelperFunctions;
}

export interface ITriggerFunctions
	extends FunctionsBaseWithRequiredKeys<'getMode' | 'getActivationMode'> {
	emit(
		data: INodeExecutionData[][],
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
		donePromise?: IDeferredPromise<IRun>,
	): void;
	emitError(error: Error, responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>): void;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object;
	helpers: RequestHelperFunctions &
		BaseHelperFunctions &
		BinaryHelperFunctions &
		JsonHelperFunctions;
}

export interface IHookFunctions
	extends FunctionsBaseWithRequiredKeys<'getMode' | 'getActivationMode'> {
	getWebhookName(): string;
	getWebhookDescription(name: string): IWebhookDescription | undefined;
	getNodeWebhookUrl: (name: string) => string | undefined;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object;
	helpers: RequestHelperFunctions;
}

export interface IWebhookFunctions extends FunctionsBaseWithRequiredKeys<'getMode'> {
	getBodyData(): IDataObject;
	getHeaderData(): IncomingHttpHeaders;
	getInputConnectionData(
		inputName: ConnectionTypes,
		itemIndex: number,
		inputIndex?: number,
	): Promise<unknown>;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object;
	getNodeWebhookUrl: (name: string) => string | undefined;
	getParamsData(): object;
	getQueryData(): object;
	getRequestObject(): express.Request;
	getResponseObject(): express.Response;
	getWebhookName(): string;
	nodeHelpers: NodeHelperFunctions;
	helpers: RequestHelperFunctions &
		BaseHelperFunctions &
		BinaryHelperFunctions &
		JsonHelperFunctions;
}

export interface INodeCredentialsDetails {
	id: string | null;
	name: string;
}

export interface INodeCredentials {
	[key: string]: INodeCredentialsDetails;
}

export type OnError = 'continueErrorOutput' | 'continueRegularOutput' | 'stopWorkflow';
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
	onError?: OnError;
	continueOnFail?: boolean;
	parameters: INodeParameters;
	credentials?: INodeCredentials;
	webhookId?: string;
	extendsCredential?: string;
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
	sourceOverwrite?: ISourceData;
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

export type NodeParameterValue = string | number | boolean | undefined | null;

export type ResourceLocatorModes = 'id' | 'url' | 'list' | string;
export interface IResourceLocatorResult {
	name: string;
	value: string;
	url?: string;
}

export interface INodeParameterResourceLocator {
	__rl: true;
	mode: ResourceLocatorModes;
	value: NodeParameterValue;
	cachedResultName?: string;
	cachedResultUrl?: string;
	__regex?: string;
}

export type NodeParameterValueType =
	// TODO: Later also has to be possible to add multiple ones with the name name. So array has to be possible
	| NodeParameterValue
	| INodeParameters
	| INodeParameterResourceLocator
	| NodeParameterValue[]
	| INodeParameters[]
	| INodeParameterResourceLocator[]
	| ResourceMapperValue[];

export interface INodeParameters {
	[key: string]: NodeParameterValueType;
}

export type NodePropertyTypes =
	| 'boolean'
	| 'button'
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
	| 'credentialsSelect'
	| 'resourceLocator'
	| 'curlImport'
	| 'resourceMapper'
	| 'filter'
	| 'credentials';

export type CodeAutocompleteTypes = 'function' | 'functionItem';

export type EditorType = 'codeNodeEditor' | 'jsEditor' | 'htmlEditor' | 'sqlEditor';
export type CodeNodeEditorLanguage = (typeof CODE_LANGUAGES)[number];
export type CodeExecutionMode = (typeof CODE_EXECUTION_MODES)[number];
export type SQLDialect =
	| 'StandardSQL'
	| 'PostgreSQL'
	| 'MySQL'
	| 'MariaSQL'
	| 'MSSQL'
	| 'SQLite'
	| 'Cassandra'
	| 'PLSQL';

export interface ILoadOptions {
	routing?: {
		operations?: IN8nRequestOperations;
		output?: INodeRequestOutput;
		request?: DeclarativeRestApiSettings.HttpRequestOptions;
	};
}

export interface INodePropertyTypeOptions {
	action?: string; // Supported by: button
	containerClass?: string; // Supported by: notice
	alwaysOpenEditWindow?: boolean; // Supported by: json
	codeAutocomplete?: CodeAutocompleteTypes; // Supported by: string
	editor?: EditorType; // Supported by: string
	sqlDialect?: SQLDialect; // Supported by: sqlEditor
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
	resourceMapper?: ResourceMapperTypeOptions;
	filter?: FilterTypeOptions;
	[key: string]: any;
}

export interface ResourceMapperTypeOptions {
	resourceMapperMethod: string;
	mode: 'add' | 'update' | 'upsert';
	valuesLabel?: string;
	fieldWords?: { singular: string; plural: string };
	addAllFields?: boolean;
	noFieldsError?: string;
	multiKeyMatch?: boolean;
	supportAutoMap?: boolean;
	matchingFieldsLabels?: {
		title?: string;
		description?: string;
		hint?: string;
	};
}

type NonEmptyArray<T> = [T, ...T[]];

export type FilterTypeCombinator = 'and' | 'or';

export type FilterTypeOptions = Partial<{
	caseSensitive: boolean | string; // default = true
	leftValue: string; // when set, user can't edit left side of condition
	allowedCombinators: NonEmptyArray<FilterTypeCombinator>; // default = ['and', 'or']
	maxConditions: number; // default = 10
	typeValidation: 'strict' | 'loose' | {}; // default = strict, `| {}` is a TypeScript trick to allow custom strings, but still give autocomplete
}>;

export interface IDisplayOptions {
	hide?: {
		[key: string]: NodeParameterValue[] | undefined;
	};
	show?: {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'@version'?: number[];
		[key: string]: NodeParameterValue[] | undefined;
	};

	hideOnCloud?: boolean;
}

export interface INodeProperties {
	displayName: string;
	name: string;
	type: NodePropertyTypes;
	typeOptions?: INodePropertyTypeOptions;
	default: NodeParameterValueType;
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
	extractValue?: INodePropertyValueExtractor;
	modes?: INodePropertyMode[];
	requiresDataPath?: 'single' | 'multiple';
	doNotInherit?: boolean;
	// set expected type for the value which would be used for validation and type casting
	validateType?: FieldType;
	// works only if validateType is set
	// allows to skip validation during execution or set custom validation/casting logic inside node
	// inline error messages would still be shown in UI
	ignoreValidationDuringExecution?: boolean;
}

export interface INodePropertyModeTypeOptions {
	searchListMethod?: string; // Supported by: options
	searchFilterRequired?: boolean;
	searchable?: boolean;
}

export interface INodePropertyMode {
	displayName: string;
	name: string;
	type: 'string' | 'list';
	hint?: string;
	validation?: Array<
		INodePropertyModeValidation | { (this: IExecuteSingleFunctions, value: string): void }
	>;
	placeholder?: string;
	url?: string;
	extractValue?: INodePropertyValueExtractor;
	initType?: string;
	entryTypes?: {
		[name: string]: {
			selectable?: boolean;
			hidden?: boolean;
			queryable?: boolean;
			data?: {
				request?: IHttpRequestOptions;
				output?: INodeRequestOutput;
			};
		};
	};
	search?: INodePropertyRouting;
	typeOptions?: INodePropertyModeTypeOptions;
}

export interface INodePropertyModeValidation {
	type: string;
	properties: {};
}

export interface INodePropertyRegexValidation extends INodePropertyModeValidation {
	type: 'regex';
	properties: {
		regex: string;
		errorMessage: string;
	};
}

export interface INodePropertyOptions {
	name: string;
	value: string | number | boolean;
	action?: string;
	description?: string;
	routing?: INodePropertyRouting;
}

export interface INodeListSearchItems extends INodePropertyOptions {
	icon?: string;
	url?: string;
}

export interface INodeListSearchResult {
	results: INodeListSearchItems[];
	paginationToken?: unknown;
}

export interface INodePropertyCollection {
	displayName: string;
	name: string;
	values: INodeProperties[];
}

export interface INodePropertyValueExtractorBase {
	type: string;
}

export interface INodePropertyValueExtractorRegex extends INodePropertyValueExtractorBase {
	type: 'regex';
	regex: string | RegExp;
}

export interface INodePropertyValueExtractorFunction {
	(
		this: IExecuteSingleFunctions,
		value: string | NodeParameterValue,
	): Promise<string | NodeParameterValue> | (string | NodeParameterValue);
}
export type INodePropertyValueExtractor = INodePropertyValueExtractorRegex;

export interface IParameterDependencies {
	[key: string]: string[];
}

export type IParameterLabel = {
	size?: 'small' | 'medium';
};

export interface IPollResponse {
	closeFunction?: CloseFunction;
}

export interface ITriggerResponse {
	closeFunction?: CloseFunction;
	// To manually trigger the run
	manualTriggerFunction?: CloseFunction;
	// Gets added automatically at manual workflow runs resolves with
	// the first emitted data
	manualTriggerResponse?: Promise<INodeExecutionData[][]>;
}

export type WebhookSetupMethodNames = 'checkExists' | 'create' | 'delete';

export namespace MultiPartFormData {
	export interface File {
		filepath: string;
		mimetype?: string;
		originalFilename?: string;
		newFilename: string;
	}

	export type Request = express.Request<
		{},
		{},
		{
			data: Record<string, string | string[]>;
			files: Record<string, File | File[]>;
		}
	>;
}

export interface SupplyData {
	metadata?: IDataObject;
	response: unknown;
	closeFunction?: CloseFunction;
}

export interface INodeType {
	description: INodeTypeDescription;
	supplyData?(this: IAllExecuteFunctions, itemIndex: number): Promise<SupplyData>;
	execute?(
		this: IExecuteFunctions,
	): Promise<INodeExecutionData[][] | NodeExecutionWithMetadata[][] | null>;
	poll?(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
	trigger?(this: ITriggerFunctions): Promise<ITriggerResponse | undefined>;
	webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>;
	methods?: {
		loadOptions?: {
			[key: string]: (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;
		};
		listSearch?: {
			[key: string]: (
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			) => Promise<INodeListSearchResult>;
		};
		credentialTest?: {
			// Contains a group of functions that test credentials.
			[functionName: string]: ICredentialTestFunction;
		};
		resourceMapping?: {
			[functionName: string]: (this: ILoadOptionsFunctions) => Promise<ResourceMapperFields>;
		};
	};
	webhookMethods?: {
		[name in IWebhookDescription['name']]?: {
			[method in WebhookSetupMethodNames]: (this: IHookFunctions) => Promise<boolean>;
		};
	};
}

/**
 * This class serves as the base for all nodes using the new context API
 * having this as a class enables us to identify these instances at runtime
 */
export abstract class Node {
	abstract description: INodeTypeDescription;
	execute?(context: IExecuteFunctions): Promise<INodeExecutionData[][]>;
	webhook?(context: IWebhookFunctions): Promise<IWebhookResponseData>;
}

export interface IVersionedNodeType {
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
	credentials: ICredentialsDecrypted;
}

export interface INodeCredentialDescription {
	name: string;
	required?: boolean;
	displayOptions?: IDisplayOptions;
	testedBy?: ICredentialTestRequest | string; // Name of a function inside `loadOptions.credentialTest`
}

export type INodeIssueTypes = 'credentials' | 'execution' | 'input' | 'parameters' | 'typeUnknown';

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
	input?: INodeIssueObjectProperty;
	parameters?: INodeIssueObjectProperty;
	typeUnknown?: boolean;
	[key: string]: undefined | boolean | INodeIssueObjectProperty;
}

export interface IWorkflowIssues {
	[key: string]: INodeIssues;
}

export interface INodeTypeBaseDescription {
	displayName: string;
	name: string;
	icon?: string;
	iconUrl?: string;
	badgeIconUrl?: string;
	group: string[];
	description: string;
	documentationUrl?: string;
	subtitle?: string;
	defaultVersion?: number;
	codex?: CodexData;
	parameterPane?: 'wide';

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
	| IPostReceiveFilter
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
		[key: string]: string | number | boolean | IDataObject;
	};
	errorMessage?: string;
}

export interface IPostReceiveBinaryData extends IPostReceiveBase {
	type: 'binaryData';
	properties: {
		destinationProperty: string;
	};
}

export interface IPostReceiveFilter extends IPostReceiveBase {
	type: 'filter';
	properties: {
		pass: boolean | string;
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

export type ConnectionTypes =
	| 'ai_agent'
	| 'ai_chain'
	| 'ai_document'
	| 'ai_embedding'
	| 'ai_languageModel'
	| 'ai_memory'
	| 'ai_outputParser'
	| 'ai_retriever'
	| 'ai_textSplitter'
	| 'ai_tool'
	| 'ai_vectorRetriever'
	| 'ai_vectorStore'
	| 'main';

export const enum NodeConnectionType {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiAgent = 'ai_agent',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiChain = 'ai_chain',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiDocument = 'ai_document',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiEmbedding = 'ai_embedding',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiLanguageModel = 'ai_languageModel',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiMemory = 'ai_memory',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiOutputParser = 'ai_outputParser',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiRetriever = 'ai_retriever',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiTextSplitter = 'ai_textSplitter',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiTool = 'ai_tool',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiVectorStore = 'ai_vectorStore',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Main = 'main',
}

export interface INodeInputFilter {
	// TODO: Later add more filter options like categories, subcatogries,
	//       regex, allow to exclude certain nodes, ... ?
	//       Potentially change totally after alpha/beta. Is not a breaking change after all.
	nodes: string[]; // Allowed nodes
}

export interface INodeInputConfiguration {
	displayName?: string;
	maxConnections?: number;
	required?: boolean;
	filter?: INodeInputFilter;
	type: ConnectionTypes;
}

export interface INodeOutputConfiguration {
	category?: string;
	displayName?: string;
	required?: boolean;
	type: ConnectionTypes;
}

export interface INodeTypeDescription extends INodeTypeBaseDescription {
	version: number | number[];
	defaults: INodeParameters;
	eventTriggerDescription?: string;
	activationMessage?: string;
	inputs: Array<ConnectionTypes | INodeInputConfiguration> | string;
	requiredInputs?: string | number[] | number; // Ony available with executionOrder => "v1"
	inputNames?: string[];
	outputs: Array<ConnectionTypes | INodeInputConfiguration> | string;
	outputNames?: string[];
	properties: INodeProperties[];
	credentials?: INodeCredentialDescription[];
	maxNodes?: number; // How many nodes of that type can be created in a workflow
	polling?: true | undefined;
	supportsCORS?: true | undefined;
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
	triggerPanel?:
		| {
				hideContent?: boolean | string;
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
		  }
		| boolean;
	extendsCredential?: string;
	__loadOptionsMethods?: string[]; // only for validation during build
}

export interface INodeHookDescription {
	method: string;
}

export interface IWebhookData {
	httpMethod: IHttpRequestMethods;
	node: string;
	path: string;
	webhookDescription: IWebhookDescription;
	workflowId: string;
	workflowExecuteAdditionalData: IWorkflowExecuteAdditionalData;
	webhookId?: string;
	isTest?: boolean;
	userId?: string;
	staticData?: Workflow['staticData'];
}

export interface IWebhookDescription {
	[key: string]: IHttpRequestMethods | WebhookResponseMode | boolean | string | undefined;
	httpMethod: IHttpRequestMethods | string;
	isFullPath?: boolean;
	name: 'default' | 'setup';
	path: string;
	responseBinaryPropertyName?: string;
	responseContentType?: string;
	responsePropertyName?: string;
	responseMode?: WebhookResponseMode | string;
	responseData?: WebhookResponseData | string;
	restartWebhook?: boolean;
	isForm?: boolean;
	hasLifecycleMethods?: boolean; // set automatically by generate-ui-types
	ndvHideUrl?: string | boolean; // If true the webhook will not be displayed in the editor
	ndvHideMethod?: string | boolean; // If true the method will not be displayed in the editor
}

export interface ProxyInput {
	all: () => INodeExecutionData[];
	context: any;
	first: () => INodeExecutionData | undefined;
	item: INodeExecutionData | undefined;
	last: () => INodeExecutionData | undefined;
	params?: INodeParameters;
}

export interface IWorkflowDataProxyData {
	[key: string]: any;
	$binary: INodeExecutionData['binary'];
	$data: any;
	$env: any;
	$evaluateExpression: (expression: string, itemIndex?: number) => NodeParameterValueType;
	$item: (itemIndex: number, runIndex?: number) => IWorkflowDataProxyData;
	$items: (nodeName?: string, outputIndex?: number, runIndex?: number) => INodeExecutionData[];
	$json: INodeExecutionData['json'];
	$node: any;
	$parameter: INodeParameters;
	$position: number;
	$workflow: any;
	$: any;
	$input: ProxyInput;
	$thisItem: any;
	$thisRunIndex: number;
	$thisItemIndex: number;
	$now: any;
	$today: any;
	$getPairedItem: (
		destinationNodeName: string,
		incomingSourceData: ISourceData | null,
		pairedItem: IPairedItemData,
	) => INodeExecutionData | null;
	constructor: any;
}

export type IWorkflowDataProxyAdditionalKeys = IDataObject;

export interface IWorkflowMetadata {
	id?: string;
	name?: string;
	active: boolean;
}

export interface IWebhookResponseData {
	workflowData?: INodeExecutionData[][];
	webhookResponse?: any;
	noWebhookResponse?: boolean;
}

export type WebhookResponseData = 'allEntries' | 'firstEntryJson' | 'firstEntryBinary' | 'noData';
export type WebhookResponseMode = 'onReceived' | 'lastNode';

export interface INodeTypes {
	getByName(nodeType: string): INodeType | IVersionedNodeType;
	getByNameAndVersion(nodeType: string, version?: number): INodeType;
}

export type LoadingDetails = {
	className: string;
	sourcePath: string;
};

export type CredentialLoadingDetails = LoadingDetails & {
	supportedNodes?: string[];
	extends?: string[];
};

export type NodeLoadingDetails = LoadingDetails;

export type KnownNodesAndCredentials = {
	nodes: Record<string, NodeLoadingDetails>;
	credentials: Record<string, CredentialLoadingDetails>;
};

export interface LoadedClass<T> {
	sourcePath: string;
	type: T;
}

type LoadedData<T> = Record<string, LoadedClass<T>>;
export type ICredentialTypeData = LoadedData<ICredentialType>;
export type INodeTypeData = LoadedData<INodeType | IVersionedNodeType>;

export interface IRun {
	data: IRunExecutionData;
	finished?: boolean;
	mode: WorkflowExecuteMode;
	waitTill?: Date | null;
	startedAt: Date;
	stoppedAt?: Date;
	status: ExecutionStatus;
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
		metadata?: Record<string, string>;
	};
	executionData?: {
		contextData: IExecuteContextData;
		nodeExecutionStack: IExecuteData[];
		metadata: {
			// node-name: metadata by runIndex
			[key: string]: ITaskMetadata[];
		};
		waitingExecution: IWaitingForExecution;
		waitingExecutionSource: IWaitingForExecutionSource | null;
	};
	waitTill?: Date;
}

export interface IRunData {
	// node-name: result-data
	[key: string]: ITaskData[];
}

export interface ITaskSubRunMetadata {
	node: string;
	runIndex: number;
}

export interface ITaskMetadata {
	subRun?: ITaskSubRunMetadata[];
}

// The data that gets returned when a node runs
export interface ITaskData {
	startTime: number;
	executionTime: number;
	executionStatus?: ExecutionStatus;
	data?: ITaskDataConnections;
	inputOverride?: ITaskDataConnections;
	error?: ExecutionError;
	source: Array<ISourceData | null>; // Is an array as nodes have multiple inputs
	metadata?: ITaskMetadata;
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
	id?: string;
	name: string;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	staticData?: IDataObject;
	pinData?: IPinData;
	versionId?: string;
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
	executeWorkflow: (
		workflowInfo: IExecuteWorkflowInfo,
		additionalData: IWorkflowExecuteAdditionalData,
		options: {
			node?: INode;
			parentWorkflowId?: string;
			inputData?: INodeExecutionData[];
			parentExecutionId?: string;
			loadedWorkflowData?: IWorkflowBase;
			loadedRunData?: any;
			parentWorkflowSettings?: IWorkflowSettings;
		},
	) => Promise<any>;
	executionId?: string;
	restartExecutionId?: string;
	hooks?: WorkflowHooks;
	httpResponse?: express.Response;
	httpRequest?: express.Request;
	restApiUrl: string;
	instanceBaseUrl: string;
	setExecutionStatus?: (status: ExecutionStatus) => void;
	sendDataToUI?: (type: string, data: IDataObject | IDataObject[]) => void;
	formWaitingBaseUrl: string;
	webhookBaseUrl: string;
	webhookWaitingBaseUrl: string;
	webhookTestBaseUrl: string;
	currentNodeParameters?: INodeParameters;
	executionTimeoutTimestamp?: number;
	userId: string;
	variables: IDataObject;
	secretsHelpers: SecretsHelpersBase;
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

export type WorkflowActivateMode =
	| 'init'
	| 'create'
	| 'update'
	| 'activate'
	| 'manual'
	| 'leadershipChange';

export interface IWorkflowHooksOptionalParameters {
	parentProcessMode?: string;
	retryOf?: string;
	sessionId?: string;
}

export namespace WorkflowSettings {
	export type CallerPolicy = 'any' | 'none' | 'workflowsFromAList' | 'workflowsFromSameOwner';
	export type SaveDataExecution = 'DEFAULT' | 'all' | 'none';
}

export interface IWorkflowSettings {
	timezone?: 'DEFAULT' | string;
	errorWorkflow?: string;
	callerIds?: string;
	callerPolicy?: WorkflowSettings.CallerPolicy;
	saveDataErrorExecution?: WorkflowSettings.SaveDataExecution;
	saveDataSuccessExecution?: WorkflowSettings.SaveDataExecution;
	saveManualExecutions?: 'DEFAULT' | boolean;
	saveExecutionProgress?: 'DEFAULT' | boolean;
	executionTimeout?: number;
	executionOrder?: 'v0' | 'v1';
}

export interface WorkflowFEMeta {
	onboardingId?: string;
}

export interface WorkflowTestData {
	description: string;
	input: {
		workflowData: {
			nodes: INode[];
			connections: IConnections;
			settings?: IWorkflowSettings;
		};
	};
	output: {
		nodeExecutionOrder?: string[];
		nodeData: {
			[key: string]: any[][];
		};
	};
	trigger?: {
		mode: WorkflowExecuteMode;
		input: INodeExecutionData;
	};
}

export type LogLevel = (typeof LOG_LEVELS)[number];
export type Logger = Record<Exclude<LogLevel, 'silent'>, (message: string, meta?: object) => void>;

export interface IStatusCodeMessages {
	[key: string]: string;
}

export type DocumentationLink = {
	url: string;
};

export type CodexData = {
	categories?: string[];
	subcategories?: { [category: string]: string[] };
	resources?: {
		credentialDocumentation?: DocumentationLink[];
		primaryDocumentation?: DocumentationLink[];
	};
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
	version?: number;
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

export interface FeatureFlags {
	[featureFlag: string]: string | boolean | undefined;
}

export interface IConnectedNode {
	name: string;
	indicies: number[];
	depth: number;
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

export interface IExecutionsSummary {
	id: string;
	finished?: boolean;
	mode: WorkflowExecuteMode;
	retryOf?: string | null;
	retrySuccessId?: string | null;
	waitTill?: Date;
	startedAt: Date;
	stoppedAt?: Date;
	workflowId: string;
	workflowName?: string;
	status?: ExecutionStatus;
	lastNodeExecuted?: string;
	executionError?: ExecutionError;
	nodeExecutionStatus?: {
		[key: string]: IExecutionSummaryNodeExecutionResult;
	};
}

export interface IExecutionSummaryNodeExecutionResult {
	executionStatus: ExecutionStatus;
	errors?: Array<{
		name?: string;
		message?: string;
		description?: string;
	}>;
}

export interface ResourceMapperFields {
	fields: ResourceMapperField[];
}

export interface ResourceMapperField {
	id: string;
	displayName: string;
	defaultMatch: boolean;
	canBeUsedToMatch?: boolean;
	required: boolean;
	display: boolean;
	type?: FieldType;
	removed?: boolean;
	options?: INodePropertyOptions[];
	readOnly?: boolean;
}

export type FieldType =
	| 'string'
	| 'number'
	| 'dateTime'
	| 'boolean'
	| 'time'
	| 'array'
	| 'object'
	| 'options'
	| 'url';

export type ValidationResult = {
	valid: boolean;
	errorMessage?: string;
	newValue?: string | number | boolean | object | null | undefined;
};

export type ResourceMapperValue = {
	mappingMode: string;
	value: { [key: string]: string | number | boolean | null } | null;
	matchingColumns: string[];
	schema: ResourceMapperField[];
};

export type FilterOperatorType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'array'
	| 'object'
	| 'dateTime'
	| 'any';

export interface FilterOperatorValue {
	type: FilterOperatorType;
	operation: string;
	rightType?: FilterOperatorType;
	singleValue?: boolean; // default = false
}

export type FilterConditionValue = {
	id: string;
	leftValue: unknown;
	operator: FilterOperatorValue;
	rightValue: unknown;
};

export type FilterOptionsValue = {
	caseSensitive: boolean;
	leftValue: string;
	typeValidation: 'strict' | 'loose';
};

export type FilterValue = {
	options: FilterOptionsValue;
	conditions: FilterConditionValue[];
	combinator: FilterTypeCombinator;
};

export interface ExecutionOptions {
	limit?: number;
}

export interface ExecutionFilters {
	finished?: boolean;
	mode?: WorkflowExecuteMode[];
	retryOf?: string;
	retrySuccessId?: string;
	status?: ExecutionStatus[];
	waitTill?: boolean;
	workflowId?: number | string;
}

export interface IVersionNotificationSettings {
	enabled: boolean;
	endpoint: string;
	infoUrl: string;
}

export interface IUserManagementSettings {
	quota: number;
	showSetupOnFirstLoad?: boolean;
	smtpSetup: boolean;
	authenticationMethod: AuthenticationMethod;
}

export interface IUserSettings {
	isOnboarded?: boolean;
	firstSuccessfulWorkflowId?: string;
	userActivated?: boolean;
	allowSSOManualLogin?: boolean;
}

export interface IPublicApiSettings {
	enabled: boolean;
	latestVersion: number;
	path: string;
	swaggerUi: {
		enabled: boolean;
	};
}

export type ExpressionEvaluatorType = 'tmpl' | 'tournament';

export interface IN8nUISettings {
	endpointForm: string;
	endpointFormTest: string;
	endpointFormWaiting: string;
	endpointWebhook: string;
	endpointWebhookTest: string;
	saveDataErrorExecution: WorkflowSettings.SaveDataExecution;
	saveDataSuccessExecution: WorkflowSettings.SaveDataExecution;
	saveManualExecutions: boolean;
	executionTimeout: number;
	maxExecutionTimeout: number;
	workflowCallerPolicyDefaultOption: WorkflowSettings.CallerPolicy;
	oauthCallbackUrls: {
		oauth1: string;
		oauth2: string;
	};
	timezone: string;
	urlBaseWebhook: string;
	urlBaseEditor: string;
	versionCli: string;
	releaseChannel: 'stable' | 'beta' | 'nightly' | 'dev';
	n8nMetadata?: {
		userId?: string;
		[key: string]: string | number | undefined;
	};
	versionNotifications: IVersionNotificationSettings;
	instanceId: string;
	telemetry: ITelemetrySettings;
	posthog: {
		enabled: boolean;
		apiHost: string;
		apiKey: string;
		autocapture: boolean;
		disableSessionRecording: boolean;
		debug: boolean;
	};
	personalizationSurveyEnabled: boolean;
	defaultLocale: string;
	userManagement: IUserManagementSettings;
	sso: {
		saml: {
			loginLabel: string;
			loginEnabled: boolean;
		};
		ldap: {
			loginLabel: string;
			loginEnabled: boolean;
		};
	};
	publicApi: IPublicApiSettings;
	workflowTagsDisabled: boolean;
	logLevel: LogLevel;
	hiringBannerEnabled: boolean;
	templates: {
		enabled: boolean;
		host: string;
	};
	onboardingCallPromptEnabled: boolean;
	missingPackages?: boolean;
	executionMode: 'regular' | 'queue';
	pushBackend: 'sse' | 'websocket';
	communityNodesEnabled: boolean;
	deployment: {
		type: string | 'default' | 'n8n-internal' | 'cloud' | 'desktop_mac' | 'desktop_win';
	};
	isNpmAvailable: boolean;
	allowedModules: {
		builtIn?: string[];
		external?: string[];
	};
	enterprise: {
		sharing: boolean;
		ldap: boolean;
		saml: boolean;
		logStreaming: boolean;
		advancedExecutionFilters: boolean;
		variables: boolean;
		sourceControl: boolean;
		auditLogs: boolean;
		externalSecrets: boolean;
		showNonProdBanner: boolean;
		debugInEditor: boolean;
		binaryDataS3: boolean;
		workflowHistory: boolean;
		workerView: boolean;
		advancedPermissions: boolean;
	};
	hideUsagePage: boolean;
	license: {
		environment: 'development' | 'production' | 'staging';
	};
	variables: {
		limit: number;
	};
	expressions: {
		evaluator: ExpressionEvaluatorType;
	};
	mfa: {
		enabled: boolean;
	};
	banners: {
		dismissed: string[];
	};
	ai: {
		enabled: boolean;
	};
	workflowHistory: {
		pruneTime: number;
		licensePruneTime: number;
	};
}

export interface SecretsHelpersBase {
	update(): Promise<void>;
	waitForInit(): Promise<void>;

	getSecret(provider: string, name: string): IDataObject | undefined;
	hasSecret(provider: string, name: string): boolean;
	hasProvider(provider: string): boolean;
	listProviders(): string[];
	listSecrets(provider: string): string[];
}

export type BannerName =
	| 'V1'
	| 'TRIAL_OVER'
	| 'TRIAL'
	| 'NON_PRODUCTION_LICENSE'
	| 'EMAIL_CONFIRMATION';

export type Functionality = 'regular' | 'configuration-node';
