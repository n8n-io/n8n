import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class Wait implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wait',
		name: 'wait',
		icon: 'fa:hourglass',
		group: ['organization'],
		version: 1,
		description: 'Wait before continue with execution/',
		defaults: {
			name: 'Wait',
			color: '#b0b0b0',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'The time to wait.',
			},
			{
				displayName: 'Unit',
				name: 'unit',
				type: 'options',
				options: [
					{
						name: 'Seconds',
						value: 'seconds',
					},
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
					{
						name: 'days',
						value: 'days',
					},
				],
				default: 'seconds',
				description: 'Unit of the interval value.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const unit = this.getNodeParameter('unit', 0) as string;

		let sleepValue = this.getNodeParameter('value', 0) as number;
		if (unit === 'minutes') {
			sleepValue *= 60;
		}
		if (unit === 'hours') {
			sleepValue *= 60 * 60;
		}
		if (unit === 'days') {
			sleepValue *= 60 * 60 * 24;
		}

		sleepValue *= 1000;

		if (sleepValue < 60000) {
			// If wait time is shorter than 60 seconds leave execution active because
			// we just check the database all 60 seconds.
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					resolve([this.getInputData()]);
				}, sleepValue);
			});
		}

		// If longer than 60 seconds put execution to sleep
		const sleepTill = new Date(new Date().getTime() + sleepValue);
		await this.putExecutionToSleep(sleepTill);

		return [this.getInputData()];
	}
}
