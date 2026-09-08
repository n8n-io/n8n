import { getColumnName, getColumnNumber, untilSheetSelected, } from '../../helpers/GoogleSheets.utils';
export const description = [
    {
        displayName: 'Clear',
        name: 'clear',
        type: 'options',
        options: [
            {
                name: 'Whole Sheet',
                value: 'wholeSheet',
            },
            {
                name: 'Specific Rows',
                value: 'specificRows',
            },
            {
                name: 'Specific Columns',
                value: 'specificColumns',
            },
            {
                name: 'Specific Range',
                value: 'specificRange',
            },
        ],
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['clear'],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
        default: 'wholeSheet',
        description: 'What to clear',
    },
    {
        displayName: 'Keep First Row',
        name: 'keepFirstRow',
        type: 'boolean',
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['clear'],
                clear: ['wholeSheet'],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
        default: false,
    },
    {
        displayName: 'Start Row Number',
        name: 'startIndex',
        type: 'number',
        typeOptions: {
            minValue: 1,
        },
        default: 1,
        description: 'The row number to delete from, The first row is 1',
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['clear'],
                clear: ['specificRows'],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
    },
    {
        displayName: 'Number of Rows to Delete',
        name: 'rowsToDelete',
        type: 'number',
        typeOptions: {
            minValue: 1,
        },
        default: 1,
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['clear'],
                clear: ['specificRows'],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
    },
    {
        displayName: 'Start Column',
        name: 'startIndex',
        type: 'string',
        default: 'A',
        description: 'The column to delete',
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['clear'],
                clear: ['specificColumns'],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
    },
    {
        // Could this be better as "end column"?
        displayName: 'Number of Columns to Delete',
        name: 'columnsToDelete',
        type: 'number',
        typeOptions: {
            minValue: 1,
        },
        default: 1,
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['clear'],
                clear: ['specificColumns'],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
    },
    {
        displayName: 'Range',
        name: 'range',
        type: 'string',
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['clear'],
                clear: ['specificRange'],
            },
            hide: {
                ...untilSheetSelected,
            },
        },
        default: 'A:F',
        required: true,
        description: 'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"',
    },
];
export async function execute(sheet, sheetName) {
    const items = this.getInputData();
    for (let i = 0; i < items.length; i++) {
        const clearType = this.getNodeParameter('clear', i);
        const keepFirstRow = this.getNodeParameter('keepFirstRow', i, false);
        let range = '';
        if (clearType === 'specificRows') {
            const startIndex = this.getNodeParameter('startIndex', i);
            const rowsToDelete = this.getNodeParameter('rowsToDelete', i);
            const endIndex = rowsToDelete === 1 ? startIndex : startIndex + rowsToDelete - 1;
            range = `${sheetName}!${startIndex}:${endIndex}`;
        }
        if (clearType === 'specificColumns') {
            const startIndex = this.getNodeParameter('startIndex', i);
            const columnsToDelete = this.getNodeParameter('columnsToDelete', i);
            const columnNumber = getColumnNumber(startIndex);
            const endIndex = columnsToDelete === 1 ? columnNumber : columnNumber + columnsToDelete - 1;
            range = `${sheetName}!${startIndex}:${getColumnName(endIndex)}`;
        }
        if (clearType === 'specificRange') {
            const rangeField = this.getNodeParameter('range', i);
            const region = rangeField.includes('!') ? rangeField.split('!')[1] || '' : rangeField;
            range = `${sheetName}!${region}`;
        }
        if (clearType === 'wholeSheet') {
            range = sheetName;
        }
        if (keepFirstRow) {
            const firstRow = await sheet.getData(`${range}!1:1`, 'FORMATTED_VALUE');
            await sheet.clearData(range);
            await sheet.updateRows(range, firstRow, 'RAW', 1);
        }
        else {
            await sheet.clearData(range);
        }
    }
    return items;
}
//# sourceMappingURL=clear.operation.js.map