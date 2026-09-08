import { NodeOperationError, UserError, WAIT_INDEFINITELY } from 'n8n-workflow';
export function configureWaitTillDate(context, location = 'options') {
    let waitTill = WAIT_INDEFINITELY;
    let limitOptions = {};
    if (location === 'options') {
        limitOptions = context.getNodeParameter('options.limitWaitTime.values', 0, {});
    }
    else {
        const limitWaitTime = context.getNodeParameter('limitWaitTime', 0, false);
        if (limitWaitTime) {
            limitOptions.limitType = context.getNodeParameter('limitType', 0, 'afterTimeInterval');
            if (limitOptions.limitType === 'afterTimeInterval') {
                limitOptions.resumeAmount = context.getNodeParameter('resumeAmount', 0, 1);
                limitOptions.resumeUnit = context.getNodeParameter('resumeUnit', 0, 'hours');
            }
            else {
                limitOptions.maxDateAndTime = context.getNodeParameter('maxDateAndTime', 0, '');
            }
        }
    }
    if (Object.keys(limitOptions).length) {
        try {
            if (limitOptions.limitType === 'afterTimeInterval') {
                let waitAmount = limitOptions.resumeAmount;
                if (limitOptions.resumeUnit === 'minutes') {
                    waitAmount *= 60;
                }
                if (limitOptions.resumeUnit === 'hours') {
                    waitAmount *= 60 * 60;
                }
                if (limitOptions.resumeUnit === 'days') {
                    waitAmount *= 60 * 60 * 24;
                }
                waitAmount *= 1000;
                waitTill = new Date(new Date().getTime() + waitAmount);
            }
            else {
                waitTill = new Date(limitOptions.maxDateAndTime);
            }
            if (isNaN(waitTill.getTime())) {
                throw new UserError('Invalid date format');
            }
        }
        catch (error) {
            throw new NodeOperationError(context.getNode(), 'Could not configure Limit Wait Time', {
                description: error.message,
            });
        }
    }
    return waitTill;
}
//# sourceMappingURL=configureWaitTillDate.util.js.map