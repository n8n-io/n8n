import * as LoggerProxy from './LoggerProxy';
import * as NodeHelpers from './NodeHelpers';
import * as ObservableObject from './ObservableObject';
import * as TelemetryHelpers from './TelemetryHelpers';

export * from './errors';
export * from './Constants';
export * from './Cron';
export * from './DeferredPromise';
export * from './GlobalState';
export * from './Interfaces';
export * from './MessageEventBus';
export * from './ExecutionStatus';
export * from './Expression';
export * from './FromAIParseUtils';
export * from './NodeHelpers';
export * from './MetadataUtils';
export * from './Workflow';
export * from './WorkflowDataProxy';
export * from './WorkflowDataProxyEnvProvider';
export * from './VersionedNodeType';
export * from './TypeValidation';
export * from './result';
export { LoggerProxy, NodeHelpers, ObservableObject, TelemetryHelpers };
export {
	isObjectEmpty,
	deepCopy,
	jsonParse,
	jsonStringify,
	replaceCircularReferences,
	sleep,
	fileTypeFromMimeType,
	assert,
	removeCircularRefs,
	updateDisplayOptions,
	randomInt,
	randomString,
	isSafeObjectProperty,
	setSafeObjectProperty,
} from './utils';
export {
	isINodeProperties,
	isINodePropertyOptions,
	isINodePropertyCollection,
	isINodePropertiesList,
	isINodePropertyCollectionList,
	isINodePropertyOptionsList,
	isResourceMapperValue,
	isResourceLocatorValue,
	isFilterValue,
} from './type-guards';

export { ExpressionExtensions } from './Extensions';
export * as ExpressionParser from './Extensions/ExpressionParser';
export { NativeMethods } from './NativeMethods';
export * from './NodeParameters/FilterParameter';

export type {
	DocMetadata,
	NativeDoc,
	DocMetadataArgument,
	DocMetadataExample,
	Extension,
} from './Extensions';

declare module 'http' {
	export interface IncomingMessage {
		contentType?: string;
		encoding: BufferEncoding;
		contentDisposition?: { type: string; filename?: string };
		rawBody: Buffer;
		readRawBody(): Promise<void>;
		_body: boolean;

		// This gets added by the `follow-redirects` package
		responseUrl?: string;

		// This is added to response objects for all outgoing requests
		req?: ClientRequest;
	}
}
