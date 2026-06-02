import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateProductDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsNumber() @Min(0) b2cPrice: number;
  @IsNumber() @Min(0) b2bPrice: number;
  @IsNumber() @Min(0) stock: number;
  @IsOptional() @IsString() unit?: string;
  @IsString() categoryId: string;
  @IsOptional() @IsNumber() @Min(0) discountPct?: number;
  @IsOptional() @IsNumber() @Min(0) kdvRate?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
