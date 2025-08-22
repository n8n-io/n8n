import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	INodeExecutionData,
	IPollFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { TriggerOptions } from './options/trigger.options';
import * as apiV3Methods from '../v2/methods';
import { pollTrigger } from './poll/trigger.poll';

export class NocoDBTriggerV1 implements INodeType {
	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			polling: true,
			version: 1,
			defaults: {
				name: 'NocoDB Trigger',
			},
			inputs: [],
			outputs: [NodeConnectionTypes.Main],
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
					type: 'hidden',
					default: 4,
				},
				...TriggerOptions,
			],
		};
	}
	description: INodeTypeDescription;
	methods = apiV3Methods;

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return await pollTrigger.call(this);
	}
}
