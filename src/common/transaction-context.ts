import { Awaitable } from './type-utilities';

export abstract class TransactionContext {
  abstract run<T>(callback: () => Awaitable<T>): Awaitable<T>;
}
