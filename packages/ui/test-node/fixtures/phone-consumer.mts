import { parsePhoneNumber, type PhoneNumberFormat } from 'awesome-phonenumber';

const format: PhoneNumberFormat = 'e164';
const parsed = parsePhoneNumber('+594890123456');
const number: string | undefined = parsed.number?.[format];
void number;
