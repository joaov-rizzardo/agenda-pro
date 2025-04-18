import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LoginDTO } from '../dtos/login-dto';
import { LoginUseCase } from '../use-cases/login-use-case';

@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @HttpCode(200)
  @Post('login')
  async login(@Body() loginDTO: LoginDTO) {
    return await this.loginUseCase.execute(loginDTO);
  }
}
