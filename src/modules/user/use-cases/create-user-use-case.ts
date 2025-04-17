import { Injectable } from '@nestjs/common';
import { CreateUserDTO } from '../dtos/create-user-dto';
import { UserEmailUniquenessChecker } from '../services/user-email-uniqueness-checker';
import { EmailAlreadyTakenException } from '../exceptions/email-already-taken-exception';
import { UserCreator } from '../services/user-creator';
import { User } from '../entities/user';

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly emailUniqueness: UserEmailUniquenessChecker,
    private readonly userCreator: UserCreator,
  ) {}
  async execute(args: CreateUserDTO): Promise<User> {
    if ((await this.emailUniqueness.isUnique(args.email)) === false) {
      throw new EmailAlreadyTakenException(args.email);
    }
    const user = await this.userCreator.create(args);
    return user;
  }
}
