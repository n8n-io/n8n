import { NodeOperationError, jsonParse, NodeConnectionTypes } from 'n8n-workflow';
import { sleep } from '@n8n/utils/sleep';
import { executionDurationProperty, iconSelector, jsonOutputProperty, subtitleProperty, } from './descriptions';
import { loadOptions } from './methods';
export class SimulateTrigger {
    description = {
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
        outputs: [NodeConnectionTypes.Main],
        properties: [
            { ...iconSelector, default: 'n8n-nodes-base.manualTrigger' },
            subtitleProperty,
            { ...jsonOutputProperty, displayName: 'Output (JSON)' },
            executionDurationProperty,
        ],
    };
    methods = { loadOptions };
    async trigger() {
        const returnItems = [];
        let jsonOutput = this.getNodeParameter('jsonOutput', 0);
        if (typeof jsonOutput === 'string') {
            try {
                jsonOutput = jsonParse(jsonOutput);
            }
            catch (error) {
                throw new NodeOperationError(this.getNode(), 'Invalid JSON');
            }
        }
        if (!Array.isArray(jsonOutput)) {
            jsonOutput = [jsonOutput];
        }
        for (const item of jsonOutput) {
            returnItems.push({ json: item });
        }
        const executionDuration = this.getNodeParameter('executionDuration', 0);
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
//# sourceMappingURL=SimulateTrigger.node.js.map