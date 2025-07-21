/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CallbackManager as CallbackManagerLC } from '@langchain/core/callbacks/manager';
import type { LogScope } from '@n8n/config';
import type { AxiosProxyConfig, GenericAbortSignal } from 'axios';
import type * as express from 'express';
import type FormData from 'form-data';
import type { PathLike } from 'fs';
import type { IncomingHttpHeaders } from 'http';
import type { ReplyHeaders, RequestBodyMatcher, RequestHeaderMatcher } from 'nock';
import type { Client as SSHClient } from 'ssh2';
import type { Readable } from 'stream';
import type { SecureContextOptions } from 'tls';
import type { URLSearchParams } from 'url';

import type { CODE_EXECUTION_MODES, CODE_LANGUAGES, LOG_LEVELS } from './constants';
import type { IDeferredPromise } from './deferred-promise';
import type { ExecutionCancelledError } from './errors';
import type { ExpressionError } from './errors/expression.error';
import type { NodeApiError } from './errors/node-api.error';
import type { NodeOperationError } from './errors/node-operation.error';
import type { WorkflowActivationError } from './errors/workflow-activation.error';
import type { WorkflowOperationError } from './errors/workflow-operation.error';
import type { ExecutionStatus } from './execution-status';
import type { Result } from './result';
import type { Workflow } from './workflow';
import type { EnvProviderState } from './workflow-data-proxy-env-provider';

export interface IAdditionalCredentialOptions {
	oauth2?: IOAuth2Options;
	credentialsDecrypted?: ICredentialsDecrypted;
}

export type IAllExecuteFunctions =
	| IExecuteFunctions
	| IExecutePaginationFunctions
	| IExecuteSingleFunctions
	| ISupplyDataFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IPollFunctions
	| ITriggerFunctions
	| IWebhookFunctions;

export type BinaryFileType = 'text' | 'json' | 'image' | 'audio' | 'video' | 'pdf' | 'html';
export interface IBinaryData {
	[key: string]: string | number | undefined;
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
	type: NodeConnectionType;

	// The output/input-index of destination node (if node has multiple inputs/outputs of the same type)
	index: number;
}

export type ExecutionError =
	| ExpressionError
	| WorkflowActivationError
	| WorkflowOperationError
	| ExecutionCancelledError
	| NodeOperationError
	| NodeApiError;

// Get used to gives nodes access to credentials
export interface IGetCredentials {
	get(type: string, id: string | null): Promise<ICredentialsEncrypted>;
}

export abstract class ICredentials<T extends object = ICredentialDataDecryptedObject> {
	id?: string;

	name: string;

	type: string;

	data: string | undefined;

	constructor(nodeCredentials: INodeCredentialsDetails, type: string, data?: string) {
		this.id = nodeCredentials.id ?? undefined;
		this.name = nodeCredentials.name;
		this.type = type;
		this.data = data;
	}

	abstract getData(nodeType?: string): T;

	abstract getDataToSave(): ICredentialsEncrypted;

	abstract setData(data: T): void;
}

export interface IUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
}

export type ProjectSharingData = {
	id: string;
	name: string | null;
	icon: { type: 'emoji' | 'icon'; value: string } | null;
	type: 'personal' | 'team' | 'public';
	createdAt: string;
	updatedAt: string;
};

export interface ICredentialsDecrypted<T extends object = ICredentialDataDecryptedObject> {
	id: string;
	name: string;
	type: string;
	data?: T;
	homeProject?: ProjectSharingData;
	sharedWithProjects?: ProjectSharingData[];
}

export interface ICredentialsEncrypted {
	id?: string;
	name: string;
	type: string;
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

	abstract updateCredentialsOauthTokenData(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<void>;

	abstract getCredentialsProperties(type: string): INodeProperties[];
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
	hidden?: boolean;
} & ({ apiBaseUrl: string } | { apiBaseUrlPlaceholder: string });

export interface ICredentialType {
	name: string;
	displayName: string;
	icon?: Icon;
	iconColor?: ThemeIconColor;
	iconUrl?: Themed<string>;
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
	supportedNodes?: string[];
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
}

// The encrypted credentials which the nodes can access
export type CredentialInformation =
	| string
	| string[]
	| number
	| boolean
	| IDataObject
	| IDataObject[];

// The encrypted credentials which the nodes can access
export interface ICredentialDataDecryptedObject {
	[key: string]: CredentialInformation;
}

// First array index: The output/input-index (if node has multiple inputs/outputs of the same type)
// Second array index: The different connections (if one node is connected to multiple nodes)
// Any index can be null, for example in a switch node with multiple indexes some of which are not connected
export type NodeInputConnections = Array<IConnection[] | null>;

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

export interface IRunNodeResponse {
	data: INodeExecutionData[][] | null | undefined;
	hints?: NodeExecutionHint[];
	closeFunction?: CloseFunction;
}

export interface ISourceDataConnections {
	// Key for each input type and because there can be multiple inputs of the same type it is an array
	// null is also allowed because if we still need data for a later while executing the workflow set temporary to null
	// the nodes get as input TaskDataConnections which is identical to this one except that no null is allowed.
	[key: string]: Array<ISourceData[] | null>;
}

export interface IExecuteData {
	data: ITaskDataConnections;
	metadata?: ITaskMetadata;
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

/** used in helpers.httpRequest(WithAuthentication) */
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
	abortSignal?: GenericAbortSignal;
}

/**
 * used in helpers.request(WithAuthentication)
 * @see IHttpRequestOptions
 * @deprecated Prefer using IHttpRequestOptions
 */
export interface IRequestOptions {
	baseURL?: string;
	uri?: string;
	url?: string;
	method?: IHttpRequestMethods;
	qs?: IDataObject;
	qsStringifyOptions?: { arrayFormat: 'repeat' | 'brackets' | 'indices' };
	useQuerystring?: boolean;
	headers?: IDataObject;
	auth?: Partial<{
		sendImmediately: boolean;
		bearer: string;
		user: string;
		username: string;
		password: string;
		pass: string;
	}>;
	body?: any;
	formData?: IDataObject | FormData;
	form?: IDataObject | FormData;
	json?: boolean;
	useStream?: boolean;
	encoding?: string | null;
	timeout?: number;
	rejectUnauthorized?: boolean;
	proxy?: string | AxiosProxyConfig;
	simple?: boolean;
	gzip?: boolean;
	resolveWithFullResponse?: boolean;

