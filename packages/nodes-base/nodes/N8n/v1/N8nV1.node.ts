import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { auditFields, auditOperations } from './AuditDescription';
import { credentialFields, credentialOperations } from './CredentialDescription';
import { executionFields, executionOperations } from './ExecutionDescription';
import { projectFields, projectOperations } from './ProjectDescription';
import { workflowFields, workflowOperations } from './WorkflowDescription';
import { searchWorkflows } from '../shared/WorkflowLocator';

export class N8nV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: 'n8n',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'n8nApi',
					required: true,
				},
			],
			requestDefaults: {
				returnFullResponse: true,
				baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
			},
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Audit',
							value: 'audit',
						},
						{
							name: 'Credential',
							value: 'credential',
						},
						{
							name: 'Execution',
							value: 'execution',
						},
						{
							name: 'Project',
							value: 'project',
						},
						{
							name: 'Workflow',
							value: 'workflow',
						},
					],
					default: 'workflow',
				},

				...auditOperations,
				...auditFields,

				...credentialOperations,
				...credentialFields,

				...executionOperations,
				...executionFields,

				...projectOperations,
				...projectFields,

				...workflowOperations,
				...workflowFields,
			],
		};
	}

	methods = {
		listSearch: {
			// Provide workflows search capability for the workflow resourceLocator
			searchWorkflows,
		},
	};
}
