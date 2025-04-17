import { User } from '../entities/user';

export class UserEntityMapper {
  static toHttp(user: User) {
    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
