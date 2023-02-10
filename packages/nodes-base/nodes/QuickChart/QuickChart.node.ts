import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { CHART_TYPE_OPTIONS, HORIZONTAL_CHARTS, ITEM_STYLE_CHARTS } from './constants';
import type { IDataset } from './types';

import _ from 'lodash';
export class QuickChart implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'QuickChart',
		name: 'quickChart',
		icon: 'file:quickChart.svg',
		group: ['output'],
		description: 'Create a chart via QuickChart',
		version: 1,
		defaults: {
			name: 'QuickChart',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Chart Type',
				name: 'chartType',
				type: 'options',
				default: 'bar',
				options: CHART_TYPE_OPTIONS,
				description: 'The type of chart to create',
			},
			{
				displayName: 'Horizontal',
				name: 'horizontal',
				type: 'boolean',
				default: false,
				description: 'Whether the chart should use its Y axis horizontal',
				displayOptions: {
					show: {
						chartType: HORIZONTAL_CHARTS,
					},
				},
			},
			{
				displayName: 'X Labels',
				name: 'labelsUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				required: true,
				description: 'Labels to use for the X Axis of the chart',
				placeholder: 'Add Label',
				options: [
					{
						name: 'labelsValues',
						displayName: 'Labels',
						values: [
							{
								displayName: 'Label',
								name: 'label',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'json',
				default: '',
				description: 'Data to use for the dataset',
				placeholder: '[60, 10, 12, 20]',
				required: true,
			},
			{
				displayName: 'Put Output In Field',
				name: 'output',
				type: 'string',
				default: 'data',
				required: true,
				description: 'The name of the output field to put the binary file data in',
			},
			{
				displayName: 'Chart Options',
				name: 'chartOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Background Color',
						name: 'backgroundColor',
						type: 'color',
						typeOptions: {
							showAlpha: true,
						},
						default: '',
						description: 'Background color of the chart',
					},
					{
						displayName: 'Device Pixel Ratio',
						name: 'devicePixelRatio',
						type: 'number',
						default: 2,
						typeOptions: {
							numberPrecision: 2,
						},
						description: 'Pixel ratio of the chart',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						default: 'png',
						description: 'File format of the resulting chart',
						options: [
							{
								name: 'PNG',
								value: 'png',
							},
							{
								name: 'PDF',
								value: 'pdf',
							},
							{
								name: 'SVG',
								value: 'svg',
							},
							{
								name: 'WebP',
								value: 'webp',
							},
						],
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						default: 300,
						description: 'Height of the chart',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: 500,
						description: 'Width of the chart',
					},
				],
			},
			{
				displayName: 'Dataset Options',
				name: 'datasetOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Background Color',
						name: 'backgroundColor',
						type: 'color',
						default: '',
						typeOptions: {
							showAlpha: true,
						},
						description:
							'Color used for the background the dataset (area of a line graph, fill of a bar chart, etc.)',
					},
					{
						displayName: 'Border Color',
						name: 'borderColor',
						type: 'color',
						typeOptions: {
							showAlpha: true,
						},
						default: '',
						description: 'Color used for lines of the dataset',
					},
					{
						displayName: 'Chart Type',
						name: 'chartType',
						type: 'options',
						default: 'bar',
						options: CHART_TYPE_OPTIONS,
						description: 'The type of chart to use for the dataset',
					},
					{
						displayName: 'Fill',
						name: 'fill',
						type: 'boolean',
						default: true,
						description: 'Whether to fill area of the dataset',
					},
					{
						displayName: 'Font Color',
						name: 'fontColor',
						type: 'color',
						typeOptions: {
							showAlpha: true,
						},
						default: '',
						description: 'Color used for the text the dataset',
					},
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						description: 'The label of the dataset',
					},
					{
						displayName: 'Point Style',
						name: 'pointStyle',
						type: 'options',
						default: 'circle',
						description: 'Style to use for points of the dataset',
						options: [
							{
								name: 'Circle',
								value: 'circle',
							},
							{
								name: 'Cross',
								value: 'cross',
							},
							{
								name: 'CrossRot',
								value: 'crossRot',
							},
							{
								name: 'Dash',
								value: 'dash',
							},
							{
								name: 'Line',
								value: 'line',
							},
							{
								name: 'Rect',
								value: 'rect',
							},
							{
								name: 'Rect Rot',
								value: 'rectRot',
							},
							{
								name: 'Rect Rounded',
								value: 'rectRounded',
							},
							{
								name: 'Star',
								value: 'star',
							},
							{
								name: 'Triangle',
								value: 'triangle',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const datasets: IDataset[] = [];
		let chartType = this.getNodeParameter('chartType', 0) as string;

		if (HORIZONTAL_CHARTS.includes(chartType)) {
			const horizontal = this.getNodeParameter('horizontal', 0) as boolean;
			if (horizontal) {
				chartType =
					'horizontal' + chartType[0].toUpperCase() + chartType.substring(1, chartType.length);
			}
		}

		// tslint:disable-next-line:no-any
		const labels: string[] = [];
		const labelsUi = this.getNodeParameter('labelsUi.labelsValues', 0, []) as IDataObject[];

		if (labelsUi.length) {
			for (const labelValue of labelsUi as [{ label: string[] | string }]) {
				if (Array.isArray(labelValue.label)) {
					labels?.push(...labelValue.label);
				} else {
					labels?.push(labelValue.label);
				}
			}
		}

		for (let i = 0; i < items.length; i++) {
			// tslint:disable-next-line:no-any
			const data = this.getNodeParameter('data', i) as any;
			const datasetOptions = this.getNodeParameter('datasetOptions', i) as IDataObject;
			const backgroundColor = datasetOptions.backgroundColor as string;
			const borderColor = datasetOptions.borderColor as string | undefined;
			const fontColor = datasetOptions.fontColor as string | undefined;
			const datasetChartType = datasetOptions.chartType as string | undefined;
			const fill = datasetOptions.fill as boolean | undefined;
			const label = datasetOptions.label as string | undefined;
			const pointStyle = datasetOptions.pointStyle as string | undefined;

			// Boxplots and Violins are an addon that uses the name 'itemStyle'
			// instead of 'pointStyle'.
			let pointStyleName = 'pointStyle';
			if (datasetChartType !== undefined && ITEM_STYLE_CHARTS.includes(datasetChartType)) {
				pointStyleName = 'itemStyle';
			} else if (ITEM_STYLE_CHARTS.includes(chartType)) {
				pointStyleName = 'itemStyle';
			}

			datasets.push({
				label,
				data,
				backgroundColor,
				borderColor,
				color: fontColor,
				type: datasetChartType,
				fill,
				[pointStyleName]: pointStyle,
			});
		}

		const output = this.getNodeParameter('output', 0) as string;
		const chartOptions = this.getNodeParameter('chartOptions', 0);
		const options: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://quickchart.io/chart',
			qs: Object.assign(
				{
					chart: JSON.stringify({
						type: chartType,
						data: {
							labels,
							datasets,
						},
					}),
				},
				chartOptions,
			) as IDataObject,
			returnFullResponse: true,
			encoding: 'arraybuffer',
			json: false,
		};

		const response = (await this.helpers.httpRequest(options)) as IN8nHttpFullResponse;
		let mimeType = response.headers['content-type'] as string | undefined;
		mimeType = mimeType ? mimeType.split(';').find((value) => value.includes('/')) : undefined;
		return this.prepareOutputData([
			{
				binary: {
					[output]: await this.helpers.prepareBinaryData(
						response.body as Buffer,
						undefined,
						mimeType,
					),
				},
				json: {},
			},
		]);
	}
}
