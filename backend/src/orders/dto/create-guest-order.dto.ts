import { IsString, IsArray, ValidateNested, IsNumber, IsOptional, Min, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

class GuestOrderItemDto {
  @IsString() productId: string;
  @IsNumber() @Min(1) quantity: number;
}

export class CreateGuestOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestOrderItemDto)
  items: GuestOrderItemDto[];

  @IsString() guestName: string;
  @IsEmail() guestEmail: string;
  @IsString() guestPhone: string;
  @IsString() shippingAddr: string;
  @IsOptional() @IsString() notes?: string;
}
