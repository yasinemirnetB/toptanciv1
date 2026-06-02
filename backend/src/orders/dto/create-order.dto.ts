import { IsString, IsArray, ValidateNested, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString() productId: string;
  @IsNumber() @Min(1) quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString() paymentType: string;
  @IsString() shippingAddr: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() customerId?: string;
}
