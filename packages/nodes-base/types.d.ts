import type { StrapiApiCredential } from './credentials/StrapiApi.credentials';
import type { StrapiTokenApiCredential } from './credentials/StrapiTokenApi.credentials';

type CredentialSchemaMap = {
	strapiApi: StrapiApiCredential;
	strapiTokenApi: StrapiTokenApiCredential;
};

declare module 'n8n-workflow' {
	interface FunctionsBase {
		getCredentials<Type extends keyof CredentialSchemaMap | {}>(
			type: Type,
			itemIndex?: number,
		): Promise<
			Type extends keyof CredentialSchemaMap
				? CredentialSchemaMap[Type]
				: ICredentialDataDecryptedObject
		>;
	}
}
