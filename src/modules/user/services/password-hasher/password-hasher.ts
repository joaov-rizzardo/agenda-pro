import { Awaitable } from 'src/common/type-utilities';

export abstract class PasswordHasher {
  abstract hash(password: string): Awaitable<string>;
  abstract check(password: string, hashedPassword: string): Awaitable<boolean>;
}
