import { NodeOperationError } from 'n8n-workflow';
import { parseToApiNodeOperationError } from '../helpers';
import { ColumnsFetcher } from '../helpers/columns-fetcher';
import { apiRequest } from '../transport';
export async function getDownloadFields() {
    const fetcher = new ColumnsFetcher(this);
    try {
        const fields = await fetcher.fetchFromDefinedParam();
        return fields
            .filter((field) => field.type === 'Attachment')
            .map((field) => {
            return {
                name: field.title,
                value: field.title,
            };
        });
    }
    catch (e) {
        throw parseToApiNodeOperationError({
            error: e,
            errorLevel: 'warning',
            subject: 'Error while fetching fields:',
            node: this.getNode(),
        });
    }
}
export async function getFields() {
    const baseId = this.getNodeParameter('projectId', 0, {
        extractValue: true,
    });
    const tableId = this.getNodeParameter('table', 0, {
        extractValue: true,
    });
    if (tableId) {
        try {
            const requestMethod = 'GET';
            const endpoint = `/api/v3/meta/bases/${baseId}/tables/${tableId}`;
            const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
            return responseData.fields.map((i) => {
                return {
                    name: i.title,
                    value: i.id,
                };
            });
        }
        catch (e) {
            throw parseToApiNodeOperationError({
                error: e,
                errorLevel: 'warning',
                subject: 'Error while fetching fields:',
                node: this.getNode(),
            });
        }
    }
    else {
        throw new NodeOperationError(this.getNode(), 'No table selected!', {
            level: 'warning',
        });
    }
}
//# sourceMappingURL=loadOptions.js.map