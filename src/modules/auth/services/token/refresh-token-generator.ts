import { Awaitable } from 'src/common/type-utilities';
import { RefreshTokenPayload } from '../../types/token-payload';

export abstract class RefreshTokenGenerator {
  abstract generate(userId: string, companyId?: string): Awaitable<string>;
  abstract check(token: string): Awaitable<boolean>;
  abstract decode(token: string): Awaitable<RefreshTokenPayload>;
}
