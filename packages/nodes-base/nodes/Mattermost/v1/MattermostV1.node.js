import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { loadOptions } from './methods';
export class MattermostV1 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
            usableAsTool: true,
        };
    }
    methods = { loadOptions };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=MattermostV1.node.js.map