import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
export class ItemListsV3 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=ItemListsV3.node.js.map