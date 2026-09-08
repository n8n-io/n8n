import { VersionedNodeType } from 'n8n-workflow';
import { MicrosoftSharePointV1 } from './v1/MicrosoftSharePointV1.node';
import { MicrosoftSharePointV2 } from './v2/MicrosoftSharePointV2.node';
export class MicrosoftSharePoint extends VersionedNodeType {
    constructor() {
        const baseDescription = {
            displayName: 'Microsoft SharePoint',
            name: 'microsoftSharePoint',
            icon: {
                light: 'file:microsoftSharePoint.svg',
                dark: 'file:microsoftSharePoint.svg',
            },
            group: ['transform'],
            description: 'Interact with Microsoft SharePoint API',
            defaultVersion: 2,
        };
        const nodeVersions = {
            1: new MicrosoftSharePointV1(baseDescription),
            2: new MicrosoftSharePointV2(baseDescription),
        };
        super(nodeVersions, baseDescription);
    }
}
//# sourceMappingURL=MicrosoftSharePoint.node.js.map