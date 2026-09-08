import { VersionedNodeType } from 'n8n-workflow';
import { GoogleAnalyticsV1 } from './v1/GoogleAnalyticsV1.node';
import { GoogleAnalyticsV2 } from './v2/GoogleAnalyticsV2.node';
export class GoogleAnalytics extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Google Analytics',
            name: 'googleAnalytics',
            icon: 'file:analytics.svg',
            group: ['transform'],
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            description: 'Use the Google Analytics API',
            defaultVersion: 2,
            schemaPath: 'Google/Analytics',
        };
        const nodeVersions = {
            1: new GoogleAnalyticsV1(baseDescription),
            2: new GoogleAnalyticsV2(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=GoogleAnalytics.node.js.map