import { User as PrismaUser } from '@prisma/client';
import { User } from '../entities/user';

export class UserPrismaMapper {
  static toDomain(user: PrismaUser): User {
    return new User({
      id: user.id,
      name: user.name,
      role: user.role,
      lastName: user.lastName,
      email: user.email,
      password: user.password,
      avatarUrl: user.avatarUrl ?? undefined,
      phone: user.phone ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
