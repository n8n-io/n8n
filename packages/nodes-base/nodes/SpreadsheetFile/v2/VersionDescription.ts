import type { INodeTypeDescription } from 'n8n-workflow';
import {
	baseDescription,
	operationProperties,
	fromFileProperties,
	toFileProperties,
	optionsProperties,
	fromFileV2Properties,
} from '../description';

export const versionDescription: INodeTypeDescription = {
	...baseDescription,
	version: 2,
	properties: [
		...operationProperties,
		...fromFileProperties,
		...fromFileV2Properties,
		...toFileProperties,
		...optionsProperties,
	],
};
