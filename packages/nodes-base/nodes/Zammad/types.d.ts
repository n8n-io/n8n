import {
	IDataObject,
} from 'n8n-workflow';

export declare namespace Zammad {
	export type Resource = 'group' | 'organization' | 'priority' | 'tag' | 'ticket' | 'user';

	export type AuthMethod = 'basicAuth' | 'tokenAuth' | 'oAuth2';

	type CredentialsBase = {
		baseUrl: string;
		allowUnauthorizedCerts: boolean;
	}

	export type BasicAuthCredentials = CredentialsBase & { username: string; password: string; };
	export type TokenAuthCredentials = CredentialsBase & { apiKey: string; };
	export type OAuth2Credentials = CredentialsBase;

	export type UserAdditionalFields = IDataObject & Zammad.CustomFieldsUi & Zammad.AddressUi;
	export type UserUpdateFields = UserAdditionalFields;
	export type UserFilterFields = IDataObject & Zammad.SortUi;

	export type Organization = {
		id: number;
		name: string;
	};

	export type User = {
		id: number;
		login: string;
		lastname: string;
		email: string;
	};

	export type Field = {
		display: string;
		name: string;
		object: string;
		created_by_id: number;
	};

	export type UserField = {
		display: string;
		name: string;
	};

	export type CustomFieldsUi = {
		customFieldsUi?: {
			customFieldPairs: Array<{ name: string, value: string }>;
		};
	};

	export type SortUi = {
		sortUi?: {
			sortDetails: {
				sort_by: string;
				order_by: string;
			};
		};
	};

	export type AddressUi = {
		addressUi?: {
			addressDetails: {
				city: string;
				country: string;
				street: string;
				zip: string;
			};
		}
	}
}
