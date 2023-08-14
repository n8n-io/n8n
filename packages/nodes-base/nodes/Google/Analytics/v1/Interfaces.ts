import type { IDataObject } from 'n8n-workflow';

export interface IData {
	viewId: string;
	dimensions?: IDimension[];
	dimensionFilterClauses?: {
		filters: IDimensionFilter[];
	};
	pageSize?: number;
	metrics?: IMetric[];
	dateRanges?: IDataObject[];
}

export interface IDimension {
	name?: string;
	histogramBuckets?: string[];
}

export interface IDimensionFilter {
	dimensionName?: string;
	operator?: string;
	expressions?: string[];
}
export interface IMetric {
	expression?: string;
	alias?: string;
	formattingType?: string;
}
