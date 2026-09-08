import { getRangeString, prepareSheetData } from '../../helpers/GoogleSheets.utils';
export async function readSheet(sheet, sheetName, itemIndex, returnData, nodeVersion, items, rangeString, additionalOptions) {
    const options = this.getNodeParameter('options', itemIndex, {});
    const outputFormattingOption = options.outputFormatting?.values || {};
    const dataLocationOnSheetOptions = options.dataLocationOnSheet?.values ||
        additionalOptions ||
        {};
    if (dataLocationOnSheetOptions.rangeDefinition === undefined) {
        dataLocationOnSheetOptions.rangeDefinition = 'detectAutomatically';
    }
    const includeHeadersWithEmptyCells = additionalOptions?.includeHeadersWithEmptyCells ?? false;
    const range = rangeString ?? getRangeString(sheetName, dataLocationOnSheetOptions);
    const valueRenderMode = (outputFormattingOption.general ||
        'UNFORMATTED_VALUE');
    const dateTimeRenderOption = (outputFormattingOption.date || 'FORMATTED_STRING');
    const sheetData = (await sheet.getData(range, valueRenderMode, dateTimeRenderOption));
    if (sheetData === undefined || sheetData.length === 0) {
        return [];
    }
    const { data, headerRow: keyRowIndex, firstDataRow: dataStartRowIndex, } = prepareSheetData(sheetData, dataLocationOnSheetOptions);
    let responseData = [];
    const lookupValues = this.getNodeParameter('filtersUI.values', itemIndex, []);
    const inputData = data;
    if (lookupValues.length) {
        let returnAllMatches;
        if (nodeVersion < 4.5) {
            returnAllMatches = options.returnAllMatches === 'returnAllMatches' ? true : false;
        }
        else {
            returnAllMatches =
                (additionalOptions?.returnFirstMatch ?? options.returnFirstMatch) ? false : true;
        }
        if (nodeVersion <= 4.1) {
            for (let i = 1; i < items.length; i++) {
                const itemLookupValues = this.getNodeParameter('filtersUI.values', i, []);
                if (itemLookupValues.length) {
                    lookupValues.push(...itemLookupValues);
                }
            }
        }
        const combineFilters = this.getNodeParameter('combineFilters', itemIndex, 'OR');
        responseData = await sheet.lookupValues({
            inputData,
            keyRowIndex,
            dataStartRowIndex,
            lookupValues,
            returnAllMatches,
            nodeVersion,
            combineFilters,
        });
    }
    else {
        responseData = sheet.structureArrayDataByColumn(inputData, keyRowIndex, dataStartRowIndex, includeHeadersWithEmptyCells);
    }
    returnData.push(...responseData.map((item) => {
        return {
            json: item,
            pairedItem: { item: itemIndex },
        };
    }));
    return returnData;
}
//# sourceMappingURL=readOperation.js.map