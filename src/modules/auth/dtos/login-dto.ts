import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class LoginDTO {
  @IsNotEmpty({
    message: 'E-mail is required',
  })
  @IsEmail(
    {},
    {
      message: 'E-mail is invalid',
    },
  )
  email: string;

  @IsNotEmpty({
    message: 'Password is required',
  })
  password: string;

  @IsOptional()
  companyId?: string;
}
