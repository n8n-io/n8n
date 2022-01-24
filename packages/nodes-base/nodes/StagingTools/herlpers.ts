import {QA_EMAILS, UNLIMITED_STAGES} from './constants';

export function isValid(stage: string, email: string):boolean{
	const isUnlimited = UNLIMITED_STAGES.includes(stage);
	const isLimited = !isUnlimited;
	const isQAEmail = QA_EMAILS.includes(email);
	return isUnlimited || (isLimited && isQAEmail);
}
