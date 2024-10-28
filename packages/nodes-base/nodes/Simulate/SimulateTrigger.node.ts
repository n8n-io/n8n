import { sleep, NodeOperationError, jsonParse } from 'n8n-workflow';
import type {
	IDataObject,
	ITriggerFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import {
	executionDurationProperty,
	iconSelector,
	jsonOutputProperty,
	subtitleProperty,
} from './descriptions';
import { loadOptions } from './methods';

export class SimulateTrigger implements INodeType {
	description: INodeTypeDescription = {
		hidden: true,
		displayName: 'Simulate Trigger',
		name: 'simulateTrigger',
		subtitle: '={{$parameter.subtitle || undefined}}',
		icon: 'fa:arrow-right',
		group: ['trigger'],
		version: 1,
		description: 'Simulate a trigger node',
		defaults: {
			name: 'Simulate Trigger',
			color: '#b0b0b0',
		},
		inputs: [],
		outputs: ['main'],
		properties: [
			{ ...iconSelector, default: 'n8n-nodes-base.manualTrigger' },
			subtitleProperty,
			{ ...jsonOutputProperty, displayName: 'Output (JSON)' },
			executionDurationProperty,
		],
	};

	methods = { loadOptions };

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const returnItems: INodeExecutionData[] = [];

		let jsonOutput = this.getNodeParameter('jsonOutput', 0);

		if (typeof jsonOutput === 'string') {
			try {
				jsonOutput = jsonParse<IDataObject>(jsonOutput);
			} catch (error) {
				throw new NodeOperationError(this.getNode(), 'Invalid JSON');
			}
		}

		if (!Array.isArray(jsonOutput)) {
			jsonOutput = [jsonOutput];
		}

		for (const item of jsonOutput as IDataObject[]) {
			returnItems.push({ json: item });
		}

		const executionDuration = this.getNodeParameter('executionDuration', 0) as number;

		if (executionDuration > 0) {
			await sleep(executionDuration);
		}

		const manualTriggerFunction = async () => {
			this.emit([returnItems]);
		};

		return {
			manualTriggerFunction,
		};
	}
}
