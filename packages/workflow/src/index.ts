import * as LoggerProxy from './logger-proxy';
import * as NodeHelpers from './node-helpers';
import * as ObservableObject from './observable-object';

export * from './common';
export * from './constants';
export * from './cron';
export * from './data-table.types';
export * from './deferred-promise';
export * from './errors';
export * from './execution-status';
export * from './expression';
export * from './expressions/expression-helpers';
export * from './from-ai-parse-utils';
export * from './global-state';
export * from './interfaces';
export * from './message-event-bus';
export * from './metadata-utils';
export * from './node-helpers';
export * from './node-reference-parser-utils';
export * from './result';
export * from './tool-helpers';
export {
	isFilterValue,
	isINodeProperties,
	isINodePropertiesList,
	isINodePropertyCollection,
	isINodePropertyCollectionList,
	isINodePropertyOptions,
	isINodePropertyOptionsList,
	isNodeConnectionType,
	isResourceLocatorValue,
	isResourceMapperValue,
} from './type-guards';
export * from './type-validation';
export {
	assert,
	base64DecodeUTF8,
	deepCopy,
	fileTypeFromMimeType,
	isCommunityPackageName,
	isDomainAllowed,
	isObjectEmpty,
	isSafeObjectProperty,
	jsonParse,
	jsonStringify,
	randomInt,
	randomString,
	removeCircularRefs,
	replaceCircularReferences,
	setSafeObjectProperty,
	sleep,
	sleepWithAbort,
	updateDisplayOptions,
} from './utils';
export * from './versioned-node-type';
export * from './workflow';
export * from './workflow-data-proxy';
export * from './workflow-data-proxy-env-provider';
export { LoggerProxy, NodeHelpers, ObservableObject };

export * from './evaluation-helpers';
export { ExpressionExtensions } from './extensions';
export * as ExpressionParser from './extensions/expression-parser';
export {
	buildAdjacencyList,
	parseExtractableSubgraphSelection,
	type IConnectionAdjacencyList as AdjacencyList,
	type ExtractableErrorResult,
	type ExtractableSubgraphData,
} from './graph/graph-utils';
export { NativeMethods } from './native-methods';
export * from './node-parameters/filter-parameter';
export * from './node-parameters/parameter-type-validation';
export * from './node-parameters/path-utils';

export type {
	DocMetadata,
	DocMetadataArgument,
	DocMetadataExample,
	Extension,
	NativeDoc,
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
