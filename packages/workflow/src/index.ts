import * as LoggerProxy from './logger-proxy';
import * as NodeHelpers from './node-helpers';
import * as ObservableObject from './observable-object';
import * as TelemetryHelpers from './telemetry-helpers';

export * from './errors';
export * from './constants';
export * from './common';
export * from './cron';
export * from './data-table.types';
export * from './deferred-promise';
export * from './global-state';
export * from './interfaces';
export * from './message-event-bus';
export * from './execution-status';
export * from './expression';
export * from './expressions/expression-helpers';
export * from './from-ai-parse-utils';
export * from './node-helpers';
export * from './tool-helpers';
export * from './node-reference-parser-utils';
export * from './metadata-utils';
export * from './workflow';
export * from './workflow-data-proxy';
export * from './workflow-data-proxy-env-provider';
export * from './versioned-node-type';
export * from './type-validation';
export * from './result';
export { LoggerProxy, NodeHelpers, ObservableObject, TelemetryHelpers };
export {
	isObjectEmpty,
	deepCopy,
	jsonParse,
	base64DecodeUTF8,
	jsonStringify,
	replaceCircularReferences,
	sleep,
	sleepWithAbort,
	fileTypeFromMimeType,
	assert,
	removeCircularRefs,
	updateDisplayOptions,
	randomInt,
	randomString,
	isSafeObjectProperty,
	setSafeObjectProperty,
	isDomainAllowed,
	isCommunityPackageName,
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
	isNodeConnectionType,
} from './type-guards';

export {
	parseExtractableSubgraphSelection,
	buildAdjacencyList,
	type ExtractableErrorResult,
	type ExtractableSubgraphData,
	type IConnectionAdjacencyList as AdjacencyList,
} from './graph/graph-utils';
export { ExpressionExtensions } from './extensions';
export * as ExpressionParser from './extensions/expression-parser';
export { NativeMethods } from './native-methods';
export * from './node-parameters/filter-parameter';
export * from './node-parameters/parameter-type-validation';
export * from './node-parameters/path-utils';
export * from './evaluation-helpers';

export type {
	DocMetadata,
	NativeDoc,
	DocMetadataArgument,
	DocMetadataExample,
	Extension,
} from './extensions';

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
