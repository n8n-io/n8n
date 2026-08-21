import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import {
	getTeams as loadTeams,
	getUsers as loadUsers,
	getStates,
	getLabels as loadLabels,
	getProjects,
	getCycles,
} from '../shared/methods/loadOptions';
import {
	getInitiatives,
	getProjects as searchProjects,
	getCustomers,
	getIssues,
	getTeams as searchTeams,
	getUsers as searchUsers,
	getStates as searchStates,
	getLabels as searchLabels,
	getCycles as searchCycles,
	getDocuments,
	getReleases,
	getViews,
} from '../shared/methods/listSearch';
import { validateCredentials } from '../shared/GenericFunctions';

export class LinearV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
			usableAsTool: true,
		};
	}

	methods = {
		credentialTest: {
			async linearApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					await validateCredentials.call(this, credential.data as ICredentialDataDecryptedObject);
				} catch (error) {
					const apiErrors = (
						error as { error?: { errors?: Array<{ extensions?: { code?: string } }> } }
					)?.error?.errors;
					const isAuthError =
						apiErrors?.some((e) => e?.extensions?.code === 'AUTHENTICATION_ERROR') ?? false;
					if (isAuthError) {
						return {
							status: 'Error',
							message: 'The security token included in the request is invalid',
						};
					}
					throw error;
				}

				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
		loadOptions: {
			// Kept for multi-select fields (label IDs, subscriber IDs, team IDs), which
			// resource locators can't express — they hold a single value.
			getTeams: loadTeams,
			getUsers: loadUsers,
			getStates,
			getLabels: loadLabels,
			getProjects,
			getCycles,
		},
		listSearch: {
			getInitiatives,
			getProjects: searchProjects,
			getCustomers,
			getIssues,
			getTeams: searchTeams,
			getUsers: searchUsers,
			getStates: searchStates,
			getLabels: searchLabels,
			getCycles: searchCycles,
			getDocuments,
			getReleases,
			getViews,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
