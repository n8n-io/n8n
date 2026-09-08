import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { loadOptions, listSearch } from './methods';
export class GoogleBigQueryV2 {
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
//# sourceMappingURL=GoogleBigQueryV2.node.js.map