import { Awaitable, Nullable } from 'src/common/type-utilities';
import { User } from '../entities/user';
import { CreateUserDTO } from '../dtos/create-user-dto';

export abstract class UserRepository {
  abstract findByEmail(email: string): Awaitable<Nullable<User>>;
  abstract create(args: CreateUserDTO): Awaitable<User>;
}