	/** Whether to follow GET or HEAD HTTP 3xx redirects @default true */
	followRedirect?: boolean;

	/** Whether to follow **All** HTTP 3xx redirects @default false */
	followAllRedirects?: boolean;

	/** Max number of redirects to follow @default 21 */
	maxRedirects?: number;

	agentOptions?: SecureContextOptions;
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

export type EnsureTypeOptions = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'json';
export interface IGetNodeParameterOptions {
	contextNode?: INode;
	// make sure that returned value would be of specified type, converts it if needed
	ensureType?: EnsureTypeOptions;
	// extract value from regex, works only when parameter type is resourceLocator
	extractValue?: boolean;
	// get raw value of parameter with unresolved expressions
	rawExpressions?: boolean;
	// skip validation of parameter
	skipValidation?: boolean;
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
	credential: ICredentialsDecrypted<ICredentialDataDecryptedObject>,
) => Promise<INodeCredentialTestResult>;

export interface ICredentialTestFunctions {
	logger: Logger;
	helpers: SSHTunnelFunctions & {
		request: (uriOrObject: string | object, options?: object) => Promise<any>;
	};
}

export interface BaseHelperFunctions {
	createDeferredPromise: <T = void>() => IDeferredPromise<T>;
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
	/** @deprecated */
	copyBinaryFile(): Promise<never>;
	binaryToBuffer(body: Buffer | Readable): Promise<Buffer>;
	binaryToString(body: Buffer | Readable, encoding?: BufferEncoding): Promise<string>;
	getBinaryPath(binaryDataId: string): string;
	getBinaryStream(binaryDataId: string, chunkSize?: number): Promise<Readable>;
	createBinarySignedUrl(binaryData: IBinaryData, expiresIn?: string): string;
	getBinaryMetadata(binaryDataId: string): Promise<{
		fileName?: string;
		mimeType?: string;
		fileSize: number;
	}>;
}

export type DeduplicationScope = 'node' | 'workflow';
export type DeduplicationItemTypes = string | number;
export type DeduplicationMode = 'entries' | 'latestIncrementalKey' | 'latestDate';

export interface IProcessedDataLatest {
	mode: DeduplicationMode;
	data: DeduplicationItemTypes;
}

export interface IProcessedDataEntries {
	mode: DeduplicationMode;
	data: DeduplicationItemTypes[];
}

export interface IDeduplicationOutput {
	new: DeduplicationItemTypes[];
	processed: DeduplicationItemTypes[];
}

export interface IDeduplicationOutputItems {
	new: IDataObject[];
	processed: IDataObject[];
}

export interface ICheckProcessedOptions {
	mode: DeduplicationMode;
	maxEntries?: number;
}

export interface DeduplicationHelperFunctions {
	checkProcessedAndRecord(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutput>;
	checkProcessedItemsAndRecord(
		propertyName: string,
		items: IDataObject[],
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutputItems>;
	removeProcessed(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<void>;
	clearAllProcessedItems(scope: DeduplicationScope, options: ICheckProcessedOptions): Promise<void>;
	getProcessedDataCount(
		scope: DeduplicationScope,
		options: ICheckProcessedOptions,
	): Promise<number>;
}
interface NodeHelperFunctions {
	copyBinaryFile(filePath: string, fileName: string, mimeType?: string): Promise<IBinaryData>;
}

export interface RequestHelperFunctions {
	httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
	httpRequestWithAuthentication(
		this: IAllExecuteFunctions,
		credentialsType: string,
		requestOptions: IHttpRequestOptions,
		additionalCredentialOptions?: IAdditionalCredentialOptions,
	): Promise<any>;
	requestWithAuthenticationPaginated(
		this: IAllExecuteFunctions,
		requestOptions: IRequestOptions,
		itemIndex: number,
		paginationOptions: PaginationOptions,
		credentialsType?: string,
		additionalCredentialOptions?: IAdditionalCredentialOptions,
	): Promise<any[]>;

	/**
	 * @deprecated Use .httpRequest instead
	 * @see RequestHelperFunctions.httpRequest
	 */
	request(uriOrObject: string | IRequestOptions, options?: IRequestOptions): Promise<any>;
	/**
	 * @deprecated Use .httpRequestWithAuthentication instead
	 * @see RequestHelperFunctions.requestWithAuthentication
	 */
	requestWithAuthentication(
		this: IAllExecuteFunctions,
		credentialsType: string,
		requestOptions: IRequestOptions,
		additionalCredentialOptions?: IAdditionalCredentialOptions,
		itemIndex?: number,
	): Promise<any>;
	/**
	 * @deprecated Use .httpRequestWithAuthentication instead
	 * @see RequestHelperFunctions.requestWithAuthentication
	 */
	requestOAuth1(
		this: IAllExecuteFunctions,
		credentialsType: string,
		requestOptions: IRequestOptions,
	): Promise<any>;
	/**
	 * @deprecated Use .httpRequestWithAuthentication instead
	 * @see RequestHelperFunctions.requestWithAuthentication
	 */
	requestOAuth2(
		this: IAllExecuteFunctions,
		credentialsType: string,
		requestOptions: IRequestOptions,
		oAuth2Options?: IOAuth2Options,
	): Promise<any>;
}

export type SSHCredentials = {
	sshHost: string;
	sshPort: number;
	sshUser: string;
} & (
	| {
			sshAuthenticateWith: 'password';
			sshPassword: string;
	  }
	| {
			sshAuthenticateWith: 'privateKey';
			// TODO: rename this to `sshPrivateKey`
			privateKey: string;
			// TODO: rename this to `sshPassphrase`
			passphrase?: string;
	  }
);

export interface SSHTunnelFunctions {
	getSSHClient(credentials: SSHCredentials, abortController?: AbortController): Promise<SSHClient>;
	updateLastUsed(client: SSHClient): void;
}

type CronUnit = number | '*' | `*/${number}`;
export type CronExpression =
	`${CronUnit} ${CronUnit} ${CronUnit} ${CronUnit} ${CronUnit} ${CronUnit}`;

export interface SchedulingFunctions {
	registerCron(cronExpression: CronExpression, onTick: () => void): void;
}

export type NodeTypeAndVersion = {
	name: string;
	type: string;
	typeVersion: number;
	disabled: boolean;
	parameters?: INodeParameters;
};

export interface FunctionsBase {
	logger: Logger;
	getCredentials<T extends object = ICredentialDataDecryptedObject>(
		type: string,
		itemIndex?: number,
	): Promise<T>;
	getCredentialsProperties(type: string): INodeProperties[];
	getExecutionId(): string;
	getNode(): INode;
	getWorkflow(): IWorkflowMetadata;
	getWorkflowStaticData(type: string): IDataObject;
	getTimezone(): string;
	getRestApiUrl(): string;
	getInstanceBaseUrl(): string;
	getInstanceId(): string;
	getChildNodes(
		nodeName: string,
		options?: { includeNodeParameters?: boolean },
	): NodeTypeAndVersion[];
	getParentNodes(nodeName: string): NodeTypeAndVersion[];
	getKnownNodeTypes(): IDataObject;
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
	setMetadata(metadata: ITaskMetadata): void;
	evaluateExpression(expression: string, itemIndex: number): NodeParameterValueType;
	getContext(type: ContextType): IContextObject;
	getExecuteData(): IExecuteData;
	getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData;
	getInputSourceData(inputIndex?: number, connectionType?: NodeConnectionType): ISourceData;
	getExecutionCancelSignal(): AbortSignal | undefined;
	onExecutionCancellation(handler: () => unknown): void;
	logAiEvent(eventName: AiEvent, msg?: string): void;
};

// TODO: Create later own type only for Config-Nodes
export type IExecuteFunctions = ExecuteFunctions.GetNodeParameterFn &
	BaseExecutionFunctions & {
		executeWorkflow(
			workflowInfo: IExecuteWorkflowInfo,
			inputData?: INodeExecutionData[],
			parentCallbackManager?: CallbackManager,
			options?: {
				doNotWaitToFinish?: boolean;
				parentExecution?: RelatedExecution;
			},
		): Promise<ExecuteWorkflowData>;
		getExecutionDataById(executionId: string): Promise<IRunExecutionData | undefined>;
		getInputConnectionData(
			connectionType: AINodeConnectionType,
			itemIndex: number,
			inputIndex?: number,
		): Promise<unknown>;
		getInputData(inputIndex?: number, connectionType?: NodeConnectionType): INodeExecutionData[];
		getNodeInputs(): INodeInputConfiguration[];
		getNodeOutputs(): INodeOutputConfiguration[];
		putExecutionToWait(waitTill: Date): Promise<void>;
		sendMessageToUI(message: any): void;
		sendResponse(response: IExecuteResponsePromiseData): void;
		sendChunk(type: ChunkType, itemIndex: number, content?: IDataObject | string): void;
		isStreaming(): boolean;

		// TODO: Make this one then only available in the new config one
		addInputData(
			connectionType: NodeConnectionType,
			data: INodeExecutionData[][] | ExecutionError,
			runIndex?: number,
		): { index: number };
		addOutputData(
			connectionType: NodeConnectionType,
			currentNodeRunIndex: number,
			data: INodeExecutionData[][] | ExecutionError,
			metadata?: ITaskMetadata,
			sourceNodeRunIndex?: number,
		): void;

		addExecutionHints(...hints: NodeExecutionHint[]): void;

		nodeHelpers: NodeHelperFunctions;
		helpers: RequestHelperFunctions &
			BaseHelperFunctions &
			BinaryHelperFunctions &
			DeduplicationHelperFunctions &
			FileSystemHelperFunctions &
			SSHTunnelFunctions & {
				normalizeItems(items: INodeExecutionData | INodeExecutionData[]): INodeExecutionData[];
				constructExecutionMetaData(
					inputData: INodeExecutionData[],
					options: { itemData: IPairedItemData | IPairedItemData[] },
				): NodeExecutionWithMetadata[];
				assertBinaryData(itemIndex: number, propertyName: string): IBinaryData;
				getBinaryDataBuffer(itemIndex: number, propertyName: string): Promise<Buffer>;
				detectBinaryEncoding(buffer: Buffer): string;
				copyInputItems(items: INodeExecutionData[], properties: string[]): IDataObject[];
			};

		getParentCallbackManager(): CallbackManager | undefined;

		startJob<T = unknown, E = unknown>(
			jobType: string,
			settings: unknown,
			itemIndex: number,
		): Promise<Result<T, E>>;
	};

export interface IExecuteSingleFunctions extends BaseExecutionFunctions {
	getInputData(inputIndex?: number, connectionType?: NodeConnectionType): INodeExecutionData;
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
			detectBinaryEncoding(buffer: Buffer): string;
		};
}

export type ISupplyDataFunctions = ExecuteFunctions.GetNodeParameterFn &
	FunctionsBaseWithRequiredKeys<'getMode'> &
	Pick<
		IExecuteFunctions,
		| 'addInputData'
		| 'addOutputData'
		| 'getInputConnectionData'
		| 'getInputData'
		| 'getNodeOutputs'
		| 'executeWorkflow'
		| 'sendMessageToUI'
		| 'helpers'
	> & {
		getNextRunIndex(): number;
		continueOnFail(): boolean;
		evaluateExpression(expression: string, itemIndex: number): NodeParameterValueType;
		getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData;
		getExecutionCancelSignal(): AbortSignal | undefined;
		onExecutionCancellation(handler: () => unknown): void;
		logAiEvent(eventName: AiEvent, msg?: string): void;
		cloneWith(replacements: {
			runIndex: number;
			inputData: INodeExecutionData[][];
		}): ISupplyDataFunctions;
	};

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

	helpers: RequestHelperFunctions & SSHTunnelFunctions;
}

export type FieldValueOption = { name: string; type: FieldType | 'any' };

export type IWorkflowNodeContext = ExecuteFunctions.GetNodeParameterFn &
	Pick<FunctionsBase, 'getNode' | 'getWorkflow'>;

export interface ILocalLoadOptionsFunctions {
	getWorkflowNodeContext(nodeType: string): Promise<IWorkflowNodeContext | null>;
}

export interface IWorkflowLoader {
	get(workflowId: string): Promise<IWorkflowBase>;
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
		SchedulingFunctions;
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
		SSHTunnelFunctions &
		SchedulingFunctions;
}

export interface IHookFunctions
	extends FunctionsBaseWithRequiredKeys<'getMode' | 'getActivationMode'> {
	getWebhookName(): string;
	getWebhookDescription(name: WebhookType): IWebhookDescription | undefined;
	getNodeWebhookUrl: (name: WebhookType) => string | undefined;
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
		connectionType: AINodeConnectionType,
		itemIndex: number,
		inputIndex?: number,
	): Promise<unknown>;
	getNodeParameter(
		parameterName: string,
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object;
	getNodeWebhookUrl: (name: WebhookType) => string | undefined;
	evaluateExpression(expression: string, itemIndex?: number): NodeParameterValueType;
	getParamsData(): object;
	getQueryData(): object;
	getRequestObject(): express.Request;
	getResponseObject(): express.Response;
	getWebhookName(): string;
	nodeHelpers: NodeHelperFunctions;
	helpers: RequestHelperFunctions & BaseHelperFunctions & BinaryHelperFunctions;
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
	rewireOutputLogTo?: NodeConnectionType;

	// forces the node to execute a particular custom operation
	// based on resource and operation
	// instead of calling default execute function
	// used by evaluations test-runner
	forceCustomOperation?: {
		resource: string;
		operation: string;
	};
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
	metadata?: {
		subExecution: RelatedExecution;
	};

	/**
	 * @deprecated This key was added by accident and should not be used as it
	 * will be removed in future. For more information see PR #12469.
	 */
	index?: number;
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
	value: Exclude<NodeParameterValue, boolean>;
	cachedResultName?: string;
	cachedResultUrl?: string;
	__regex?: string;
}

export type NodeParameterValueType =
	// TODO: Later also has to be possible to add multiple ones with the name name. So array has to be possible
	| NodeParameterValue
	| INodeParameters
	| INodeParameterResourceLocator
	| ResourceMapperValue
	| FilterValue
	| AssignmentCollectionValue
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
	| 'callout'
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
	| 'assignmentCollection'
	| 'credentials'
	| 'workflowSelector';

export type CodeAutocompleteTypes = 'function' | 'functionItem';

export type EditorType = 'codeNodeEditor' | 'jsEditor' | 'htmlEditor' | 'sqlEditor' | 'cssEditor';
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

export type NodePropertyAction = {
	type: 'askAiCodeGeneration';
	handler?: string;
	target?: string;
};

export type CalloutActionType = 'openRagStarterTemplate';
export interface CalloutAction {
	type: CalloutActionType;
	label: string;
}

export interface INodePropertyTypeOptions {
	// Supported by: button
	buttonConfig?: {
		action?: string | NodePropertyAction;
		label?: string; // otherwise "displayName" is used
		hasInputField?: boolean;
		inputFieldMaxLength?: number; // Supported if hasInputField is true
	};
	containerClass?: string; // Supported by: notice
	alwaysOpenEditWindow?: boolean; // Supported by: json
	codeAutocomplete?: CodeAutocompleteTypes; // Supported by: string
	editor?: EditorType; // Supported by: string
	editorIsReadOnly?: boolean; // Supported by: string
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
	assignment?: AssignmentTypeOptions;
	minRequiredFields?: number; // Supported by: fixedCollection
	maxAllowedFields?: number; // Supported by: fixedCollection
	calloutAction?: CalloutAction; // Supported by: callout
	[key: string]: any;
}

export interface ResourceMapperTypeOptionsBase {
	mode: 'add' | 'update' | 'upsert' | 'map';
	valuesLabel?: string;
	fieldWords?: {
		singular: string;
		plural: string;
	};
	addAllFields?: boolean;
	noFieldsError?: string;
	multiKeyMatch?: boolean;
	supportAutoMap?: boolean;
	matchingFieldsLabels?: {
		title?: string;
		description?: string;
		hint?: string;
	};
	showTypeConversionOptions?: boolean;
}

// Enforce at least one of resourceMapperMethod or localResourceMapperMethod
export type ResourceMapperTypeOptionsLocal = {
	resourceMapperMethod: string;
	localResourceMapperMethod?: never; // Explicitly disallows this property
};

export type ResourceMapperTypeOptionsExternal = {
	localResourceMapperMethod: string;
	resourceMapperMethod?: never; // Explicitly disallows this property
};

export type ResourceMapperTypeOptions = ResourceMapperTypeOptionsBase &
	(ResourceMapperTypeOptionsLocal | ResourceMapperTypeOptionsExternal);

type NonEmptyArray<T> = [T, ...T[]];

export type FilterTypeCombinator = 'and' | 'or';

export type FilterTypeOptions = {
	version: 1 | 2 | {}; // required so nodes are pinned on a version
	caseSensitive?: boolean | string; // default = true
	leftValue?: string; // when set, user can't edit left side of condition
	allowedCombinators?: NonEmptyArray<FilterTypeCombinator>; // default = ['and', 'or']
	maxConditions?: number; // default = 10
	typeValidation?: 'strict' | 'loose' | {}; // default = strict, `| {}` is a TypeScript trick to allow custom strings (expressions), but still give autocomplete
};

export type AssignmentTypeOptions = Partial<{
	hideType?: boolean; // visible by default
	defaultType?: FieldType | 'string';
	disableType?: boolean; // visible by default
}>;

export type DisplayCondition =
	| { _cnd: { eq: NodeParameterValue } }
	| { _cnd: { not: NodeParameterValue } }
	| { _cnd: { gte: number | string } }
	| { _cnd: { lte: number | string } }
	| { _cnd: { gt: number | string } }
	| { _cnd: { lt: number | string } }
	| { _cnd: { between: { from: number | string; to: number | string } } }
	| { _cnd: { startsWith: string } }
	| { _cnd: { endsWith: string } }
	| { _cnd: { includes: string } }
	| { _cnd: { regex: string } }
	| { _cnd: { exists: true } };

export interface IDisplayOptions {
	hide?: {
		[key: string]: Array<NodeParameterValue | DisplayCondition> | undefined;
	};
	show?: {
		'@version'?: Array<number | DisplayCondition>;
		'@tool'?: boolean[];
		[key: string]: Array<NodeParameterValue | DisplayCondition> | undefined;
	};

