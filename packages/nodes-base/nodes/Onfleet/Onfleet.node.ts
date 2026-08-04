import {
	type IExecuteFunctions,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type INodeCredentialTestResult,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IRequestOptions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { adminFields, adminOperations } from './descriptions/AdministratorDescription';
import { containerFields, containerOperations } from './descriptions/ContainerDescription';
import { destinationFields, destinationOperations } from './descriptions/DestinationDescription';
import { hubFields, hubOperations } from './descriptions/HubDescription';
import { organizationFields, organizationOperations } from './descriptions/OrganizationDescription';
import { recipientFields, recipientOperations } from './descriptions/RecipientDescription';
import { taskFields, taskOperations } from './descriptions/TaskDescription';
import { teamFields, teamOperations } from './descriptions/TeamDescription';
import { workerFields, workerOperations } from './descriptions/WorkerDescription';
import { resourceLoaders } from './GenericFunctions';
import { Onfleet as OnfleetMethods } from './Onfleet';
export class Onfleet implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Onfleet',
		name: 'onfleet',
		icon: 'file:Onfleet.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Onfleet API',
		defaults: {
			name: 'Onfleet',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'onfleetApi',
				required: true,
				testedBy: 'onfleetApiTest',
			},
		],
		properties: [
			// List of option resources
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Admin',
						value: 'admin',
					},
					{
						name: 'Container',
						value: 'container',
					},
					{
						name: 'Destination',
						value: 'destination',
					},
					{
						name: 'Hub',
						value: 'hub',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Recipient',
						value: 'recipient',
					},
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'Team',
						value: 'team',
					},
					// {
					// 	name: 'Webhook',
					// 	value: 'webhook',
					// },
					{
						name: 'Worker',
						value: 'worker',
					},
				],
				default: 'task',
				description: 'The resource to perform operations on',
			},
			// Operations & fields
			...adminOperations,
			...adminFields,
			...containerOperations,
			...containerFields,
			...destinationOperations,
			...destinationFields,
			...hubOperations,
			...hubFields,
			...organizationOperations,
			...organizationFields,
			...recipientOperations,
			...recipientFields,
			...taskOperations,
			...taskFields,
			...teamOperations,
			...teamFields,
			// ...webhookOperations,
			// ...webhookFields,
			...workerOperations,
			...workerFields,
		],
	};

	methods = {
		credentialTest: {
			async onfleetApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;

				const options: IRequestOptions = {
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'n8n-onfleet',
					},
					auth: {
						user: credentials.apiKey as string,
						pass: '',
					},
					method: 'GET',
					uri: 'https://onfleet.com/api/v2/auth/test',
					json: true,
				};

				try {
					await this.helpers.request(options);
					return {
						status: 'OK',
						message: 'Authentication successful',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: `Auth settings are not valid: ${error}`,
					};
				}
			},
		},
		loadOptions: resourceLoaders,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const items = this.getInputData();

		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		const operations: { [key: string]: Function } = {
			task: OnfleetMethods.executeTaskOperations,
			destination: OnfleetMethods.executeDestinationOperations,
			organization: OnfleetMethods.executeOrganizationOperations,
			admin: OnfleetMethods.executeAdministratorOperations,
			recipient: OnfleetMethods.executeRecipientOperations,
			hub: OnfleetMethods.executeHubOperations,
			worker: OnfleetMethods.executeWorkerOperations,
			webhook: OnfleetMethods.executeWebhookOperations,
			container: OnfleetMethods.executeContainerOperations,
			team: OnfleetMethods.executeTeamOperations,
		};

		const responseData = await operations[resource].call(this, `${resource}s`, operation, items);

		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData as IDataObject)];
	}
}
