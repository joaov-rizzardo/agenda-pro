import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user-repository';
import { PrismaUserRepository } from './repositories/prisma-user-repository';
import { PasswordHasher } from './services/password-hasher/password-hasher';
import { BcryptPasswordAdapter } from './services/password-hasher/bcrypt-password-adapter';
import { UserCreator } from './services/user-creator';
import { UserEmailUniquenessChecker } from './services/user-email-uniqueness-checker';
import { CreateUserUseCase } from './use-cases/create-user-use-case';

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: PasswordHasher,
      useClass: BcryptPasswordAdapter,
    },
    UserCreator,
    UserEmailUniquenessChecker,
    CreateUserUseCase,
  ],
  exports: [UserRepository, PasswordHasher],
})
export class UserModule {}
