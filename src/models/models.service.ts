import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { Model } from './entities/model.entity';

@Injectable()
export class ModelsService {
  constructor(
    @InjectRepository(Model)
    private readonly modelsRepository: Repository<Model>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createModelDto: CreateModelDto,
    createdBy: string,
  ): Promise<Model> {
    await this.ensureNameIsAvailable(createModelDto.name);

    const model = this.modelsRepository.create({
      name: createModelDto.name.trim(),
      createdBy,
    });

    const created = await this.modelsRepository.save(model);
    await this.auditService.record({
      entity: 'model',
      action: 'created',
      actor: createdBy,
      entityId: created.id,
      payload: { name: created.name },
    });

    return created;
  }

  findAll(): Promise<Model[]> {
    return this.modelsRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Model> {
    const model = await this.modelsRepository.findOne({ where: { id } });

    if (!model) {
      throw new NotFoundException('Model not found.');
    }

    return model;
  }

  async update(
    id: string,
    updateModelDto: UpdateModelDto,
    actor: string,
  ): Promise<Model> {
    const model = await this.findOne(id);

    if (updateModelDto.name && updateModelDto.name !== model.name) {
      await this.ensureNameIsAvailable(updateModelDto.name, id);
      model.name = updateModelDto.name.trim();
    }

    const updated = await this.modelsRepository.save(model);
    await this.auditService.record({
      entity: 'model',
      action: 'updated',
      actor,
      entityId: id,
      payload: updateModelDto as Record<string, unknown>,
    });

    return updated;
  }

  async remove(id: string, actor: string): Promise<void> {
    const model = await this.findOne(id);

    try {
      await this.modelsRepository.remove(model);
    } catch {
      throw new ConflictException('Model has vehicles and cannot be removed.');
    }

    await this.auditService.record({
      entity: 'model',
      action: 'removed',
      actor,
      entityId: id,
      payload: { name: model.name },
    });
  }

  private async ensureNameIsAvailable(
    name: string,
    ignoreId?: string,
  ): Promise<void> {
    const existing = await this.modelsRepository.findOne({
      where: { name: name.trim() },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Model name already exists.');
    }
  }
}
