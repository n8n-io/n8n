import { router } from './actions/router';
import * as methods from './methods';
import { versionDescription } from './versionDescription';
export class NocoDBV2 {
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = methods;
    description;
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=NocoDBV2.node.js.map