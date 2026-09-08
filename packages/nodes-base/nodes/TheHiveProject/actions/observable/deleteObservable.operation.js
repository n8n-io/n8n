import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { observableRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [observableRLC];
const displayOptions = {
    show: {
        resource: ['observable'],
        operation: ['deleteObservable'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const observableId = this.getNodeParameter('observableId', i, '', {
        extractValue: true,
    });
    await theHiveApiRequest.call(this, 'DELETE', `/v1/observable/${observableId}`);
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=deleteObservable.operation.js.map