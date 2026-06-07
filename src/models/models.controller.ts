import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { JwtUser } from '../common/auth/jwt-user.interface';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { Model } from './entities/model.entity';
import { ModelsService } from './models.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Post()
  create(
    @Body() createModelDto: CreateModelDto,
    @CurrentUser() user: JwtUser,
  ): Promise<Model> {
    return this.modelsService.create(createModelDto, user.username);
  }

  @Get()
  findAll(): Promise<Model[]> {
    return this.modelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Model> {
    return this.modelsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateModelDto: UpdateModelDto,
    @CurrentUser() user: JwtUser,
  ): Promise<Model> {
    return this.modelsService.update(id, updateModelDto, user.username);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser): Promise<void> {
    return this.modelsService.remove(id, user.username);
  }
}
