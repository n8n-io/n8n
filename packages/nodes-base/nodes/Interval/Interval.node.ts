import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	NodeOperationError,
} from 'n8n-workflow';


export class Interval implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Interval',
		name: 'interval',
		icon: 'fa:hourglass',
		group: ['trigger'],
		version: 1,
		description: 'Triggers the workflow in a given interval',
		eventTriggerDescription: '',
		activationMessage: 'Your interval trigger will now trigger executions on the schedule you have defined.',
		defaults: {
			name: 'Interval',
			color: '#00FF00',
		},
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'Interval value.',
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
				],
				default: 'seconds',
				description: 'Unit of the interval value.',
			},
		],
	};



	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const interval = this.getNodeParameter('interval') as number;
		const unit = this.getNodeParameter('unit') as string;

		if (interval <= 0) {
			throw new NodeOperationError(this.getNode(), 'The interval has to be set to at least 1 or higher!');
		}

		let intervalValue = interval;
		if (unit === 'minutes') {
			intervalValue *= 60;
		}
		if (unit === 'hours') {
			intervalValue *= 60 * 60;
		}

		const executeTrigger = () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		intervalValue *= 1000;

		// Reference: https://nodejs.org/api/timers.html#timers_setinterval_callback_delay_args
		if (intervalValue > 2147483647) {
			throw new Error('The interval value is too large.');
		}

		const intervalObj = setInterval(executeTrigger, intervalValue);

		async function closeFunction() {
			clearInterval(intervalObj);
		}

		async function manualTriggerFunction() {
			executeTrigger();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};

	}
}
