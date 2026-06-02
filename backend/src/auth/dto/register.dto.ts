import { IsEmail, IsString, MinLength, IsOptional, IsEnum, ValidateIf } from 'class-validator';

export enum AccountType {
  BIREYSEL = 'BIREYSEL',
  KURUMSAL = 'KURUMSAL',
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(AccountType)
  accountType: AccountType;

  // Kurumsal alanlar
  @ValidateIf((o) => o.accountType === AccountType.KURUMSAL)
  @IsString()
  companyName?: string;

  @ValidateIf((o) => o.accountType === AccountType.KURUMSAL)
  @IsString()
  taxNumber?: string;

  @ValidateIf((o) => o.accountType === AccountType.KURUMSAL)
  @IsString()
  taxOffice?: string;

  @ValidateIf((o) => o.accountType === AccountType.KURUMSAL)
  @IsString()
  address?: string;
}
