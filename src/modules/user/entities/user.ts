import { UserRoles } from '../types/user-roles';

interface UserParams {
  id: string;
  name: string;
  role: UserRoles;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  public id: string;
  public name: string;
  public role: UserRoles;
  public lastName: string;
  public email: string;
  public password: string;
  public phone?: string;
  public avatarUrl?: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: UserParams) {
    this.id = params.id;
    this.name = params.name;
    this.role = params.role;
    this.lastName = params.lastName;
    this.email = params.email;
    this.password = params.password;
    this.phone = params.phone;
    this.avatarUrl = params.avatarUrl;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}
