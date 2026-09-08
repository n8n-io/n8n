import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch, loadOptions } from './methods';
export class MicrosoftExcelV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
            usableAsTool: true,
        };
    }
    methods = { listSearch, loadOptions };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=MicrosoftExcelV2.node.js.map