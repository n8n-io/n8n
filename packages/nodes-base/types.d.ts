import type { FtpCredentialSchema } from './credentials/Ftp.credentials';
import type { SftpCredentialSchema } from './credentials/Sftp.credentials';
import type { StrapiApiCredential } from './credentials/StrapiApi.credentials';
import type { StrapiTokenApiCredential } from './credentials/StrapiTokenApi.credentials';

type CredentialSchemaMap = {
	strapiApi: StrapiApiCredential;
	strapiTokenApi: StrapiTokenApiCredential;
	ftp: FtpCredentialSchema;
	sftp: SftpCredentialSchema;
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
