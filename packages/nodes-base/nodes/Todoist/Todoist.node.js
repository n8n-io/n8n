import { VersionedNodeType } from 'n8n-workflow';
import { TodoistV1 } from './v1/TodoistV1.node';
import { TodoistV2 } from './v2/TodoistV2.node';
export class Todoist extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Todoist',
            name: 'todoist',
            icon: 'file:todoist.svg',
            group: ['output'],
            defaultVersion: 2.2,
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            description: 'Consume Todoist API',
        };
        const nodeVersions = {
            1: new TodoistV1(baseDescription),
            2: new TodoistV2(baseDescription),
            2.1: new TodoistV2(baseDescription),
            2.2: new TodoistV2(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=Todoist.node.js.map