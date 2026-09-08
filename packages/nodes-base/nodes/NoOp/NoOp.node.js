import { NodeConnectionTypes } from 'n8n-workflow';
export class NoOp {
    description = {
        displayName: 'No Operation, do nothing',
        name: 'noOp',
        icon: 'node:no-operation',
        iconColor: 'neutral',
        group: ['organization'],
        version: 1,
        description: 'No Operation',
        defaults: {
            name: 'No Operation, do nothing',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        properties: [],
    };
    async execute() {
        const items = this.getInputData();
        return [items];
    }
}
//# sourceMappingURL=NoOp.node.js.map