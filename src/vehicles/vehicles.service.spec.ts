import { ConflictException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from './entities/vehicle.entity';

describe('VehiclesService', () => {
  const model = { id: 'model-id', name: 'Sprinter' };
  const vehicle = {
    id: 'vehicle-id',
    licensePlate: 'ABC1D23',
    chassis: '9BWZZZ377VT004251',
    renavam: '12345678901',
    year: 2024,
    modelId: model.id,
    model,
    createdBy: 'aivacol',
  } as Vehicle;

  function buildService() {
    const repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((payload: Partial<Vehicle>) => ({
        id: 'vehicle-id',
        ...payload,
      })),
      save: jest.fn((payload: Vehicle) => Promise.resolve(payload)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const modelsService = {
      findOne: jest.fn().mockResolvedValue(model),
    };
    const cacheService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      deleteByPattern: jest.fn().mockResolvedValue(undefined),
    };
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const service = new VehiclesService(
      repository as never,
      modelsService as never,
      cacheService as never,
      auditService as never,
    );

    return { service, repository, modelsService, cacheService, auditService };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached vehicle list without querying the database', async () => {
    const { service, repository, cacheService } = buildService();
    cacheService.get.mockResolvedValue([vehicle]);

    const result = await service.findAll();

    expect(result).toEqual([vehicle]);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('stores vehicle list in Redis cache when cache misses', async () => {
    const { service, repository, cacheService } = buildService();
    cacheService.get.mockResolvedValue(null);
    repository.find.mockResolvedValue([vehicle]);

    const result = await service.findAll();

    expect(result).toEqual([vehicle]);
    expect(cacheService.set).toHaveBeenCalledWith(
      'vehicles:list',
      [vehicle],
      expect.any(Number),
    );
  });

  it('creates a vehicle, invalidates cache and records audit', async () => {
    const { service, repository, cacheService, auditService } = buildService();
    cacheService.get.mockResolvedValue(null);
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(vehicle);

    const created = await service.create(
      {
        licensePlate: 'abc-1d23',
        chassis: vehicle.chassis,
        renavam: vehicle.renavam,
        year: vehicle.year,
        modelId: vehicle.modelId,
      },
      'aivacol',
    );

    expect(created.licensePlate).toBe('ABC1D23');
    expect(cacheService.deleteByPattern).toHaveBeenCalledWith('vehicles:*');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'vehicle',
        action: 'created',
        actor: 'aivacol',
      }),
    );
  });

  it('rejects duplicated license plates', async () => {
    const { service, repository } = buildService();
    repository.findOne.mockResolvedValue(vehicle);

    await expect(
      service.create(
        {
          licensePlate: 'ABC1D23',
          chassis: vehicle.chassis,
          renavam: vehicle.renavam,
          year: vehicle.year,
          modelId: vehicle.modelId,
        },
        'aivacol',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
