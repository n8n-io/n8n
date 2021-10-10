export interface IData {
	viewId: string;
	dimensions?: IDimension[];
	dimensionFilterClauses?: {
		filters: IDimensionFilter[];
	};
	pageSize?: number;
	metrics?: IMetric[];
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
