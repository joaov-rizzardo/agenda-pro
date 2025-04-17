import { Injectable } from '@nestjs/common';
import { UserRepository } from './user-repository';
import { PrismaService } from 'src/lib/prisma/prisma-service';
import { Nullable } from 'src/common/type-utilities';
import { User } from '../entities/user';
import { UserPrismaMapper } from '../mappers/user-prisma-mapper';
import { CreateUserDTO } from '../dtos/create-user-dto';
import { BasePrismaRepository } from 'src/lib/prisma/base-prisma-repository';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class PrismaUserRepository
  extends BasePrismaRepository
  implements UserRepository
{
  constructor(
    protected readonly cls: ClsService,
    protected readonly prismaService: PrismaService,
  ) {
    super(cls, prismaService);
  }
  
  async create(args: CreateUserDTO): Promise<User> {
    const result = await this.prisma.user.create({
      data: {
        name: args.name,
        lastName: args.lastName,
        email: args.email,
        password: args.password,
        phone: args.phone,
      },
    });
    return UserPrismaMapper.toDomain(result);
  }
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
