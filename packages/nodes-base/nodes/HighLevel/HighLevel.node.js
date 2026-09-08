import { VersionedNodeType } from 'n8n-workflow';
import { HighLevelV1 } from './v1/HighLevelV1.node';
import { HighLevelV2 } from './v2/HighLevelV2.node';
export class HighLevel extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'HighLevel',
            name: 'highLevel',
            icon: 'file:highLevel.svg',
            group: ['transform'],
            defaultVersion: 2,
            description: 'Consume HighLevel API',
        };
        const nodeVersions = {
            1: new HighLevelV1(baseDescription),
            2: new HighLevelV2(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=HighLevel.node.js.map