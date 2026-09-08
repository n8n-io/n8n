import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch, loadOptions } from './methods';
export class GoogleAnalyticsV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
            usableAsTool: true,
        };
    }
    methods = { loadOptions, listSearch };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=GoogleAnalyticsV2.node.js.map