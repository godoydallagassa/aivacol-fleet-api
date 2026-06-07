import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { vehiclesCacheTtlSeconds } from '../config/cache.config';
import { normalizeLicensePlate } from '../common/utils/string.util';
import { ModelsService } from '../models/models.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  private readonly cacheListKey = 'vehicles:list';
  private readonly cacheItemPrefix = 'vehicles:item:';

  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    private readonly modelsService: ModelsService,
    private readonly cacheService: RedisCacheService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createVehicleDto: CreateVehicleDto,
    createdBy: string,
  ): Promise<Vehicle> {
    const licensePlate = normalizeLicensePlate(createVehicleDto.licensePlate);
    await this.modelsService.findOne(createVehicleDto.modelId);
    await this.ensureUniqueFields({
      licensePlate,
      chassis: createVehicleDto.chassis,
      renavam: createVehicleDto.renavam,
    });

    const vehicle = await this.vehiclesRepository.save(
      this.vehiclesRepository.create({
        ...createVehicleDto,
        licensePlate,
        createdBy,
      }),
    );

    await this.invalidateCache();
    await this.auditService.record({
      entity: 'vehicle',
      action: 'created',
      actor: createdBy,
      entityId: vehicle.id,
      payload: { licensePlate: vehicle.licensePlate },
    });

    return this.findOne(vehicle.id);
  }

  async findAll(): Promise<Vehicle[]> {
    const cached = await this.cacheService.get<Vehicle[]>(this.cacheListKey);

    if (cached) {
      return cached;
    }

    const vehicles = await this.vehiclesRepository.find({
      relations: { model: true },
      order: { licensePlate: 'ASC' },
    });

    await this.cacheService.set(
      this.cacheListKey,
      vehicles,
      vehiclesCacheTtlSeconds(),
    );

    return vehicles;
  }

  async findOne(id: string): Promise<Vehicle> {
    const cacheKey = `${this.cacheItemPrefix}${id}`;
    const cached = await this.cacheService.get<Vehicle>(cacheKey);

    if (cached) {
      return cached;
    }

    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
      relations: { model: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    await this.cacheService.set(cacheKey, vehicle, vehiclesCacheTtlSeconds());

    return vehicle;
  }

  async update(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
    actor: string,
  ): Promise<Vehicle> {
    const vehicle = await this.findOne(id);

    if (updateVehicleDto.modelId) {
      await this.modelsService.findOne(updateVehicleDto.modelId);
      vehicle.modelId = updateVehicleDto.modelId;
    }

    const nextLicensePlate = updateVehicleDto.licensePlate
      ? normalizeLicensePlate(updateVehicleDto.licensePlate)
      : undefined;

    await this.ensureUniqueFields(
      {
        licensePlate: nextLicensePlate,
        chassis: updateVehicleDto.chassis,
        renavam: updateVehicleDto.renavam,
      },
      id,
    );

    if (nextLicensePlate) {
      vehicle.licensePlate = nextLicensePlate;
    }

    if (updateVehicleDto.chassis) {
      vehicle.chassis = updateVehicleDto.chassis;
    }

    if (updateVehicleDto.renavam) {
      vehicle.renavam = updateVehicleDto.renavam;
    }

    if (updateVehicleDto.year) {
      vehicle.year = updateVehicleDto.year;
    }

    await this.vehiclesRepository.save(vehicle);
    await this.invalidateCache();
    await this.auditService.record({
      entity: 'vehicle',
      action: 'updated',
      actor,
      entityId: id,
      payload: updateVehicleDto as Record<string, unknown>,
    });

    return this.findOne(id);
  }

  async remove(id: string, actor: string): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehiclesRepository.remove(vehicle);
    await this.invalidateCache();
    await this.auditService.record({
      entity: 'vehicle',
      action: 'removed',
      actor,
      entityId: id,
      payload: { licensePlate: vehicle.licensePlate },
    });
  }

  private async ensureUniqueFields(
    fields: {
      licensePlate?: string;
      chassis?: string;
      renavam?: string;
    },
    ignoreId?: string,
  ): Promise<void> {
    for (const [field, value] of Object.entries(fields)) {
      if (!value) {
        continue;
      }

      const existing = await this.vehiclesRepository.findOne({
        where: { [field]: value },
      });

      if (existing && existing.id !== ignoreId) {
        throw new ConflictException(`Vehicle ${field} already exists.`);
      }
    }
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheService.deleteByPattern('vehicles:*');
  }
}
