import { Injectable } from '@nestjs/common';
import { PasswordHasher } from './password-hasher';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptPasswordAdapter implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  }
  async check(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}
