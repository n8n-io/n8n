import { VersionedNodeType } from 'n8n-workflow';
import { PipedriveV1 } from './v1/PipedriveV1.node';
import { PipedriveV2 } from './v2/PipedriveV2.node';
export class Pipedrive extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Pipedrive',
            name: 'pipedrive',
            icon: 'file:pipedrive.svg',
            group: ['transform'],
            defaultVersion: 2,
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            description: 'Create and edit data in Pipedrive',
        };
        const nodeVersions = {
            1: new PipedriveV1(baseDescription),
            2: new PipedriveV2(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=Pipedrive.node.js.map