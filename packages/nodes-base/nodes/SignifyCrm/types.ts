// ----------------------------------------
//          for generic functions
// ----------------------------------------

type Resource =
	| 'account'
	| 'contact'
	| 'lead'
    | 'opportunity'
    | 'case'
    | 'task';

export type CamelCaseResource = Resource | 'getEntry' | 'setEntry';

export type GetAllFilterOptions = {
	fields: string[];
	[otherOptions: string]: unknown;
};

// ----------------------------------------
//               for auth
// ----------------------------------------

export type SignifyCrmApiCredentials = {
	oauthTokenData: {
		api_domain: string;
	};
};