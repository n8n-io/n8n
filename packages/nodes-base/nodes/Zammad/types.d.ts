export type CustomFields = {
	fields: Array<{
		[key: string]: string;
	}>;
};

export type Permissions = {
	fields: Array<{
		[permission: string]: string;
	}>;
};

export type Field = {
	[name: string]: string;
};

type ZammadCredentialsBaseProperties = {
	domain: string;
	allowUnauthorizedCerts: boolean;
}

export type ZammadBasicAuthCredentials = {
	username: string;
	password: string;
} & ZammadCredentialsBaseProperties;

export type ZammadTokenAuthCredentials = {
	apiKey: string;
} & ZammadCredentialsBaseProperties;

export type ZammadOAuth2Credentials = ZammadCredentialsBaseProperties;


export type ZammadAuthMethod = 'basicAuth' | 'tokenAuth' | 'oAuth2';
