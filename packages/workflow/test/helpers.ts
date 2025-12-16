import { readFileSync } from 'fs';
import path from 'path';

import { NodeTypes as NodeTypesClass } from './node-types';
import type { INodeTypes } from '../src/interfaces';

let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(): INodeTypes {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}
	return nodeTypesInstance;
}

const BASE_DIR = path.resolve(__dirname, '..');
export const readJsonFileSync = <T>(filePath: string) =>
	JSON.parse(readFileSync(path.join(BASE_DIR, filePath), 'utf-8')) as T;
