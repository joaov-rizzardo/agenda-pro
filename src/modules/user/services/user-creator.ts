import { Injectable } from '@nestjs/common';
import { CreateUserDTO } from '../dtos/create-user-dto';
import { User } from '../entities/user';
import { UserRepository } from '../repositories/user-repository';
import { PasswordHasher } from './password-hasher/password-hasher';

@Injectable()
export class UserCreator {
  constructor(
    private readonly repository: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async create(args: CreateUserDTO): Promise<User> {
    const hashedPassword = await this.hasher.hash(args.password);
    const user = await this.repository.create({
      ...args,
      password: hashedPassword,
    });
    return user;
  }
}
