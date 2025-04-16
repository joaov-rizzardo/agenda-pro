import { DomainException } from 'src/common/domain-exception';

export class EmailAlreadyTakenException extends DomainException {
  code = 'EMAIL_ALREADY_TAKEN';

  constructor(email: string) {
    super(`The e-mail ${email} is already in use`);
  }
}
