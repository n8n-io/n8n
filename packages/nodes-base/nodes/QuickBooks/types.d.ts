import type { IDataObject } from 'n8n-workflow';

export type QuickBooksOAuth2Credentials = {
	environment: 'production' | 'sandbox';
	oauthTokenData: {
		callbackQueryString: {
			realmId: string;
		};
	};
};

export type DateFieldsUi = Partial<{
	dateRangeCustom: DateFieldUi;
	dateRangeDueCustom: DateFieldUi;
	dateRangeModificationCustom: DateFieldUi;
	dateRangeCreationCustom: DateFieldUi;
}>;

type DateFieldUi = {
	[key: string]: {
		[key: string]: string;
	};
};

export type TransactionFields = Partial<{
	columns: string[];
	memo: string[];
	term: string[];
	customer: string[];
	vendor: string[];
}> &
	DateFieldsUi &
	IDataObject;

export type Option = { name: string; value: string };

export type TransactionReport = {
	Columns: {
		Column: Array<{
			ColTitle: string;
			ColType: string;
		}>;
	};
	Rows: {
		Row: Array<{
			ColData: Array<{ value: string }>;
		}>;
	};
};
