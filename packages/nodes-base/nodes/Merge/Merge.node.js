import { VersionedNodeType } from 'n8n-workflow';
import { MergeV1 } from './v1/MergeV1.node';
import { MergeV2 } from './v2/MergeV2.node';
import { MergeV3 } from './v3/MergeV3.node';
export class Merge extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Merge',
            name: 'merge',
            icon: 'node:merge',
            iconColor: 'azure',
            group: ['transform'],
            subtitle: '={{$parameter["mode"]}}',
            description: 'Merges data of multiple streams once data from both is available',
            defaultVersion: 3.2,
        };
        const nodeVersions = {
            1: new MergeV1(baseDescription),
            2: new MergeV2(baseDescription),
            2.1: new MergeV2(baseDescription),
            3: new MergeV3(baseDescription),
            3.1: new MergeV3(baseDescription),
            3.2: new MergeV3(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=Merge.node.js.map