import { DomainException } from 'src/common/domain-exception';

export class BadCredentialsException extends DomainException {
  code = 'BAD_CREDENTIALS';

  constructor(email: string) {
    super(`The credentials provided for ${email} are incorrect`);
  }
}
