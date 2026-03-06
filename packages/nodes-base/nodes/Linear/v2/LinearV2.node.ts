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
	IDataObject,
} from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import {
	getTeams,
	getUsers,
	getStates,
	getLabels,
	getProjects,
	getCycles,
} from '../shared/methods/loadOptions';
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
			getTeams,
			getUsers,
			getStates,
			getLabels,
			getProjects,
			getCycles,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
