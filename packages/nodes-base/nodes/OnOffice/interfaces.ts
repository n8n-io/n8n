// Types describing the onOffice API
export type OnOfficeAction = 'get' | 'read';
export type OnOfficeActionId = `urn:onoffice-de-ns:smart:2.5:smartml:action:${OnOfficeAction}`;
export type OnOfficeResource = 'estate' | 'address' | 'fields';

export type OnOfficeResponseRecord = {
	id: string;
	type: OnOfficeResource;
	elements: Record<string, unknown> | Array<Record<string, unknown>>;
};

export type OnOfficeErrorStatus = {
	errorcode: number;
	message?: string;
};
export type OnOfficeSuccessStatus = {
	errorcode: 0;
	message?: string;
};

export type OnOfficeActionResponseBase = {
	actionId: OnOfficeActionId;
	resourceId: string;
	resourceType: OnOfficeResource;
	cachable: boolean;
	identifier: string;
};
export type OnOfficeActionResponseError = {
	cachable: false;
	data: never[];
	status: OnOfficeErrorStatus;
} & OnOfficeActionResponseBase;
export type OnOfficeActionResponseSuccess = {
	data: {
		meta: Record<string, unknown>;
		records: OnOfficeResponseRecord[];
	};
	status: OnOfficeSuccessStatus;
} & OnOfficeActionResponseBase;
export type OnOfficeActionResponse = OnOfficeActionResponseError | OnOfficeActionResponseSuccess;

export type OnOfficeResponseSuccess = {
	status: { code: 200 } & OnOfficeSuccessStatus;
	response: { results: OnOfficeActionResponse[] };
};
export type OnOfficeResponseNoAuth = {
	status: { code: 400 | 401 } & OnOfficeErrorStatus;
	response: { results: OnOfficeActionResponseError[] };
};
export type OnOfficeResponseError = {
	status: { code: 500 } & OnOfficeErrorStatus;
	response: { results: OnOfficeActionResponse[] };
};
export type OnOfficeResponse =
	| OnOfficeResponseSuccess
	| OnOfficeResponseNoAuth
	| OnOfficeResponseError;

// Types describing the n8n descriptions
export type OnOfficeReadFilterOperator =
	| 'is'
	| 'or'
	| 'equal'
	| 'greater'
	| 'less'
	| 'greaterequal'
	| 'lessequal'
	| 'notequal'
	| 'between'
	| 'like'
	| 'notlike'
	| 'in'
	| 'notin';

export type OnOfficeReadFilterConfiguration = {
	filter: Array<{
		field: string;
		operations: { operation: Array<{ operator: OnOfficeReadFilterOperator; value: string }> };
	}>;
};

export interface OnOfficeReadAdditionalFields {
	recordIds?: string[];
	filterId?: number;
	filters?: OnOfficeReadFilterConfiguration;
	limit?: number;
	offset?: number;
	sortBy?: string;
	order?: 'ASC' | 'DESC';
	formatOutput?: boolean;
	language?: 'DEU';
	countryIsoCodeType?: '' | 'ISO-3166-2' | 'ISO-3166-3';
	estateLanguage?: string;
	addEstateLanguage?: boolean;
	addMainLangId?: boolean;
	geoRangeSearch?: { country: string; radius: number; zip?: number };
}
