import { lonescaleApiRequest } from '../GenericFunctions';
export async function create(i) {
    const name = this.getNodeParameter('name', i);
    const entity = this.getNodeParameter('type', i);
    const body = {
        name,
        entity,
    };
    const responseData = await lonescaleApiRequest.call(this, 'POST', '/lists', body);
    return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), {
        itemData: { item: i },
    });
}
//# sourceMappingURL=list.js.map