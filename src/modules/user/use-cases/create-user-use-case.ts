import { Injectable } from '@nestjs/common';
import { CreateUserDTO } from '../dtos/create-user-dto';
import { UserEmailUniquenessChecker } from '../services/user-email-uniqueness-checker';
import { EmailAlreadyTakenException } from '../exceptions/email-already-taken-exception';

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly emailUniqueness: UserEmailUniquenessChecker) {}
  async execute(args: CreateUserDTO) {
    if ((await this.emailUniqueness.isUnique(args.email)) === false) {
      throw new EmailAlreadyTakenException(args.email);
    }
  }
}
