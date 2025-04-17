import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserUseCase } from '../use-cases/create-user-use-case';
import { CreateUserDTO } from '../dtos/create-user-dto';
import { UserEntityMapper } from '../mappers/user-entity-mapper';

@Controller('user')
export class UserController {
  constructor(private readonly createUser: CreateUserUseCase) {}

  @Post()
  async create(@Body() args: CreateUserDTO) {
    const user = await this.createUser.execute(args);
    return UserEntityMapper.toHttp(user);
  }
}
