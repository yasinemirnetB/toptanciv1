import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';

@Module({
  providers: [ProductsService],
  controllers: [ProductsController, CategoriesController],
  exports: [ProductsService],
})
export class ProductsModule {}
