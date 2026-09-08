import { getSites, getCollections, getFields } from '../GenericFunctions';
import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
export class WebflowV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
            usableAsTool: true,
        };
    }
    methods = {
        loadOptions: {
            getSites,
            getCollections,
            getFields,
        },
    };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=WebflowV2.node.js.map