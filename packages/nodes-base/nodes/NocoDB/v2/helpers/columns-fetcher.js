import { apiRequest } from '../transport';
const makeUidtMapper = () => {
    const uidtMapper = {
        ID: (_field) => {
            return undefined;
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        QrCode: (field) => {
            return {
                id: field.title,
                displayName: field.title,
                type: 'string',
                display: true,
                readOnly: true,
            };
        },
        Attachment: (field) => {
            return {
                id: field.title,
                displayName: field.title,
                type: 'array',
                display: true,
                readOnly: false,
            };
        },
        SingleLineText: (field) => {
            return {
                id: field.title,
                displayName: field.title,
                type: 'string',
                display: true,
                defaultMatch: false,
                readOnly: false,
            };
        },
        Number: (field) => {
            return {
                id: field.title,
                displayName: field.title,
                type: 'number',
                display: true,
                defaultMatch: false,
                readOnly: false,
            };
        },
        Checkbox: (field) => {
            return {
                id: field.title,
                displayName: field.title,
                type: 'boolean',
                display: true,
                readOnly: false,
            };
        },
        SingleSelect: (field) => {
            const options = field.options.choices.map((opt) => ({
                name: opt.title,
                value: opt.title,
            }));
            return {
                id: field.title,
                displayName: field.title,
                type: 'options',
                options: options ?? [],
                display: true,
                defaultMatch: false,
                readOnly: false,
            };
        },
        MultiSelect: (field) => {
            return {
                id: field.title,
                displayName: field.title,
                type: 'array',
                display: true,
                defaultMatch: false,
                readOnly: false,
            };
        },
        DateTime: (field) => {
            return {
                id: field.title,
                displayName: field.title,
                type: 'dateTime',
                display: true,
                defaultMatch: false,
                readOnly: false,
            };
        },
        Url: (field) => {
            return {
                id: field.title,
                displayName: field.title,
                type: 'url',
                display: true,
                defaultMatch: false,
                readOnly: false,
            };
        },
        Links: (field) => {
            const relationType = field.options?.relationType ?? 'hm';
            let type = 'array';
            if (['bt', 'oo'].includes(relationType)) {
                type = 'string';
            }
            return {
                id: field.title,
                displayName: field.title,
                type,
                display: true,
                defaultMatch: false,
                readOnly: false,
                options: {},
            };
        },
    };
    uidtMapper['Decimal'] = uidtMapper['Number'];
    uidtMapper['Duration'] = uidtMapper['Number'];
    uidtMapper['Percent'] = uidtMapper['Number'];
    uidtMapper['Currency'] = uidtMapper['Number'];
    uidtMapper['Rating'] = uidtMapper['Number'];
    uidtMapper['Year'] = uidtMapper['Number'];
    uidtMapper['Date'] = uidtMapper['DateTime'];
    uidtMapper['LinkToAnotherRecord'] = uidtMapper['Links'];
    // readonly
    uidtMapper['Barcode'] = uidtMapper['QrCode'];
    uidtMapper['ForeignKey'] = uidtMapper['QrCode'];
    uidtMapper['CreatedBy'] = uidtMapper['QrCode'];
    uidtMapper['CreatedTime'] = uidtMapper['QrCode'];
    uidtMapper['LastModifiedBy'] = uidtMapper['QrCode'];
    uidtMapper['LastModifiedTime'] = uidtMapper['QrCode'];
    uidtMapper['Lookup'] = uidtMapper['QrCode'];
    uidtMapper['Formula'] = uidtMapper['QrCode'];
    uidtMapper['Rollup'] = uidtMapper['QrCode'];
    uidtMapper['Button'] = uidtMapper['QrCode'];
    return uidtMapper;
};
export class ColumnsFetcher {
    loadOptionsFunctions;
    constructor(loadOptionsFunctions) {
        this.loadOptionsFunctions = loadOptionsFunctions;
    }
    async mapperFieldsFromDefinedParam() {
        const fetchResult = await this.fetchFromDefinedParam();
        return this.mapApiResultToMapperFields(fetchResult);
    }
    async fetchFromDefinedParam() {
        const baseId = this.loadOptionsFunctions.getNodeParameter('projectId', 0, {
            extractValue: true,
        });
        const tableId = this.loadOptionsFunctions.getNodeParameter('table', 0, {
            extractValue: true,
        });
        return await this.fetch({
            baseId,
            tableId,
        });
    }
    async fetch({ baseId, tableId, }) {
        const url = `/api/v3/meta/bases/${baseId}/tables/${tableId}`;
        const response = await apiRequest.call(this.loadOptionsFunctions, 'GET', url, {}, {});
        return response.fields;
    }
    mapApiResultToMapperFields(apiResponse) {
        const uidtMapper = makeUidtMapper();
        return apiResponse
            .map((field) => {
            return uidtMapper[field.type]
                ? uidtMapper[field.type](field)
                : uidtMapper['SingleLineText'](field);
        })
            .filter((k) => k);
    }
}
//# sourceMappingURL=columns-fetcher.js.map