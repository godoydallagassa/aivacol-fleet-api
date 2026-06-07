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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser() user: JwtUser,
  ): Promise<Vehicle> {
    return this.vehiclesService.create(createVehicleDto, user.username);
  }

  @Get()
  findAll(): Promise<Vehicle[]> {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Vehicle> {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: JwtUser,
  ): Promise<Vehicle> {
    return this.vehiclesService.update(id, updateVehicleDto, user.username);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser): Promise<void> {
    return this.vehiclesService.remove(id, user.username);
  }
}
