import { Nullable } from "src/common/type-utilities";
import { CompanyMember } from "src/modules/company/entities/company-member";
import { User } from "src/modules/user/entities/user";
import { LoginTemplate } from "./login-template";

export class BasicLogin extends LoginTemplate {
    protected async getCompanyData(_: User): Promise<Nullable<CompanyMember>> {
        return null;
    }
}