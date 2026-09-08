import assign from 'lodash/assign';
import assignWith from 'lodash/assignWith';
import get from 'lodash/get';
import merge from 'lodash/merge';
import mergeWith from 'lodash/mergeWith';
import { NodeConnectionTypes, NodeHelpers, UserError } from 'n8n-workflow';
import { fuzzyCompare, preparePairedItemDataArray } from '@utils/utilities';
export function addSuffixToEntriesKeys(data, suffix) {
    return data.map((entry) => {
        const json = {};
        Object.keys(entry.json).forEach((key) => {
            json[`${key}_${suffix}`] = entry.json[key];
        });
        return { ...entry, json };
    });
}
function findAllMatches(data, lookup, disableDotNotation, isEntriesEqual) {
    return data.reduce((acc, entry2, i) => {
        if (entry2 === undefined)
            return acc;
        for (const key of Object.keys(lookup)) {
            const expectedValue = lookup[key];
            let entry2FieldValue;
            if (disableDotNotation) {
                entry2FieldValue = entry2.json[key];
            }
            else {
                entry2FieldValue = get(entry2.json, key);
            }
            if (!isEntriesEqual(expectedValue, entry2FieldValue)) {
                return acc;
            }
        }
        return acc.concat({
            entry: entry2,
            index: i,
        });
    }, []);
}
function findFirstMatch(data, lookup, disableDotNotation, isEntriesEqual) {
    const index = data.findIndex((entry2) => {
        if (entry2 === undefined)
            return false;
        for (const key of Object.keys(lookup)) {
            const expectedValue = lookup[key];
            let entry2FieldValue;
            if (disableDotNotation) {
                entry2FieldValue = entry2.json[key];
            }
            else {
                entry2FieldValue = get(entry2.json, key);
            }
            if (!isEntriesEqual(expectedValue, entry2FieldValue)) {
                return false;
            }
        }
        return true;
    });
    if (index === -1)
        return [];
    return [{ entry: data[index], index }];
}
export function findMatches(input1, input2, fieldsToMatch, options) {
    const data1 = [...input1];
    const data2 = [...input2];
    const isEntriesEqual = fuzzyCompare(options.fuzzyCompare);
    const disableDotNotation = options.disableDotNotation || false;
    const multipleMatches = options.multipleMatches || 'all';
    const filteredData = {
        matched: [],
        matched2: [],
        unmatched1: [],
        unmatched2: [],
    };
    const matchedInInput2 = new Set();
    matchesLoop: for (const entry1 of data1) {
        const lookup = {};
        fieldsToMatch.forEach((matchCase) => {
            let valueToCompare;
            if (disableDotNotation) {
                valueToCompare = entry1.json[matchCase.field1];
            }
            else {
                valueToCompare = get(entry1.json, matchCase.field1);
            }
            lookup[matchCase.field2] = valueToCompare;
        });
        for (const fieldValue of Object.values(lookup)) {
            if (fieldValue === undefined) {
                filteredData.unmatched1.push(entry1);
                continue matchesLoop;
            }
        }
        const foundedMatches = multipleMatches === 'all'
            ? findAllMatches(data2, lookup, disableDotNotation, isEntriesEqual)
            : findFirstMatch(data2, lookup, disableDotNotation, isEntriesEqual);
        const matches = foundedMatches.map((match) => match.entry);
        foundedMatches.map((match) => matchedInInput2.add(match.index));
        if (matches.length) {
            if (options.outputDataFrom === 'both' ||
                options.joinMode === 'enrichInput1' ||
                options.joinMode === 'enrichInput2') {
                matches.forEach((match) => {
                    filteredData.matched.push({
                        entry: entry1,
                        matches: [match],
                    });
                });
            }
            else {
                filteredData.matched.push({
                    entry: entry1,
                    matches,
                });
            }
        }
        else {
            filteredData.unmatched1.push(entry1);
        }
    }
    data2.forEach((entry, i) => {
        if (matchedInInput2.has(i)) {
            filteredData.matched2.push(entry);
        }
        else {
            filteredData.unmatched2.push(entry);
        }
    });
    return filteredData;
}
export function selectMergeMethod(clashResolveOptions) {
    const mergeMode = clashResolveOptions.mergeMode;
    if (clashResolveOptions.overrideEmpty) {
        function customizer(targetValue, srcValue) {
            if (srcValue === undefined || srcValue === null || srcValue === '') {
                return targetValue;
            }
        }
        if (mergeMode === 'deepMerge') {
            return (target, ...source) => {
                const targetCopy = Object.assign({}, target);
                return mergeWith(targetCopy, ...source, customizer);
            };
        }
        if (mergeMode === 'shallowMerge') {
            return (target, ...source) => {
                const targetCopy = Object.assign({}, target);
                return assignWith(targetCopy, ...source, customizer);
            };
        }
    }
    else {
        if (mergeMode === 'deepMerge') {
            return (target, ...source) => merge({}, target, ...source);
        }
        if (mergeMode === 'shallowMerge') {
            return (target, ...source) => assign({}, target, ...source);
        }
    }
    return (target, ...source) => merge({}, target, ...source);
}
export function mergeMatched(matched, clashResolveOptions, joinMode) {
    const returnData = [];
    let resolveClash = clashResolveOptions.resolveClash;
    const mergeIntoSingleObject = selectMergeMethod(clashResolveOptions);
    for (const match of matched) {
        let { entry, matches } = match;
        let json = {};
        let binary = {};
        let pairedItem = [];
        if (resolveClash === 'addSuffix') {
            const suffix1 = '1';
            const suffix2 = '2';
            [entry] = addSuffixToEntriesKeys([entry], suffix1);
            matches = addSuffixToEntriesKeys(matches, suffix2);
            json = mergeIntoSingleObject({ ...entry.json }, ...matches.map((item) => item.json));
            binary = mergeIntoSingleObject({ ...entry.binary }, ...matches.map((item) => item.binary));
            pairedItem = [
                ...preparePairedItemDataArray(entry.pairedItem),
                ...matches.map((item) => preparePairedItemDataArray(item.pairedItem)).flat(),
            ];
        }
        else {
            const preferInput1 = 'preferInput1';
            const preferLast = 'preferLast';
            if (resolveClash === undefined) {
                if (joinMode !== 'enrichInput2') {
                    resolveClash = 'preferLast';
                }
                else {
                    resolveClash = 'preferInput1';
                }
            }
            if (resolveClash === preferInput1) {
                const [firstMatch, ...restMatches] = matches;
                json = mergeIntoSingleObject({ ...firstMatch.json }, ...restMatches.map((item) => item.json), entry.json);
                binary = mergeIntoSingleObject({ ...firstMatch.binary }, ...restMatches.map((item) => item.binary), entry.binary);
                pairedItem = [
                    ...preparePairedItemDataArray(firstMatch.pairedItem),
                    ...restMatches.map((item) => preparePairedItemDataArray(item.pairedItem)).flat(),
                    ...preparePairedItemDataArray(entry.pairedItem),
                ];
            }
            if (resolveClash === preferLast) {
                json = mergeIntoSingleObject({ ...entry.json }, ...matches.map((item) => item.json));
                binary = mergeIntoSingleObject({ ...entry.binary }, ...matches.map((item) => item.binary));
                pairedItem = [
                    ...preparePairedItemDataArray(entry.pairedItem),
                    ...matches.map((item) => preparePairedItemDataArray(item.pairedItem)).flat(),
                ];
            }
        }
        returnData.push({
            json,
            binary,
            pairedItem,
        });
    }
    return returnData;
}
export function checkMatchFieldsInput(data) {
    if (data.length === 1 && data[0].field1 === '' && data[0].field2 === '') {
        throw new UserError('You need to define at least one pair of fields in "Fields to Match" to match on', { level: 'warning' });
    }
    for (const [index, pair] of data.entries()) {
        if (pair.field1 === '' || pair.field2 === '') {
            throw new UserError(`You need to define both fields in "Fields to Match" for pair ${index + 1},
				 field 1 = '${pair.field1}'
				 field 2 = '${pair.field2}'`, { level: 'warning' });
        }
    }
    return data;
}
export function checkInput(input, fields, disableDotNotation, inputLabel) {
    for (const field of fields) {
        const isPresent = (input || []).some((entry) => {
            if (disableDotNotation) {
                return entry.json.hasOwnProperty(field);
            }
            return get(entry.json, field, undefined) !== undefined;
        });
        if (!isPresent) {
            throw new UserError(`Field '${field}' is not present in any of items in '${inputLabel}'`, {
                level: 'warning',
            });
        }
    }
    return input;
}
export function addSourceField(data, sourceField) {
    return data.map((entry) => {
        const json = {
            ...entry.json,
            _source: sourceField,
        };
        return {
            ...entry,
            json,
        };
    });
}
export const configuredInputs = (parameters) => {
    return Array.from({ length: parameters.numberInputs || 2 }, (_, i) => ({
        type: 'main',
        displayName: `Input ${(i + 1).toString()}`,
    }));
};
export function getNodeInputsData() {
    const returnData = [];
    const inputs = NodeHelpers.getConnectionTypes(this.getNodeInputs()).filter((type) => type === NodeConnectionTypes.Main);
    for (let i = 0; i < inputs.length; i++) {
        try {
            returnData.push(this.getInputData(i) ?? []);
        }
        catch (error) {
            returnData.push([]);
        }
    }
    return returnData;
}
export const rowToExecutionData = (data) => {
    const keys = Object.keys(data);
    const pairedItem = [];
    const json = {};
    for (const key of keys) {
        if (key.startsWith('pairedItem')) {
            if (data[key] === undefined)
                continue;
            pairedItem.push(data[key]);
        }
        else {
            json[key] = data[key];
        }
    }
    return { json, pairedItem };
};
export function modifySelectQuery(userQuery, inputLength) {
    const selectMatch = userQuery.match(/SELECT\s+(.+?)\s+FROM/i);
    if (!selectMatch)
        return userQuery;
    let selectedColumns = selectMatch[1].trim();
    if (selectedColumns === '*') {
        return userQuery;
    }
    const pairedItemColumns = [];
    for (let i = 1; i <= inputLength; i++) {
        if (userQuery.includes(`input${i}`)) {
            pairedItemColumns.push(`input${i}.pairedItem AS pairedItem${i}`);
        }
    }
    selectedColumns += pairedItemColumns.length ? ', ' + pairedItemColumns.join(', ') : '';
    return userQuery.replace(selectMatch[0], `SELECT ${selectedColumns} FROM`);
}
//# sourceMappingURL=utils.js.map