import type { INodePropertyOptions } from 'n8n-workflow';

// Disable some charts that use different datasets for now
export const CHART_TYPE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Bar Chart',
		value: 'bar',
	},
	// {
	// 	name: 'Boxplot',
	// 	value: 'boxplot',
	// },
	// {
	// 	name: 'Bubble Chart',
	// 	value: 'bubble',
	// },
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
	// {
	// 	name: 'Radar Chart',
	// 	value: 'radar',
	// },
	// {
	// 	name: 'Radial Gauge',
	// 	value: 'radialGauge',
	// },
	// {
	// 	name: 'Scatter Chart',
	// 	value: 'scatter',
	// },
	// {
	// 	name: 'Sparkline',
	// 	value: 'sparkline',
	// },
	// {
	// 	name: 'Violin Chart',
	// 	value: 'violin',
	// },
];

export const HORIZONTAL_CHARTS = ['bar', 'boxplot', 'violin'];
export const ITEM_STYLE_CHARTS = ['boxplot', 'horizontalBoxplot', 'violin', 'horizontalViolin'];
export const Fill_CHARTS = ['line'];
export const POINT_STYLE_CHARTS = ['line'];
