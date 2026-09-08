import * as mode from './mode';
import { getNodeInputsData } from '../helpers/utils';
export async function router() {
    const inputsData = getNodeInputsData.call(this);
    let operationMode = this.getNodeParameter('mode', 0);
    if (operationMode === 'combine') {
        const combineBy = this.getNodeParameter('combineBy', 0);
        operationMode = combineBy;
    }
    return await mode[operationMode].execute.call(this, inputsData);
}
//# sourceMappingURL=router.js.map