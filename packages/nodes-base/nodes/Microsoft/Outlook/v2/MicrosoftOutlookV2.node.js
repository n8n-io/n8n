import { description } from './actions/node.description';
import { router } from './actions/router';
import { loadOptions, listSearch } from './methods';
import { sendAndWaitWebhook } from '../../../../utils/sendAndWait/utils';
export class MicrosoftOutlookV2 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            ...description,
        };
    }
    methods = { loadOptions, listSearch };
    webhook = sendAndWaitWebhook;
    async execute() {
        return await router.call(this);
    }
}
//# sourceMappingURL=MicrosoftOutlookV2.node.js.map