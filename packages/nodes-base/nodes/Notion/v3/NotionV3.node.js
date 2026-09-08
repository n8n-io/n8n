import { router } from './actions/router';
import { listSearch, loadOptions } from './methods';
import { versionDescription } from './VersionDescription';
export class NotionV3 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = { listSearch, loadOptions };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=NotionV3.node.js.map