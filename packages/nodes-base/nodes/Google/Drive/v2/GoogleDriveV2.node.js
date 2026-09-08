import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch } from './methods';
export class GoogleDriveV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = { listSearch };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=GoogleDriveV2.node.js.map