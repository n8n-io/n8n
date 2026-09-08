import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import * as loadOptions from './methods';
import { searchActivities, searchActivityTypes, searchContacts, searchCustomRecords, searchModelRecords, searchModels, searchOpportunities, searchUsers, } from './methods/listSearch';
import { getActivityFields, getContactFields, getOdooFields, getOpportunityFields, } from './methods/resourceMapping';
export class OdooV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...versionDescription,
            usableAsTool: true,
        };
    }
    methods = {
        loadOptions,
        listSearch: {
            searchModels,
            searchModelRecords,
            searchCustomRecords,
            searchContacts,
            searchOpportunities,
            searchActivities,
            searchActivityTypes,
            searchUsers,
        },
        resourceMapping: { getOdooFields, getContactFields, getOpportunityFields, getActivityFields },
    };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=OdooV2.node.js.map