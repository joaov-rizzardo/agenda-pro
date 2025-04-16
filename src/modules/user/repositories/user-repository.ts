import { Awaitable, Nullable } from 'src/common/type-utilities';
import { User } from '../entities/user';

export interface UserRepository {
  findByEmail(email: string): Awaitable<Nullable<User>>;
}
