import * as LoggerProxy from './LoggerProxy';
export * as ErrorReporterProxy from './ErrorReporterProxy';
import * as NodeHelpers from './NodeHelpers';
import * as ObservableObject from './ObservableObject';
import * as TelemetryHelpers from './TelemetryHelpers';

export * from './Authentication';
export * from './Constants';
export * from './Cron';
export * from './DeferredPromise';
export * from './Interfaces';
export * from './MessageEventBus';
export * from './ExecutionStatus';
export * from './Expression';
export * from './ExpressionError';
export * from './NodeErrors';
export * from './NodeHelpers';
export * from './RoutingNode';
export * from './Workflow';
export * from './WorkflowActivationError';
export * from './WorkflowDataProxy';
export * from './WorkflowErrors';
export * from './WorkflowHooks';
export * from './VersionedNodeType';
export { LoggerProxy, NodeHelpers, ObservableObject, TelemetryHelpers };
export {
	isObjectEmpty,
	deepCopy,
	jsonParse,
	jsonStringify,
	sleep,
	fileTypeFromMimeType,
	assert,
	removeCircularRefs,
} from './utils';
export {
	isINodeProperties,
	isINodePropertyOptions,
	isINodePropertyCollection,
	isINodePropertiesList,
	isINodePropertyCollectionList,
	isINodePropertyOptionsList,
	isResourceMapperValue,
} from './type-guards';

export { ExpressionExtensions } from './Extensions';
export * as ExpressionParser from './Extensions/ExpressionParser';
export { NativeMethods } from './NativeMethods';

export type { DocMetadata, NativeDoc } from './Extensions';

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
