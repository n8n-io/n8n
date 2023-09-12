import type { INodePropertyOptions } from 'n8n-workflow';

// Disable some charts that use different datasets for now
export const CHART_TYPE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Bar Chart',
		value: 'bar',
	},
	{
		name: 'Doughnut Chart',
		value: 'doughnut',
	},
	{
		name: 'Line Chart',
		value: 'line',
	},
	{
		name: 'Pie Chart',
		value: 'pie',
	},
	{
		name: 'Polar Chart',
		value: 'polarArea',
	},
];

export const HORIZONTAL_CHARTS = ['bar', 'boxplot', 'violin'];
export const ITEM_STYLE_CHARTS = ['boxplot', 'horizontalBoxplot', 'violin', 'horizontalViolin'];
export const Fill_CHARTS = ['line'];
export const POINT_STYLE_CHARTS = ['line'];
