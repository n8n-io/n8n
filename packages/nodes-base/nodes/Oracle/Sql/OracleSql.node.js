import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';
import { credentialTest, listSearch, loadOptions, resourceMapping } from './methods';
//oracleDBTypes.fetchAsString = [oracleDBTypes.CLOB]; TBD
export class OracleSql {
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
//# sourceMappingURL=OracleSql.node.js.map