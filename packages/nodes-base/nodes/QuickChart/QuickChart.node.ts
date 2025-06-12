import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	CHART_TYPE_OPTIONS,
	Fill_CHARTS,
	HORIZONTAL_CHARTS,
	ITEM_STYLE_CHARTS,
	POINT_STYLE_CHARTS,
} from './constants';
import type { IDataset } from './types';

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
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
				displayName: 'Add Labels',
				name: 'labelsMode',
				type: 'options',
				options: [
					{
						name: 'Manually',
						value: 'manually',
					},
					{
						name: 'From Array',
						value: 'array',
					},
				],
				default: 'manually',
			},
			{
				displayName: 'Labels',
				name: 'labelsUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				required: true,
				description: 'Labels to use in the chart',
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
				displayOptions: {
					show: {
						labelsMode: ['manually'],
					},
				},
			},
			{
				displayName: 'Labels Array',
				name: 'labelsArray',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. ["Berlin", "Paris", "Rome", "New York"]',
				displayOptions: {
					show: {
						labelsMode: ['array'],
					},
				},
				description: 'The array of labels to be used in the chart',
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'json',
				default: '',
				description:
					'Data to use for the dataset, documentation and examples <a href="https://quickchart.io/documentation/chart-types/" target="_blank">here</a>',
				placeholder: 'e.g. [60, 10, 12, 20]',
				required: true,
			},
			{
				displayName: 'Put Output In Field',
				name: 'output',
				type: 'string',
				default: 'data',
				required: true,
				description:
					'The binary data will be displayed in the Output panel on the right, under the Binary tab',
				hint: 'The name of the output field to put the binary file data in',
			},
			{
				displayName: 'Chart Options',
				name: 'chartOptions',
				type: 'collection',
				placeholder: 'Add option',
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
							minValue: 1,
							maxValue: 2,
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
						displayName: 'Horizontal',
						name: 'horizontal',
						type: 'boolean',
						default: false,
						description: 'Whether the chart should use its Y axis horizontal',
						displayOptions: {
							show: {
								'/chartType': HORIZONTAL_CHARTS,
							},
						},
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
				placeholder: 'Add option',
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
						displayName: 'Fill',
						name: 'fill',
						type: 'boolean',
						default: true,
						description: 'Whether to fill area of the dataset',
						displayOptions: {
							show: {
								'/chartType': Fill_CHARTS,
							},
						},
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
						displayOptions: {
							show: {
								'/chartType': POINT_STYLE_CHARTS,
							},
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const datasets: IDataset[] = [];
		let chartType = '';

		const labels: string[] = [];
		const labelsMode = this.getNodeParameter('labelsMode', 0) as string;

		if (labelsMode === 'manually') {
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
		} else {
			const labelsArray = this.getNodeParameter('labelsArray', 0, '') as string;

			const errorMessage =
				'Labels Array is not a valid array, use valid JSON format, or specify it by expressions';

			if (Array.isArray(labelsArray)) {
				labels.push(...labelsArray);
			} else {
				const labelsArrayParsed = jsonParse<string[]>(labelsArray, {
					errorMessage,
				});
				if (!Array.isArray(labelsArrayParsed)) {
					throw new NodeOperationError(this.getNode(), errorMessage);
				}
				labels.push(...labelsArrayParsed);
			}
		}

		for (let i = 0; i < items.length; i++) {
			const data = this.getNodeParameter('data', i) as string;
			const datasetOptions = this.getNodeParameter('datasetOptions', i) as IDataObject;

			const backgroundColor = datasetOptions.backgroundColor as string;
			const borderColor = datasetOptions.borderColor as string | undefined;
			const fill = datasetOptions.fill as boolean | undefined;
			const label = (datasetOptions.label as string) || 'Chart';
			const pointStyle = datasetOptions.pointStyle as string | undefined;

			chartType = this.getNodeParameter('chartType', i) as string;

			if (HORIZONTAL_CHARTS.includes(chartType)) {
				const horizontal = this.getNodeParameter('chartOptions.horizontal', i, false) as boolean;
				if (horizontal) {
					chartType =
						'horizontal' + chartType[0].toUpperCase() + chartType.substring(1, chartType.length);
				}
			}

			// Boxplots and Violins are an addon that uses the name 'itemStyle'
			// instead of 'pointStyle'.
			let pointStyleName = 'pointStyle';
			if (ITEM_STYLE_CHARTS.includes(chartType)) {
				pointStyleName = 'itemStyle';
			}

			datasets.push({
				label,
				data,
				backgroundColor,
				borderColor,
				type: chartType,
				fill,
				[pointStyleName]: pointStyle,
			});
		}

		const output = this.getNodeParameter('output', 0) as string;
		const chartOptions = this.getNodeParameter('chartOptions', 0) as IDataObject;

		const chart = {
			type: chartType,
			data: {
				labels,
				datasets,
			},
		};

		const options: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://quickchart.io/chart',
			qs: {
				chart: JSON.stringify(chart),
				...chartOptions,
			},
			returnFullResponse: true,
			encoding: 'arraybuffer',
			json: false,
		};

		const response = (await this.helpers.httpRequest(options)) as IN8nHttpFullResponse;
		let mimeType = response.headers['content-type'] as string | undefined;
		mimeType = mimeType ? mimeType.split(';').find((value) => value.includes('/')) : undefined;

		return [
			[
				{
					binary: {
						[output]: await this.helpers.prepareBinaryData(
							response.body as Buffer,
							undefined,
							mimeType,
						),
					},
					json: { chart },
				},
			],
		];
	}
}
