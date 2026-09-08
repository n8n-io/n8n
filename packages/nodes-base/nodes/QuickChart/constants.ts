import type { INodePropertyOptions } from 'n8n-workflow';

// Disable some charts that use different datasets for now
export const CHART_TYPE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Bar chart',
		value: 'bar',
	},
	{
		name: 'Doughnut chart',
		value: 'doughnut',
	},
	{
		name: 'Line chart',
		value: 'line',
	},
	{
		name: 'Pie chart',
		value: 'pie',
	},
	{
		name: 'Polar chart',
		value: 'polarArea',
	},
];

export const HORIZONTAL_CHARTS = ['bar', 'boxplot', 'violin'];
export const ITEM_STYLE_CHARTS = ['boxplot', 'horizontalBoxplot', 'violin', 'horizontalViolin'];
export const Fill_CHARTS = ['line'];
export const POINT_STYLE_CHARTS = ['line'];
