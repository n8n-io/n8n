/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	INodeExecutionData,
	IPollFunctions,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { TriggerOptions } from './options/trigger.options';
import * as apiV3Methods from '../helpers/apiV3Methods';
import { poll_trigger } from './poll/trigger.poll';

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
	poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return poll_trigger.call(this);
	}
}
