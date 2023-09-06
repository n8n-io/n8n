import type { INodeTypeDescription } from 'n8n-workflow';
import {
	baseDescription,
	operationProperties,
	fromFileProperties,
	toFileProperties,
	optionsProperties,
} from '../description';
import { oldVersionNotice } from '@utils/descriptions';

export const versionDescription: INodeTypeDescription = {
	...baseDescription,
	version: 1,
	properties: [
		oldVersionNotice,
		...operationProperties,
		...fromFileProperties,
		...toFileProperties,
		...optionsProperties,
	],
};
