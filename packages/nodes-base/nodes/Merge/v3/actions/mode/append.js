import { updateDisplayOptions } from '@utils/utilities';
import { numberInputsProperty } from '../../helpers/descriptions';
export const properties = [numberInputsProperty];
const displayOptions = {
    show: {
        mode: ['append'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(inputsData) {
    const returnData = [];
    for (let i = 0; i < inputsData.length; i++) {
        returnData.push.apply(returnData, inputsData[i]);
    }
    return [returnData];
}
//# sourceMappingURL=append.js.map