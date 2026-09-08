import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch, credentialTest, loadOptions } from './methods';
export class MySqlV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = { listSearch, loadOptions, credentialTest };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=MySqlV2.node.js.map