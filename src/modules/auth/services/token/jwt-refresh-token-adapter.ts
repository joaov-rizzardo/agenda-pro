import { Awaitable } from 'src/common/type-utilities';
import { RefreshTokenGenerator } from './refresh-token-generator';
import * as jwt from 'jsonwebtoken';
import { RefreshTokenPayload } from '../../types/token-payload';

const EXPIRES_IN_ONE_WEEK = 60 * 60 * 24 * 7;

type CustomJwtPayload = jwt.JwtPayload & RefreshTokenPayload;

export class JwtRefreshTokenAdapter implements RefreshTokenGenerator {
  private REFRESH_TOKEN_SECRET: string = 'access token';
  async generate(userId: string, companyId: string): Promise<string> {
    return jwt.sign({ companyId }, this.REFRESH_TOKEN_SECRET, {
      subject: userId,
      expiresIn: EXPIRES_IN_ONE_WEEK,
    });
  }
  check(token: string): Awaitable<boolean> {
    try {
      return Boolean(jwt.verify(token, this.REFRESH_TOKEN_SECRET));
    } catch {
      return false;
    }
  }
  decode(token: string): Awaitable<RefreshTokenPayload> {
    const refreshToken = jwt.decode(token) as CustomJwtPayload;
    return {
      sub: refreshToken.sub,
      companyId: refreshToken.companyId,
      exp: refreshToken.exp,
      iat: refreshToken.iat,
    };
  }
}
