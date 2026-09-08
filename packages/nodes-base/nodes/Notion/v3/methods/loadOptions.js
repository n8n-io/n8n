import moment from 'moment-timezone';
import { extractPageId, getBlockTypesOptions } from '../../shared/GenericFunctions';
import { splitPropertyKey } from '../helpers/utils';
import { getDataSourceProperties, isDataObject, notionApiRequestAllItemsV3, notionApiRequestV3, } from '../transport';
const READ_ONLY_PROPERTY_TYPES = [
    'created_time',
    'last_edited_time',
    'created_by',
    'last_edited_by',
    'formula',
    'rollup',
];
async function getSelectedDataSourceProperties(parameterName = 'dataSourceId') {
    const dataSourceId = this.getCurrentNodeParameter(parameterName, {
        extractValue: true,
    });
    if (!dataSourceId) {
        throw new Error('No data source ID selected');
    }
    return await getDataSourceProperties.call(this, dataSourceId);
}
function mapPropertiesToOptions(properties, options) {
    if (!properties) {
        return [];
    }
    const returnData = [];
    for (const key of Object.keys(properties)) {
        const property = properties[key];
        if (!isDataObject(property) || typeof property.type !== 'string')
            continue;
        if (!options.includeReadOnly && READ_ONLY_PROPERTY_TYPES.includes(property.type))
            continue;
        returnData.push({
            name: key,
            value: `${key}|${property.type}`,
        });
    }
    return returnData.sort((a, b) => a.name.localeCompare(b.name));
}
function mapSelectOptions(options) {
    return options.filter(isDataObject).flatMap((option) => {
        if (typeof option.name !== 'string')
            return [];
        return {
            name: option.name,
            value: option.name,
        };
    });
}
export async function getDataSourcePropertiesOptions() {
    const properties = await getSelectedDataSourceProperties.call(this);
    return mapPropertiesToOptions(properties, { includeReadOnly: false });
}
export async function getFilterProperties() {
    const properties = await getSelectedDataSourceProperties.call(this);
    return mapPropertiesToOptions(properties, { includeReadOnly: true });
}
export async function getBlockTypes() {
    return getBlockTypesOptions();
}
export async function getPropertySelectValues() {
    const key = this.getCurrentNodeParameter('&key');
    if (!key) {
        return [];
    }
    const { name, type } = splitPropertyKey(key);
    const properties = await getSelectedDataSourceProperties.call(this);
    const property = properties?.[name];
    if (!isDataObject(property) ||
        !isDataObject(property[type]) ||
        !Array.isArray(property[type].options)) {
        return [];
    }
    return mapSelectOptions(property[type].options);
}
export async function getUsers() {
    const returnData = [];
    const users = await notionApiRequestAllItemsV3.call(this, 'results', 'GET', '/users');
    for (const user of users) {
        if (isDataObject(user) && user.type === 'person') {
            returnData.push({
                name: user.name,
                value: user.id,
            });
        }
    }
    return returnData;
}
async function getParentDataSourceIdFromPage() {
    const pageIdValue = this.getCurrentNodeParameter('pageId', { extractValue: true });
    const pageId = extractPageId(pageIdValue ?? '');
    if (!pageId) {
        return undefined;
    }
    const page = await notionApiRequestV3.call(this, 'GET', `/pages/${pageId}`);
    if (!isDataObject(page) || !isDataObject(page.parent)) {
        return undefined;
    }
    const parent = page.parent;
    return typeof parent.data_source_id === 'string' ? parent.data_source_id : undefined;
}
export async function getDataSourcePropertiesFromPage() {
    const dataSourceId = await getParentDataSourceIdFromPage.call(this);
    if (!dataSourceId) {
        return [];
    }
    const properties = await getDataSourceProperties.call(this, dataSourceId);
    return mapPropertiesToOptions(properties, { includeReadOnly: false });
}
export async function getDataSourceOptionsFromPage() {
    const key = this.getCurrentNodeParameter('&key');
    if (!key) {
        return [];
    }
    const { name, type } = splitPropertyKey(key);
    const dataSourceId = await getParentDataSourceIdFromPage.call(this);
    if (!dataSourceId)
        return [];
    const properties = await getDataSourceProperties.call(this, dataSourceId);
    const property = properties[name];
    if (!isDataObject(property) ||
        !isDataObject(property[type]) ||
        !Array.isArray(property[type].options)) {
        return [];
    }
    return mapSelectOptions(property[type].options);
}
export async function getTimezones() {
    const returnData = [];
    for (const timezone of moment.tz.names()) {
        returnData.push({
            name: timezone,
            value: timezone,
        });
    }
    returnData.unshift({
        name: 'Default',
        value: 'default',
        description: 'Timezone set in n8n',
    });
    return returnData;
}
//# sourceMappingURL=loadOptions.js.map