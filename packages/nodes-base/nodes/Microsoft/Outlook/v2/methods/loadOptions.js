import { getSubfolders, microsoftApiRequestAllItems } from '../transport';
// loadOptions context throughout this file: the transport's trailing `0` is its
// fallback read (getNodeParameter's 2nd arg here is a fallback, not an item index).
export async function getCategoriesNames() {
    const returnData = [];
    const categories = await microsoftApiRequestAllItems.call(this, 'value', 'GET', '/outlook/masterCategories', 0);
    for (const category of categories) {
        returnData.push({
            name: category.displayName,
            value: category.displayName,
        });
    }
    return returnData;
}
export async function getFolders() {
    const returnData = [];
    const response = await microsoftApiRequestAllItems.call(this, 'value', 'GET', '/mailFolders', 0, {});
    const folders = await getSubfolders.call(this, response, 0, true);
    for (const folder of folders) {
        returnData.push({
            name: folder.displayName,
            value: folder.id,
        });
    }
    return returnData;
}
export async function getCalendarGroups() {
    const returnData = [];
    const calendars = await microsoftApiRequestAllItems.call(this, 'value', 'GET', '/calendarGroups', 0, {});
    for (const calendar of calendars) {
        returnData.push({
            name: calendar.name,
            value: calendar.id,
        });
    }
    return returnData;
}
//# sourceMappingURL=loadOptions.js.map