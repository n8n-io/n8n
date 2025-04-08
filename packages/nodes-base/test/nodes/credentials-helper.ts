import { Container, Service } from '@n8n/di';
import { Credentials } from 'n8n-core';
import { ICredentialsHelper } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { CredentialTypes } from './credential-types';
import { FAKE_CREDENTIALS_DATA } from './FakeCredentialsMap';

@Service()
export class CredentialsHelper extends ICredentialsHelper {
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
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentialDataDecryptedObject> {
		return this.getFakeDecryptedCredentials(nodeCredentials, type);
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

	private getFakeDecryptedCredentials(nodeCredentials: INodeCredentialsDetails, type: string) {
		const credentialsMap = FAKE_CREDENTIALS_DATA as IDataObject;
		if (nodeCredentials && credentialsMap[JSON.stringify(nodeCredentials)]) {
			return credentialsMap[JSON.stringify(nodeCredentials)] as ICredentialDataDecryptedObject;
		}

		if (type && credentialsMap[type]) {
			return credentialsMap[type] as ICredentialDataDecryptedObject;
		}

		return {};
	}
}
