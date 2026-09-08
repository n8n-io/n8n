import { NodeApiError } from 'n8n-workflow';
export async function mindeeApiRequest(method, path, body = {}, qs = {}, option = {}) {
    const resource = this.getNodeParameter('resource', 0);
    let service;
    if (resource === 'receipt') {
        service = 'mindeeReceiptApi';
    }
    else {
        service = 'mindeeInvoiceApi';
    }
    const version = this.getNodeParameter('apiVersion', 0);
    // V1 of mindee is deprecated, we are keeping it for now but now V3 is active
    const url = version === 1
        ? `https://api.mindee.net/products${path}`
        : `https://api.mindee.net/v1/products/mindee${path}`;
    const options = {
        headers: {},
        method,
        body,
        qs,
        uri: url,
        json: true,
    };
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        if (Object.keys(qs).length === 0) {
            delete options.qs;
        }
        if (Object.keys(option).length !== 0) {
            Object.assign(options, option);
        }
        return await this.helpers.requestWithAuthentication.call(this, service, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export function cleanDataPreviousApiVersions(predictions) {
    const newData = {};
    for (const key of Object.keys(predictions[0])) {
        const data = predictions[0][key];
        if (key === 'taxes' && data.length) {
            newData[key] = {
                amount: data[0].amount,
                rate: data[0].rate,
            };
        }
        else if (key === 'locale') {
            //@ts-ignore
            newData.currency = data.currency;
            //@ts-ignore
            newData.locale = data.value;
        }
        else {
            newData[key] =
                //@ts-ignore
                data.value || data.name || data.raw || data.degrees || data.amount || data.iban;
        }
    }
    return newData;
}
export function cleanData(document) {
    // @ts-ignore
    const prediction = document.inference.prediction;
    const newData = {};
    newData.id = document.id;
    newData.name = document.name;
    newData.number_of_pages = document.n_pages;
    for (const key of Object.keys(prediction)) {
        const data = prediction[key];
        if (key === 'taxes' && data.length) {
            newData[key] = {
                amount: data[0].amount,
                rate: data[0].rate,
            };
        }
        else if (key === 'locale') {
            //@ts-ignore
            newData.currency = data.currency;
            //@ts-ignore
            newData.locale = data.value;
        }
        else if (key === 'line_items') {
            const lineItems = [];
            for (const lineItem of data) {
                lineItems.push({
                    description: lineItem.description,
                    product_code: lineItem.product_code,
                    quantity: lineItem.quantity,
                    tax_amount: lineItem.tax_amount,
                    tax_rate: lineItem.tax_rate,
                    total_amount: lineItem.total_amount,
                    unit_price: lineItem.unit_price,
                });
            }
            newData[key] = lineItems;
        }
        else {
            newData[key] =
                //@ts-ignore
                data.value || data.name || data.raw || data.degrees || data.amount || data.iban;
        }
    }
    return newData;
}
//# sourceMappingURL=GenericFunctions.js.map