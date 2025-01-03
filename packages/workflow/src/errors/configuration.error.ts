import { UserError } from './base/user.error';

/**
 * Error that indicates the user provided invalid configuration.
 *
 * Default level: info
 * Default shouldReport: false
 */
export class ConfigurationError extends UserError {}
