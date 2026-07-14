import { SERVICE_PRINCIPAL_AUTH } from './constants';
import type { AuthContext, ExcelSharePointCredentialType } from './interfaces';

export function getExcelSharePointCredentialType(this: AuthContext): ExcelSharePointCredentialType {
	// In load-options contexts the 2nd arg is the fallback, not an item index — keep the 2-arg form
	const selected = this.getNodeParameter('authentication', 0);
	return selected === SERVICE_PRINCIPAL_AUTH ? SERVICE_PRINCIPAL_AUTH : 'microsoftOAuth2Api';
}
