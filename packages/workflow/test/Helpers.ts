import { readFileSync } from 'fs';
import path from 'path';

import type { INodeTypes } from '@/Interfaces';

import { NodeTypes as NodeTypesClass } from './NodeTypes';

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
