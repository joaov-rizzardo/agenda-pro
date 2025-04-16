import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user-repository';

@Injectable()
export class UserEmailUniquenessChecker {
  constructor(private readonly repository: UserRepository) {}
  async isUnique(email: string): Promise<boolean> {
    const user = await this.repository.findByEmail(email);
    const isUnique = user === null;
    return isUnique;
  }
}
