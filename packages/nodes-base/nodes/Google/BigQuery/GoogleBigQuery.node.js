import { VersionedNodeType } from 'n8n-workflow';
import { GoogleBigQueryV1 } from './v1/GoogleBigQueryV1.node';
import { GoogleBigQueryV2 } from './v2/GoogleBigQueryV2.node';
export class GoogleBigQuery extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Google BigQuery',
            name: 'googleBigQuery',
            icon: 'file:googleBigQuery.svg',
            group: ['input'],
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            description: 'Consume Google BigQuery API',
            defaultVersion: 2.1,
        };
        const nodeVersions = {
            1: new GoogleBigQueryV1(baseDescription),
            2: new GoogleBigQueryV2(baseDescription),
            2.1: new GoogleBigQueryV2(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=GoogleBigQuery.node.js.map