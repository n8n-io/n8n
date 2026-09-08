import { VersionedNodeType } from 'n8n-workflow';
import { MattermostV1 } from './v1/MattermostV1.node';
export class Mattermost extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Mattermost',
            name: 'mattermost',
            icon: 'file:mattermost.svg',
            group: ['output'],
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            description: 'Sends data to Mattermost',
            defaultVersion: 1,
        };
        const nodeVersions = {
            1: new MattermostV1(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=Mattermost.node.js.map