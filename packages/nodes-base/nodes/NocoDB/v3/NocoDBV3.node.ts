/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as apiV3Methods from '../helpers/apiV3Methods';
import { BaseOptions } from './options/base.options';
import { RowsOptions } from './options/rows.options';
import { V0200Execute } from './v_0200_execute';
import { V0240Executor } from './v_0240_executor';

export class NocoDBV3 implements INodeType {
	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			defaults: {
				name: 'NocoDB',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			version: [4],
			credentials: [
				{
					name: 'nocoDb',
					required: true,
					displayOptions: {
						show: {
							authentication: ['nocoDb'],
						},
					},
				},
				{
					name: 'nocoDbApiToken',
					required: true,
					displayOptions: {
						show: {
							authentication: ['nocoDbApiToken'],
						},
					},
				},
			],
			properties: [
				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					options: [
						{
							name: 'API Token',
							value: 'nocoDbApiToken',
						},
						{
							name: 'User Token',
							value: 'nocoDb',
						},
					],
					default: 'nocoDb',
				},
				{
					displayName: 'API Version Name or ID',
					name: 'version',
					type: 'options',
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					isNodeSetting: true,
					typeOptions: {
						loadOptionsDependsOn: ['resource', 'operation'],
						loadOptionsMethod: 'getApiVersions',
					},
					// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-options
					default: 4,
				},
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Row',
							value: 'row',
						},
						{
							name: 'Base',
							value: 'base',
						},
					],
					default: 'row',
				},
				...RowsOptions,
				...BaseOptions,
			],
		};
	}

	methods = apiV3Methods;

	description: INodeTypeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const version = this.getNodeParameter('version', 0) as number;

		if (version === 4) {
			const executor = new V0240Executor(this);
			return executor.execute();
		} else {
			return V0200Execute(this);
		}
	}
}
