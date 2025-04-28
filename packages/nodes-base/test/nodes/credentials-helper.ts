import { Container, Service } from '@n8n/di';
import { Credentials } from 'n8n-core';
import { ICredentialsHelper } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { CredentialTypes } from './credential-types';

@Service()
export class CredentialsHelper extends ICredentialsHelper {
	private credentialsMap: Record<string, ICredentialDataDecryptedObject> = {};

	setCredentials(credentialsMap: Record<string, ICredentialDataDecryptedObject>) {
		this.credentialsMap = credentialsMap;
	}

	getCredentialsProperties() {
		return [];
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestParams: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const credentialType = Container.get(CredentialTypes).getByName(typeName);
		if (typeof credentialType.authenticate === 'function') {
			return await credentialType.authenticate(credentials, requestParams);
		}
		return requestParams;
	}

	async preAuthentication(
		_helpers: IHttpRequestHelper,
		_credentials: ICredentialDataDecryptedObject,
		_typeName: string,
		_node: INode,
		_credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		return undefined;
	}

	getParentTypes(_name: string): string[] {
		return [];
	}

	async getDecrypted(
		_additionalData: IWorkflowExecuteAdditionalData,
		_nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentialDataDecryptedObject> {
		return this.credentialsMap[type] ?? {};
	}

	async getCredentials(
		_nodeCredentials: INodeCredentialsDetails,
		_type: string,
	): Promise<Credentials> {
		return new Credentials({ id: null, name: '' }, '', '');
	}

	async updateCredentials(
		_nodeCredentials: INodeCredentialsDetails,
		_type: string,
		_data: ICredentialDataDecryptedObject,
	): Promise<void> {}
}
