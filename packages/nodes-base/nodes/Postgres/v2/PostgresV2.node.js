import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { credentialTest, listSearch, loadOptions, resourceMapping } from './methods';
export class PostgresV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = { credentialTest, listSearch, loadOptions, resourceMapping };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=PostgresV2.node.js.map