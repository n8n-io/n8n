import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { activityFields, activityOperations } from './ActivityDescription';
import { memberFields, memberOperations } from './MemberDescription';
import { noteFields, noteOperations } from './NoteDescription';
import { postFields, postOperations } from './PostDescription';

export class Orbit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Orbit',
		name: 'orbit',
		icon: { light: 'file:orbit.svg', dark: 'file:orbit.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Orbit API',
		hidden: true,
		defaults: {
			name: 'Orbit',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'orbitApi',
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'Orbit has been shutdown and will no longer function from July 11th, You can read more <a target="_blank" href="https://orbit.love/blog/orbit-is-joining-postman">here</a>.',
				name: 'deprecated',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Activity',
						value: 'activity',
					},
					{
						name: 'Member',
						value: 'member',
					},
					{
						name: 'Note',
						value: 'note',
					},
					{
						name: 'Post',
						value: 'post',
					},
				],
				default: 'member',
			},
			// ACTIVITY
			...activityOperations,
			...activityFields,
			// MEMBER
			...memberOperations,
			...memberFields,
			// NOTE
			...noteOperations,
			...noteFields,
			// POST
			...postOperations,
			...postFields,
		],
	};

	methods = {
		loadOptions: {
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [{ name: 'Deprecated', value: 'Deprecated' }];
			},
			async getActivityTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [{ name: 'Deprecated', value: 'Deprecated' }];
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		throw new NodeApiError(this.getNode(), {
			message: 'Service is deprecated, From July 11th Orbit will no longer function.',
			level: 'warning',
		});
	}
}
