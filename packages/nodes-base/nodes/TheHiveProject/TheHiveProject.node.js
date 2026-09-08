import { description } from './actions/node.description';
import { router } from './actions/router';
import { loadOptions, listSearch, resourceMapping } from './methods';
export class TheHiveProject {
    description = description;
    methods = { loadOptions, listSearch, resourceMapping };
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=TheHiveProject.node.js.map