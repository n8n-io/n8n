import merge from 'lodash/merge';
import { updateDisplayOptions } from '@utils/utilities';
import { clashHandlingProperties, fuzzyCompareProperty } from '../../helpers/descriptions';
import { addSuffixToEntriesKeys, selectMergeMethod } from '../../helpers/utils';
export const properties = [
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [clashHandlingProperties, fuzzyCompareProperty],
    },
];
const displayOptions = {
    show: {
        mode: ['combine'],
        combineBy: ['combineAll'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(inputsData) {
    const returnData = [];
    const clashHandling = this.getNodeParameter('options.clashHandling.values', 0, {});
    let input1 = inputsData[0];
    let input2 = inputsData[1];
    if (clashHandling.resolveClash === 'preferInput1') {
        [input1, input2] = [input2, input1];
    }
    if (clashHandling.resolveClash === 'addSuffix') {
        input1 = addSuffixToEntriesKeys(input1, '1');
        input2 = addSuffixToEntriesKeys(input2, '2');
    }
    const mergeIntoSingleObject = selectMergeMethod(clashHandling);
    if (!input1 || !input2) {
        return [returnData];
    }
    let entry1;
    let entry2;
    for (entry1 of input1) {
        for (entry2 of input2) {
            returnData.push({
                json: {
                    ...mergeIntoSingleObject(entry1.json, entry2.json),
                },
                binary: {
                    ...merge({}, entry1.binary, entry2.binary),
                },
                pairedItem: [entry1.pairedItem, entry2.pairedItem],
            });
        }
    }
    return [returnData];
}
//# sourceMappingURL=combineAll.js.map