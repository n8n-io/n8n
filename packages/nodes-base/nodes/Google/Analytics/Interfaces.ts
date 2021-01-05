export interface IData {
	viewId: string;
	dimensions?: IDimension[];
	pageSize?: number;
	metrics?: IMetric[];
}

export interface IDimension {
	name?: string;
	histogramBuckets?: string[];
}

export interface IMetric {
	expression?: string;
	alias?: string;
	formattingType?: string;
}
