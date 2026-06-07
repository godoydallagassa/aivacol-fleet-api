import { ConflictException, NotFoundException } from '@nestjs/common';
import { ModelsService } from './models.service';
import { Model } from './entities/model.entity';

describe('ModelsService', () => {
  const auditService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  function buildRepository() {
    return {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((payload: Partial<Model>) => ({
        id: 'model-id',
        ...payload,
      })),
      save: jest.fn((model: Model) => Promise.resolve(model)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a model and records audit', async () => {
    const repository = buildRepository();
    repository.findOne.mockResolvedValue(null);
    const service = new ModelsService(
      repository as never,
      auditService as never,
    );

    const model = await service.create({ name: 'Sprinter' }, 'aivacol');

    expect(model.name).toBe('Sprinter');
    expect(repository.save).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'model',
        action: 'created',
        actor: 'aivacol',
      }),
    );
  });

  it('rejects duplicated model names', async () => {
    const repository = buildRepository();
    repository.findOne.mockResolvedValue({
      id: 'existing-id',
      name: 'Sprinter',
    });
    const service = new ModelsService(
      repository as never,
      auditService as never,
    );

    await expect(
      service.create({ name: 'Sprinter' }, 'aivacol'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found when model does not exist', async () => {
    const repository = buildRepository();
    repository.findOne.mockResolvedValue(null);
    const service = new ModelsService(
      repository as never,
      auditService as never,
    );

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
