import { Injectable } from '@nestjs/common';
import { UserRepository } from './user-repository';
import { PrismaService } from 'src/lib/prisma/prisma-service';
import { Nullable } from 'src/common/type-utilities';
import { User } from '../entities/user';
import { UserPrismaMapper } from '../mappers/user-prisma-mapper';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findByEmail(email: string): Promise<Nullable<User>> {
    const result = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!result) return null;
    return UserPrismaMapper.toDomain(result);
  }
}
