import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { credentialTest, listSearch, loadOptions, resourceMapping } from './methods';
export class GoogleSheetsV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = {
        loadOptions,
        credentialTest,
        listSearch,
        resourceMapping,
    };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=GoogleSheetsV2.node.js.map