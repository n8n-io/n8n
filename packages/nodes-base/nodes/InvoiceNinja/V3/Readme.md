# Invoice Ninja Implementation V4 & V5

# Head-Repository
https://github.com/invoiceninja/invoiceninja

# Node Structure
The node is organized as a versioned node for breaking changes. 
Invoice Ninja supports 2 versions of apis: V4 & V5. These are 2 separete products. (V4 - legacy)
For better structure the resources are splits by apiVersion and resource. 
Within V5 we use the provides entities/interfaces from the programm itself.

# Updating V5 interfaces
Download Interfaces from https://github.com/invoiceninja/ui/tree/main/src/common/interfaces

Reference: https://github.com/invoiceninja/invoiceninja/issues/8198

TODOs after Import: 
 - To match the files exclude all @sentry/react & react imports / parameters