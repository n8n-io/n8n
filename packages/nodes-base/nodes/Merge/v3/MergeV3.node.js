import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { loadOptions } from './methods';
export class MergeV3 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = {
        loadOptions,
    };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=MergeV3.node.js.map