	hideOnCloud?: boolean;
}
export interface ICredentialsDisplayOptions {
	hide?: {
		[key: string]: NodeParameterValue[] | undefined;
	};
	show?: {
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
	disabledOptions?: IDisplayOptions;
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
	// for type: options | multiOptions – skip validation of the value (e.g. when value is not in the list and specified via expression)
	allowArbitraryValues?: boolean;
}

export interface INodePropertyModeTypeOptions {
	searchListMethod?: string; // Supported by: options
	searchFilterRequired?: boolean;
	searchable?: boolean;
	/**
	 * If true, the resource locator will not show an error if the credentials are not selected
	 */
	skipCredentialsCheckInRLC?: boolean;
	allowNewResource?: {
		label: string;
		defaultName: string;
		method: string;
	};
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
	outputConnectionType?: NodeConnectionType;
	inputSchema?: any;
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
	): Promise<string | NodeParameterValue> | string;
}
export type INodePropertyValueExtractor = INodePropertyValueExtractorRegex;

export interface IParameterDependencies {
	[key: string]: string[];
}

export type IParameterLabel = {
	size?: 'small' | 'medium';
};

export interface ITriggerResponse {
	closeFunction?: CloseFunction;
	// To manually trigger the run
	manualTriggerFunction?: () => Promise<void>;
	// Gets added automatically at manual workflow runs resolves with
	// the first emitted data
	manualTriggerResponse?: Promise<INodeExecutionData[][]>;
}

export interface ExecuteWorkflowData {
	executionId: string;
	data: Array<INodeExecutionData[] | null>;
	waitTill?: Date | null;
}

export type WebhookSetupMethodNames = 'checkExists' | 'create' | 'delete';

export namespace MultiPartFormData {
	export interface File {
		filepath: string;
		mimetype?: string;
		originalFilename?: string;
		newFilename: string;
		size?: number;
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

type NodeOutput = INodeExecutionData[][] | NodeExecutionWithMetadata[][] | null;

export interface INodeType {
	description: INodeTypeDescription;
	supplyData?(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
	execute?(this: IExecuteFunctions): Promise<NodeOutput>;
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
		localResourceMapping?: {
			[functionName: string]: (this: ILocalLoadOptionsFunctions) => Promise<ResourceMapperFields>;
		};
		actionHandler?: {
			[functionName: string]: (
				this: ILoadOptionsFunctions,
				payload: IDataObject | string | undefined,
			) => Promise<NodeParameterValueType>;
		};
	};
	webhookMethods?: {
		[name in WebhookType]?: {
			[method in WebhookSetupMethodNames]: (this: IHookFunctions) => Promise<boolean>;
		};
	};
	/**
	 * Defines custom operations for nodes that do not implement an `execute` method, such as declarative nodes.
	 * This function will be invoked instead of `execute` for a specific resource and operation.
	 * Should be either `execute` or `customOperations` defined for a node, but not both.
	 *
	 * @property customOperations - Maps specific resource and operation to a custom function
	 */
	customOperations?: {
		[resource: string]: {
			[operation: string]: (this: IExecuteFunctions) => Promise<NodeOutput>;
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
	poll?(context: IPollFunctions): Promise<INodeExecutionData[][] | null>;
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
	displayName?: string;
	disabledOptions?: ICredentialsDisplayOptions;
	displayOptions?: ICredentialsDisplayOptions;
	testedBy?: ICredentialTestRequest | string; // Name of a function inside `loadOptions.credentialTest`
}

export type INodeIssueTypes = 'credentials' | 'execution' | 'input' | 'parameters' | 'typeUnknown';

export interface INodeIssueObjectProperty {
	[key: string]: string[];
}

export interface INodeIssueData {
	node: string;
	type: INodeIssueTypes;
	value: null | boolean | string | string[] | INodeIssueObjectProperty;
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

export type ThemeIconColor =
	| 'gray'
	| 'black'
	| 'blue'
	| 'light-blue'
	| 'dark-blue'
	| 'orange'
	| 'orange-red'
	| 'pink-red'
	| 'red'
	| 'light-green'
	| 'green'
	| 'dark-green'
	| 'azure'
	| 'purple'
	| 'crimson';
export type Themed<T> = T | { light: T; dark: T };
export type IconRef = `fa:${string}` | `node:${string}.${string}`;
export type IconFile = `file:${string}.png` | `file:${string}.svg`;
export type Icon = IconRef | Themed<IconFile>;

type NodeGroupType = 'input' | 'output' | 'organization' | 'schedule' | 'transform' | 'trigger';

export interface INodeTypeBaseDescription {
	displayName: string;
	name: string;
	icon?: Icon;
	iconColor?: ThemeIconColor;
	iconUrl?: Themed<string>;
	badgeIconUrl?: Themed<string>;
	group: NodeGroupType[];
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

	/**
	 * Whether the node will be wrapped for tool-use by AI Agents,
	 * optionally replacing provided parts of the description
	 */
	usableAsTool?: true | UsableAsToolDescription;
}

/**
 * NodeDescription entries that replace the base node entries when
 * the node is used as a tool
 *
 * Note that the new codex is hardcoded and may not behave as expected
 * without additional changes to the implementation.
 */
export type UsableAsToolDescription = {
	replacements?: Partial<Omit<INodeTypeBaseDescription, 'usableAsTool'>>;
};

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

export const NodeConnectionTypes = {
	AiAgent: 'ai_agent',
	AiChain: 'ai_chain',
	AiDocument: 'ai_document',
	AiEmbedding: 'ai_embedding',
	AiLanguageModel: 'ai_languageModel',
	AiMemory: 'ai_memory',
	AiOutputParser: 'ai_outputParser',
	AiRetriever: 'ai_retriever',
	AiReranker: 'ai_reranker',
	AiTextSplitter: 'ai_textSplitter',
	AiTool: 'ai_tool',
	AiVectorStore: 'ai_vectorStore',
	Main: 'main',
} as const;

export type NodeConnectionType = (typeof NodeConnectionTypes)[keyof typeof NodeConnectionTypes];

export type AINodeConnectionType = Exclude<NodeConnectionType, typeof NodeConnectionTypes.Main>;

export const nodeConnectionTypes: NodeConnectionType[] = Object.values(NodeConnectionTypes);

export interface INodeInputFilter {
	// TODO: Later add more filter options like categories, subcatogries,
	//       regex, allow to exclude certain nodes, ... ?
	//       Potentially change totally after alpha/beta. Is not a breaking change after all.
	nodes?: string[]; // Allowed nodes
	excludedNodes?: string[];
}

export interface INodeInputConfiguration {
	category?: string;
	displayName?: string;
	required?: boolean;
	type: NodeConnectionType;
	filter?: INodeInputFilter;
	maxConnections?: number;
}

export interface INodeOutputConfiguration {
	category?: 'error';
	displayName?: string;
	maxConnections?: number;
	required?: boolean;
	type: NodeConnectionType;
}

export type ExpressionString = `={{${string}}}`;

export type NodeDefaults = Partial<{
	/**
	 * @deprecated Use {@link INodeTypeBaseDescription.iconColor|iconColor} instead. `iconColor` supports dark mode and uses preset colors from n8n's design system.
	 */
	color: string;
	name: string;
}>;

export interface INodeTypeDescription extends INodeTypeBaseDescription {
	version: number | number[];
	defaults: NodeDefaults;
	eventTriggerDescription?: string;
	activationMessage?: string;
	inputs: Array<NodeConnectionType | INodeInputConfiguration> | ExpressionString;
	requiredInputs?: string | number[] | number; // Ony available with executionOrder => "v1"
	inputNames?: string[];
	outputs: Array<NodeConnectionType | INodeOutputConfiguration> | ExpressionString;
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
	triggerPanel?: TriggerPanelDefinition | boolean;
	extendsCredential?: string;
	hints?: NodeHint[];
	__loadOptionsMethods?: string[]; // only for validation during build
}

export type TriggerPanelDefinition = {
	hideContent?: boolean | string;
	header?: string;
	executionsHelp?: string | { active: string; inactive: string };
	activationHint?: string | { active: string; inactive: string };
};

export type NodeHint = {
	message: string;
	type?: 'info' | 'warning' | 'danger';
	location?: 'outputPane' | 'inputPane' | 'ndv';
	displayCondition?: string;
	whenToDisplay?: 'always' | 'beforeExecution' | 'afterExecution';
};

export type NodeExecutionHint = Omit<NodeHint, 'whenToDisplay' | 'displayCondition'>;

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

export type WebhookType = 'default' | 'setup';

export interface IWebhookDescription {
	[key: string]: IHttpRequestMethods | WebhookResponseMode | boolean | string | undefined;
	httpMethod: IHttpRequestMethods | string;
	isFullPath?: boolean;
	name: WebhookType;
	path: string;
	responseBinaryPropertyName?: string;
	responseContentType?: string;
	responsePropertyName?: string;
	responseMode?: WebhookResponseMode | string;
	responseData?: WebhookResponseData | string;
	restartWebhook?: boolean;
	nodeType?: 'webhook' | 'form' | 'mcp';
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

export type IWorkflowDataProxyAdditionalKeys = IDataObject & {
	$execution?: {
		id: string;
		mode: 'test' | 'production';
		resumeUrl: string;
		resumeFormUrl: string;
		customData?: {
			set(key: string, value: string): void;
			setAll(obj: Record<string, string>): void;
			get(key: string): string;
			getAll(): Record<string, string>;
		};
	};
	$vars?: IDataObject;
	$secrets?: IDataObject;
	$pageCount?: number;

	/** @deprecated */
	$executionId?: string;
	/** @deprecated */
	$resumeWebhookUrl?: string;
};

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
export type WebhookResponseMode =
	| 'onReceived'
	| 'lastNode'
	| 'responseNode'
	| 'formPage'
	| 'streaming';

export interface INodeTypes {
	getByName(nodeType: string): INodeType | IVersionedNodeType;
	getByNameAndVersion(nodeType: string, version?: number): INodeType;
	getKnownTypes(): IDataObject;
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

export interface LoadedNodesAndCredentials {
	nodes: INodeTypeData;
	credentials: ICredentialTypeData;
}

export interface LoadedClass<T> {
	sourcePath: string;
	type: T;
}

type LoadedData<T> = Record<string, LoadedClass<T>>;
export type ICredentialTypeData = LoadedData<ICredentialType>;
export type INodeTypeData = LoadedData<INodeType | IVersionedNodeType>;

export interface IRun {
	data: IRunExecutionData;
	/**
	 * @deprecated Use status instead
	 */
	finished?: boolean;
	mode: WorkflowExecuteMode;
	waitTill?: Date | null;
	startedAt: Date;
	stoppedAt?: Date;
	status: ExecutionStatus;

	/** ID of the job this execution belongs to. Only in scaling mode. */
	jobId?: string;
}

// Contains all the data which is needed to execute a workflow and so also to
// start restart it again after it did fail.
// The RunData, ExecuteData and WaitForExecution contain often the same data.
export interface IRunExecutionData {
	startData?: {
		startNodes?: StartNodeData[];
		destinationNode?: string;
		originalDestinationNode?: string;
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
	parentExecution?: RelatedExecution;
	waitTill?: Date;
	pushRef?: string;

	/** Data needed for a worker to run a manual execution. */
	manualData?: Pick<
		IWorkflowExecutionDataProcess,
		'partialExecutionVersion' | 'dirtyNodeNames' | 'triggerToStartFrom' | 'userId'
	>;
}
export type SchemaType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'bigint'
	| 'symbol'
	| 'array'
	| 'object'
	| 'function'
	| 'null'
	| 'undefined';

export type Schema = { type: SchemaType; key?: string; value: string | Schema[]; path: string };

export interface NodeExecutionSchema {
	nodeName: string;
	schema: Schema;
}

export interface IRunData {
	// node-name: result-data
	[key: string]: ITaskData[];
}

export interface ITaskSubRunMetadata {
	node: string;
	runIndex: number;
}

export interface RelatedExecution {
	executionId: string;
	workflowId: string;
}

export interface ITaskMetadata {
	subRun?: ITaskSubRunMetadata[];
	parentExecution?: RelatedExecution;
	subExecution?: RelatedExecution;
	subExecutionsCount?: number;
}

/** The data that gets returned when a node execution starts */
export interface ITaskStartedData {
	startTime: number;
	/** This index tracks the order in which nodes are executed */
	executionIndex: number;
	source: Array<ISourceData | null>; // Is an array as nodes have multiple inputs
	hints?: NodeExecutionHint[];
}

/** The data that gets returned when a node execution ends */
export interface ITaskData extends ITaskStartedData {
	executionTime: number;
	executionStatus?: ExecutionStatus;
	data?: ITaskDataConnections;
	inputOverride?: ITaskDataConnections;
	error?: ExecutionError;
	metadata?: ITaskMetadata;
}

export interface ISourceData {
	previousNode: string;
	previousNodeOutput?: number; // If undefined "0" gets used
	previousNodeRun?: number; // If undefined "0" gets used
}

export interface StartNodeData {
	name: string;
	sourceData: ISourceData | null;
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

export type WorkflowId = IWorkflowBase['id'];

export interface IWorkflowBase {
	id: string;
	name: string;
	active: boolean;
	isArchived: boolean;
	createdAt: Date;
	startedAt?: Date;
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

export interface IWorkflowExecutionDataProcess {
	destinationNode?: string;
	restartExecutionId?: string;
	executionMode: WorkflowExecuteMode;
	/**
	 * The data that is sent in the body of the webhook that started this
	 * execution.
	 */
	executionData?: IRunExecutionData;
	runData?: IRunData;
	pinData?: IPinData;
	retryOf?: string | null;
	pushRef?: string;
	startNodes?: StartNodeData[];
	workflowData: IWorkflowBase;
	userId?: string;
	projectId?: string;
	/**
	 * Defines which version of the partial execution flow is used.
	 * Possible values are:
	 *  1 - use the old flow
	 *  2 - use the new flow
	 */
	partialExecutionVersion?: 1 | 2;
	dirtyNodeNames?: string[];
	triggerToStartFrom?: {
		name: string;
		data?: ITaskData;
	};
	agentRequest?: AiAgentRequest;
	httpResponse?: express.Response; // Used for streaming responses
	streamingEnabled?: boolean;
	startedAt?: Date;
}

export interface ExecuteWorkflowOptions {
	node?: INode;
	parentWorkflowId: string;
	inputData?: INodeExecutionData[];
	loadedWorkflowData?: IWorkflowBase;
	loadedRunData?: IWorkflowExecutionDataProcess;
	parentWorkflowSettings?: IWorkflowSettings;
	parentCallbackManager?: CallbackManager;
	doNotWaitToFinish?: boolean;
	parentExecution?: RelatedExecution;
}

export type AiEvent =
	| 'ai-messages-retrieved-from-memory'
	| 'ai-message-added-to-memory'
	| 'ai-output-parsed'
	| 'ai-documents-retrieved'
	| 'ai-document-reranked'
	| 'ai-document-embedded'
	| 'ai-query-embedded'
	| 'ai-document-processed'
	| 'ai-text-split'
	| 'ai-tool-called'
	| 'ai-vector-store-searched'
	| 'ai-llm-generated-output'
	| 'ai-llm-errored'
	| 'ai-vector-store-populated'
	| 'ai-vector-store-updated';

type AiEventPayload = {
	msg: string;
	workflowName: string;
	executionId: string;
	nodeName: string;
	workflowId?: string;
	nodeType?: string;
};

// Used to transport an agent request for partial execution
export interface AiAgentRequest {
	query: string | INodeParameters;
	tool: {
		name: string;
	};
}

export interface IWorkflowExecuteAdditionalData {
	credentialsHelper: ICredentialsHelper;
	executeWorkflow: (
		workflowInfo: IExecuteWorkflowInfo,
		additionalData: IWorkflowExecuteAdditionalData,
		options: ExecuteWorkflowOptions,
	) => Promise<ExecuteWorkflowData>;
	getRunExecutionData: (executionId: string) => Promise<IRunExecutionData | undefined>;
	executionId?: string;
	restartExecutionId?: string;
	currentNodeExecutionIndex: number;
	httpResponse?: express.Response;
	httpRequest?: express.Request;
	streamingEnabled?: boolean;
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
	userId?: string;
	variables: IDataObject;
	logAiEvent: (eventName: AiEvent, payload: AiEventPayload) => void;
	parentCallbackManager?: CallbackManager;
	startRunnerTask<T, E = unknown>(
		additionalData: IWorkflowExecuteAdditionalData,
		jobType: string,
		settings: unknown,
		executeFunctions: IExecuteFunctions,
		inputData: ITaskDataConnections,
		node: INode,
		workflow: Workflow,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		siblingParameters: INodeParameters,
		mode: WorkflowExecuteMode,
		envProviderState: EnvProviderState,
		executeData?: IExecuteData,
	): Promise<Result<T, E>>;
}

export type WorkflowExecuteMode =
	| 'cli'
	| 'error'
	| 'integrated'
	| 'internal'
	| 'manual'
	| 'retry'
	| 'trigger'
	| 'webhook'
	| 'evaluation';

export type WorkflowActivateMode =
	| 'init'
	| 'create' // unused
	| 'update'
	| 'activate'
	| 'manual' // unused
	| 'leadershipChange';

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
	timeSavedPerExecution?: number;
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
		assertBinaryData?: boolean;
		nodeExecutionOrder?: string[];
		nodeExecutionStack?: IExecuteData[];
		testAllOutputs?: boolean;
		nodeData: {
			[key: string]: any[][];
		};
		error?: string;
	};
	nock?: {
		baseUrl: string;
		mocks: Array<{
			method: 'delete' | 'get' | 'patch' | 'post' | 'put';
			path: string;
			requestBody?: RequestBodyMatcher;
			requestHeaders?: Record<string, RequestHeaderMatcher>;
			statusCode: number;
			responseBody: string | object;
			responseHeaders?: ReplyHeaders;
		}>;
	};
	trigger?: {
		mode: WorkflowExecuteMode;
		input: INodeExecutionData;
	};
	credentials?: Record<string, ICredentialDataDecryptedObject>;
}

export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogMetadata = {
	[key: string]: unknown;
	scopes?: LogScope[];
	file?: string;
	function?: string;
};
export type Logger = Record<
	Exclude<LogLevel, 'silent'>,
	(message: string, metadata?: LogMetadata) => void
>;
export type LogLocationMetadata = Pick<LogMetadata, 'file' | 'function'>;

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
				[otherKey: string]: Array<NodeParameterValue | DisplayCondition> | undefined;
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
	agent?: string; //@n8n/n8n-nodes-langchain.agent
	is_streaming?: boolean; //@n8n/n8n-nodes-langchain.agent
	prompts?: IDataObject[] | IDataObject; //ai node's prompts, cloud only
	toolSettings?: IDataObject; //various langchain tool's settings
	sql?: string; //merge node combineBySql, cloud only
	workflow_id?: string; //@n8n/n8n-nodes-langchain.toolWorkflow and n8n-nodes-base.executeWorkflow
	response_mode?: string; // @n8n/n8n-nodes-langchain.chatTrigger, n8n-nodes-base.webhook selected response mode
	public_chat?: boolean; // @n8n/n8n-nodes-langchain.chatTrigger
	runs?: number;
	items_total?: number;
	metric_names?: string[];
	language?: string; // only for Code node: 'javascript' or 'python'
}

export interface INodeNameIndex {
	[name: string]: string;
}

export interface INodesGraphResult {
	nodeGraph: INodesGraph;
	nameIndices: INodeNameIndex;
	webhookNodeNames: string[];
	evaluationTriggerNodeNames: string[];
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
	latestVersion: number;
	package: PublicInstalledPackage;
};

export interface NodeExecutionWithMetadata extends INodeExecutionData {
	pairedItem: IPairedItemData | IPairedItemData[];
}

export type AnnotationVote = 'up' | 'down';

export interface ExecutionSummary {
	id: string;
	/**
	 * @deprecated Use status instead
	 */
	finished?: boolean;
	mode: WorkflowExecuteMode;
	retryOf?: string | null;
	retrySuccessId?: string | null;
	waitTill?: Date;
	createdAt: Date;
	startedAt: Date | null;
	stoppedAt?: Date;
	workflowId: string;
	workflowName?: string;
	status: ExecutionStatus;
	lastNodeExecuted?: string;
	executionError?: ExecutionError;
	nodeExecutionStatus?: {
		[key: string]: IExecutionSummaryNodeExecutionResult;
	};
	annotation?: {
		vote: AnnotationVote;
		tags: Array<{
			id: string;
			name: string;
		}>;
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
	emptyFieldsNotice?: string;
}

export interface WorkflowInputsData {
	fields: ResourceMapperField[];
	dataMode: string;
	subworkflowInfo?: { workflowId?: string; triggerId?: string };
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

export type FormFieldsParameter = Array<{
	fieldLabel: string;
	elementName?: string;
	fieldType?: string;
	requiredField?: boolean;
	fieldOptions?: { values: Array<{ option: string }> };
	multiselect?: boolean;
	multipleFiles?: boolean;
	acceptFileTypes?: string;
	formatDate?: string;
	html?: string;
	placeholder?: string;
	fieldName?: string;
	fieldValue?: string;
}>;

export type FieldTypeMap = {
	// eslint-disable-next-line id-denylist
	boolean: boolean;
	// eslint-disable-next-line id-denylist
	number: number;
	// eslint-disable-next-line id-denylist
	string: string;
	'string-alphanumeric': string;
	dateTime: string;
	time: string;
	array: unknown[];
	object: object;
	options: any;
	url: string;
	jwt: string;
	'form-fields': FormFieldsParameter;
};

export type FieldType = keyof FieldTypeMap;

export type ValidationResult<T extends FieldType = FieldType> =
	| { valid: false; errorMessage: string }
	| {
			valid: true;
			newValue?: FieldTypeMap[T];
	  };

export type ResourceMapperValue = {
	mappingMode: string;
	value: { [key: string]: string | number | boolean | null } | null;
	matchingColumns: string[];
	schema: ResourceMapperField[];
	attemptToConvertTypes: boolean;
	convertFieldsToString: boolean;
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
	leftValue: NodeParameterValue | NodeParameterValue[];
	operator: FilterOperatorValue;
	rightValue: NodeParameterValue | NodeParameterValue[];
};

export type FilterOptionsValue = {
	caseSensitive: boolean;
	leftValue: string;
	typeValidation: 'strict' | 'loose';
	version: 1 | 2;
};

export type FilterValue = {
	options: FilterOptionsValue;
	conditions: FilterConditionValue[];
	combinator: FilterTypeCombinator;
};

export type AssignmentCollectionValue = {
	assignments: AssignmentValue[];
};

export type AssignmentValue = {
	id: string;
	name: string;
	value: NodeParameterValue;
	type?: string;
};

export interface ExecutionOptions {
	limit?: number;
}

export interface ExecutionFilters {
	/**
	 * @deprecated Use status instead
	 */
	finished?: boolean;
	mode?: WorkflowExecuteMode[];
	retryOf?: string;
	retrySuccessId?: string;
	status?: ExecutionStatus[];
	waitTill?: boolean;
	workflowId?: number | string;
}

export type NpsSurveyRespondedState = { lastShownAt: number; responded: true };
export type NpsSurveyWaitingState = {
	lastShownAt: number;
	waitingForResponse: true;
	ignoredCount: number;
};
export type NpsSurveyState = NpsSurveyRespondedState | NpsSurveyWaitingState;

export interface IUserSettings {
	isOnboarded?: boolean;
	firstSuccessfulWorkflowId?: string;
	userActivated?: boolean;
	userActivatedAt?: number;
	allowSSOManualLogin?: boolean;
	npsSurvey?: NpsSurveyState;
	easyAIWorkflowOnboarded?: boolean;
	userClaimedAiCredits?: boolean;
	dismissedCallouts?: Record<string, boolean>;
}

export interface IProcessedDataConfig {
	availableModes: string;
	mode: string;
}

export interface IDataDeduplicator {
	checkProcessedAndRecord(
		items: DeduplicationItemTypes[],
		context: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutput>;

	removeProcessed(
		items: DeduplicationItemTypes[],
		context: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void>;

	clearAllProcessedItems(
		context: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void>;
	getProcessedDataCount(
		context: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<number>;
}

export interface ICheckProcessedContextData {
	node?: INode;
	workflow: {
		id: string;
		active: boolean;
	};
}

export type N8nAIProviderType = 'openai' | 'unknown';

export type Functionality = 'regular' | 'configuration-node' | 'pairedItem';

export type CallbackManager = CallbackManagerLC;

export type IPersonalizationSurveyAnswersV4 = {
	version: 'v4';
	personalization_survey_submitted_at: string;
	personalization_survey_n8n_version: string;
	automationGoalDevops?: string[] | null;
	automationGoalDevopsOther?: string | null;
	companyIndustryExtended?: string[] | null;
	otherCompanyIndustryExtended?: string[] | null;
	companySize?: string | null;
	companyType?: string | null;
	automationGoalSm?: string[] | null;
	automationGoalSmOther?: string | null;
	usageModes?: string[] | null;
	email?: string | null;
	role?: string | null;
	roleOther?: string | null;
	reportedSource?: string | null;
	reportedSourceOther?: string | null;
};

export type ChunkType = 'begin' | 'item' | 'end' | 'error';
export interface StructuredChunk {
	type: ChunkType;
	content?: string;
	metadata: {
		nodeId: string;
		nodeName: string;
		runIndex: number;
		itemIndex: number;
		timestamp: number;
	};
}
