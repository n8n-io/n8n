export type Resource = 'endOfDayData' | 'exchange' | 'ticker';

export type Operation = 'get' | 'getAll';

export type EndOfDayDataFilters = {
	latest?: boolean;
	sort?: 'ASC' | 'DESC';
	specificDate?: string;
	dateFrom?: string;
	dateTo?: string;
	exchange?: string;
};
