import { googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';
export async function searchUsers() {
    const qs = {
        customer: 'my_customer',
    };
    const responseData = await googleApiRequestAllItems.call(this, 'users', 'GET', '/directory/v1/users', {}, qs);
    if (!Array.isArray(responseData)) {
        return { results: [] };
    }
    const results = responseData.map((user) => ({
        name: user.name?.fullName ?? user.id,
        value: user.id,
    }));
    return { results };
}
export async function searchGroups() {
    const qs = {
        customer: 'my_customer',
    };
    const responseData = await googleApiRequestAllItems.call(this, 'groups', 'GET', '/directory/v1/groups', {}, qs);
    if (!Array.isArray(responseData)) {
        return { results: [] };
    }
    const results = responseData.map((group) => ({
        name: group.name || group.email || 'Unnamed Group',
        value: group.id,
    }));
    return { results };
}
export async function searchDevices() {
    const qs = {
        customerId: 'my_customer',
    };
    const responseData = await googleApiRequest.call(this, 'GET', '/directory/v1/customer/my_customer/devices/chromeos/', {}, qs);
    if (!Array.isArray(responseData?.chromeosdevices)) {
        return { results: [] };
    }
    const results = responseData.chromeosdevices.map((device) => ({
        name: device.serialNumber || device.deviceId || 'Unknown Device',
        value: device.deviceId,
    }));
    return { results };
}
//# sourceMappingURL=SearchFunctions.js.map