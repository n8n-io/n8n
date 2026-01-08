import type { INodeProperties } from 'n8n-workflow';
import { properties as listProperties } from './list.operation';
import { properties as createProperties } from './create.operation';
import { properties as getProperties } from './get.operation';

export const properties: INodeProperties[] = [
	...listProperties,
	...createProperties,
	...getProperties,
];
