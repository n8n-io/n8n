// Types describing the onOffice API
export type OnOfficeAction = 'get' | 'read' | 'modify';
export type OnOfficeActionId = `urn:onoffice-de-ns:smart:2.5:smartml:action:${OnOfficeAction}`;
export type OnOfficeResource = 'estate' | 'address' | 'fields' | 'searchcriterias' | 'searchCriteriaFields';

export type OnOfficeResponseRecord<ElementType> = {
	id: string;
	type: OnOfficeResource;
	elements: ElementType;
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
export type OnOfficeActionResponseSuccess<ElementType> = {
	data: {
		meta: Record<string, unknown>;
		records: Array<OnOfficeResponseRecord<ElementType>>;
	};
	status: OnOfficeSuccessStatus;
} & OnOfficeActionResponseBase;
export type OnOfficeActionResponse<ElementType> = OnOfficeActionResponseError | OnOfficeActionResponseSuccess<ElementType>;

export type OnOfficeResponseSuccess<ElementType> = {
	status: { code: 200 } & OnOfficeSuccessStatus;
	response: { results: Array<OnOfficeActionResponse<ElementType>> };
};
export type OnOfficeResponseNoAuth = {
	status: { code: 400 | 401 } & OnOfficeErrorStatus;
	response: { results: OnOfficeActionResponseError[] };
};
export type OnOfficeResponseError<ElementType> = {
	status: { code: 500 } & OnOfficeErrorStatus;
	response: { results: Array<OnOfficeActionResponse<ElementType>> };
};
export type OnOfficeResponse<ElementType> =
	| OnOfficeResponseSuccess<ElementType>
	| OnOfficeResponseNoAuth
	| OnOfficeResponseError<ElementType>;

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

export type OnOfficeReadAdditionalFields = {
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
};
export type OnOfficeReadAdditionalFieldName = keyof OnOfficeReadAdditionalFields;

export type OnOfficeFieldConfiguration<IncludeLabels extends boolean = false> = Record<string, OnOfficeFieldType<IncludeLabels>> & (IncludeLabels extends true ? { label: string } : {});
export type OnOfficeFieldValueType = 'multiselect' | 'singleselect' | 'varchar' | 'integer' | 'date' | 'text' | 'float' | 'boolean'

export type OnOfficeFieldType<IncludeLabels extends boolean = false> = {
	type: OnOfficeFieldValueType;
	/** Only set for type = `varchar` */
	length: null | number;
	/** If the field is no select, this is empty */
	/** This can only be Record<string, string> if includeLabels was set */
	permittedvalues: null | (IncludeLabels extends true ? Record<string, string> : string[]);
	default: null | string;
	/** If the field is no compound field, this is empty */
	compoundFields: string[];
	/** Label is only present, if includeLabels was set */
	label: (IncludeLabels extends true ? string : undefined);
}