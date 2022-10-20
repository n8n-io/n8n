/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import path from 'path';
import { INodeType, Workflow } from '.';

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
// eslint-enable

// @TODO: De-duplicate, original in core

type NodeModule = {
	[className: string]: new () => {
		methods: { [key: string]: { [key: string]: Function } };
		webhookMethods: { [key: string]: { [key: string]: Function } };
	};
};

function getVersionedNodeFilePath(sourcePath: string, version: number | number[]) {
	if (Array.isArray(version)) return sourcePath;

	const { dir, base } = path.parse(sourcePath);
	const versionedNodeFilename = base.replace('.node.js', `V${version}.node.js`);

	return path.resolve(dir, `v${version}`, versionedNodeFilename);
}

export function requireDistNode(nodeType: INodeType, workflow: Workflow) {
	const sourcePath = workflow.nodeTypes.getSourcePath(nodeType.description.name);

	const nodeFilePath =
		nodeType.description.defaultVersion !== undefined
			? getVersionedNodeFilePath(sourcePath, nodeType.description.version)
			: sourcePath;

	let _module;

	try {
		_module = require(nodeFilePath) as NodeModule;
	} catch (_) {
		throw new Error(`Failed to require node at ${sourcePath}`);
	}

	const _className = nodeFilePath.split('/').pop()?.split('.').shift();

	if (!_className) {
		throw new Error(`Failed to find class in node at ${nodeFilePath}`);
	}

	try {
		return new _module[_className]();
	} catch (error) {
		throw new Error(`Failed to instantiate node at ${sourcePath}`);
	}
}
