import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { listSearch, resourceMapping } from './methods';
// Graph-based v2 rebuild in progress. Not registered yet — uncomment the
// registration in MicrosoftSharePoint.node.ts to test locally.
export class MicrosoftSharePointV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
        };
    }
    methods = {
        listSearch,
        resourceMapping,
    };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=MicrosoftSharePointV2.node.js.map