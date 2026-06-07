import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Model } from './entities/model.entity';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';

@Module({
  imports: [TypeOrmModule.forFeature([Model])],
  controllers: [ModelsController],
  providers: [ModelsService],
  exports: [ModelsService],
})
export class ModelsModule {}
