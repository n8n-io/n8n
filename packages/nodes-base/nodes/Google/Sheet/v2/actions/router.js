import * as sheet from './sheet/Sheet.resource';
import * as spreadsheet from './spreadsheet/SpreadSheet.resource';
import { GoogleSheet } from '../helpers/GoogleSheet';
import { getSpreadsheetId } from '../helpers/GoogleSheets.utils';
export async function router() {
    let operationResult = [];
    try {
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        const googleSheets = {
            resource,
            operation,
        };
        let results;
        if (googleSheets.resource === 'sheet') {
            const { mode, value } = this.getNodeParameter('documentId', 0);
            const spreadsheetId = getSpreadsheetId(this.getNode(), mode, value);
            const googleSheet = new GoogleSheet(spreadsheetId, this);
            let sheetId = '';
            let sheetName = '';
            if (operation !== 'create') {
                const sheetWithinDocument = this.getNodeParameter('sheetName', 0, undefined, {
                    extractValue: true,
                });
                const { mode: sheetMode } = this.getNodeParameter('sheetName', 0);
                const result = await googleSheet.spreadsheetGetSheet(this.getNode(), sheetMode, sheetWithinDocument);
                sheetId = result.sheetId.toString();
                sheetName = result.title;
            }
            switch (operation) {
                case 'create':
                    sheetName = spreadsheetId;
                    break;
                case 'delete':
                    sheetName = sheetId;
                    break;
                case 'remove':
                    sheetName = `${spreadsheetId}||${sheetId}`;
                    break;
            }
            results = await sheet[googleSheets.operation].execute.call(this, googleSheet, sheetName, sheetId);
        }
        else if (googleSheets.resource === 'spreadsheet') {
            results = await spreadsheet[googleSheets.operation].execute.call(this);
        }
        if (results?.length) {
            operationResult = operationResult.concat(results);
        }
    }
    catch (error) {
        if (this.continueOnFail()) {
            operationResult.push({ json: this.getInputData(0)[0].json, error });
        }
        else {
            throw error;
        }
    }
    return [operationResult];
}
//# sourceMappingURL=router.js.map