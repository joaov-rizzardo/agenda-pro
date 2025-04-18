import { Awaitable } from 'src/common/type-utilities';
import { AccessTokenPayload } from '../../types/token-payload';
import {
  AccessTokenGenerator,
  AccessTokenOptions,
} from './access-token-generator';
import * as jwt from 'jsonwebtoken';

const EXPIRES_IN_FIVE_MINUTES = 60 * 5;

type CustomJwtPayload = jwt.JwtPayload & AccessTokenPayload;

export class JwtAccessTokenAdapter implements AccessTokenGenerator {
  private ACCESS_TOKEN_SECRET: string = 'access token';
  async generate(options: AccessTokenOptions): Promise<string> {
    return jwt.sign(
      {
        email: options.email,
        role: options.role,
        companyId: options.companyId,
      },
      this.ACCESS_TOKEN_SECRET,
      {
        subject: options.userId,
        expiresIn: EXPIRES_IN_FIVE_MINUTES,
      },
    );
  }
  check(token: string): Awaitable<boolean> {
    try {
      return Boolean(jwt.verify(token, this.ACCESS_TOKEN_SECRET));
    } catch {
      return false;
    }
  }
  decode(token: string): Awaitable<AccessTokenPayload> {
    const accessToken = jwt.decode(token) as CustomJwtPayload;
    return {
      sub: accessToken.sub,
      companyId: accessToken.companyId,
      email: accessToken.email,
      exp: accessToken.exp,
      iat: accessToken.iat,
      role: accessToken.role,
    };
  }
}
