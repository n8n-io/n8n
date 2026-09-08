import { router } from './actions/router';
import { versionDescription } from './actions/SeaTable.node';
import { loadOptions } from './methods';
export class SeaTableV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = { loadOptions };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=SeaTableV2.node.js.map