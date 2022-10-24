/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import path from 'path';
import type { INodeListSearchResult, INodePropertyOptions, INodeType, Workflow } from '.';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
export const deepCopy = <T>(source: T): T => {
	let clone: any;
	let i: any;
	const hasOwnProp = Object.prototype.hasOwnProperty.bind(source);
	// Primitives & Null
	if (typeof source !== 'object' || source === null) {
		return source;
	}
	// Date
	if (source instanceof Date) {
		return new Date(source.getTime()) as T;
	}
	// Array
	if (Array.isArray(source)) {
		clone = [];
		const len = source.length;
		for (i = 0; i < len; i++) {
			clone[i] = deepCopy(source[i]);
		}
		return clone;
	}
	// Object
	clone = {};
	for (i in source) {
		if (hasOwnProp(i)) {
			clone[i] = deepCopy((source as any)[i]);
		}
	}
	return clone;
};

/**
 * Requiring dist nodes
 */

type DistNodeModule = {
	[nodeClassName: string]: new () => {
		methods: {
			loadOptions?: { [methodName: string]: LoadOptionsMethod };
			listSearch?: { [methodName: string]: ListSearchMethod };
		};
		webhookMethods: { [key: string]: { [key: string]: Function } };
	};
};

type LoadOptionsMethod = () => Promise<INodePropertyOptions[]>;

type ListSearchMethod = (
	filter?: string,
	paginationToken?: string,
) => Promise<INodeListSearchResult>;

function getVersionedNodeFilePath(sourcePath: string, version: number | number[]) {
	if (Array.isArray(version)) return sourcePath;

	const { dir, base } = path.parse(sourcePath);
	const versionedNodeFilename = base.replace('.node.js', `V${version}.node.js`);

	return path.resolve(dir, `v${version}`, versionedNodeFilename);
}

export function requireDistNode(nodeType: INodeType, workflow: Workflow) {
	const sourcePath = workflow.nodeTypes.getSourcePath!(nodeType.description.name);

	const nodeFilePath =
		nodeType.description.defaultVersion !== undefined
			? getVersionedNodeFilePath(sourcePath, nodeType.description.version)
			: sourcePath;

	let _module;

	try {
		_module = require(nodeFilePath) as DistNodeModule;
	} catch (_) {
		throw new Error(`Failed to require node at ${sourcePath}`);
	}

	const nodeClassName = nodeFilePath.split('/').pop()?.split('.').shift();

	if (!nodeClassName) {
		throw new Error(`Failed to extract class name from ${nodeFilePath}`);
	}

	try {
		return new _module[nodeClassName]();
	} catch (error) {
		throw new Error(`Failed to instantiate node at ${sourcePath}`);
	}
}

/**
 * Parsing JSON
 */

type ErrorMessage = { errorMessage: string };
type FallbackValue<T> = { fallbackValue: T };

export const jsonParse = <T>(
	jsonString: string,
	options: ErrorMessage | FallbackValue<T> | {} = {},
): T => {
	try {
		return JSON.parse(jsonString) as T;
	} catch (error) {
		if ('fallbackValue' in options) {
			return options.fallbackValue;
		}
		if ('errorMessage' in options) {
			throw new Error(options.errorMessage);
		}
		throw error;
	}
};
