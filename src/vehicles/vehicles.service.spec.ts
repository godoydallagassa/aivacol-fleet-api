import { ConflictException, NotFoundException } from '@nestjs/common';
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
  const actor = 'unit-test-user';

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
    expect(cacheService.get).toHaveBeenCalledWith('vehicles:list');
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('stores vehicle list in Redis cache when cache misses', async () => {
    const { service, repository, cacheService } = buildService();
    cacheService.get.mockResolvedValue(null);
    repository.find.mockResolvedValue([vehicle]);

    const result = await service.findAll();

    expect(result).toEqual([vehicle]);
    expect(cacheService.get).toHaveBeenCalledWith('vehicles:list');
    expect(repository.find).toHaveBeenCalledWith({
      relations: { model: true },
      order: { licensePlate: 'ASC' },
    });
    expect(cacheService.set).toHaveBeenCalledWith(
      'vehicles:list',
      [vehicle],
      expect.any(Number),
    );
  });

  it('creates a vehicle, invalidates cache and records audit', async () => {
    const { service, repository, modelsService, cacheService, auditService } =
      buildService();
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
    expect(modelsService.findOne).toHaveBeenCalledWith(vehicle.modelId);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        licensePlate: 'ABC1D23',
      }),
    );
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
    const { service, repository, cacheService, auditService } = buildService();
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

    expect(repository.save).not.toHaveBeenCalled();
    expect(cacheService.deleteByPattern).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('returns a cached vehicle by id without querying the database', async () => {
    const { service, repository, cacheService } = buildService();
    cacheService.get.mockResolvedValue(vehicle);

    const result = await service.findOne(vehicle.id);

    expect(result).toEqual(vehicle);
    expect(cacheService.get).toHaveBeenCalledWith(
      `vehicles:item:${vehicle.id}`,
    );
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('stores vehicle by id in Redis cache when cache misses', async () => {
    const { service, repository, cacheService } = buildService();
    cacheService.get.mockResolvedValue(null);
    repository.findOne.mockResolvedValue(vehicle);

    const result = await service.findOne(vehicle.id);

    expect(result).toEqual(vehicle);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: vehicle.id },
      relations: { model: true },
    });
    expect(cacheService.set).toHaveBeenCalledWith(
      `vehicles:item:${vehicle.id}`,
      vehicle,
      expect.any(Number),
    );
  });

  it('throws not found when vehicle does not exist', async () => {
    const { service, repository, cacheService } = buildService();
    cacheService.get.mockResolvedValue(null);
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates a vehicle, invalidates cache and records audit', async () => {
    const { service, repository, cacheService, auditService } = buildService();
    const updatedVehicle = {
      ...vehicle,
      licensePlate: 'XYZ9B88',
      chassis: '9BWZZZ377VT009999',
      renavam: '98765432109',
      year: 2025,
    };
    const updateDto = {
      licensePlate: 'xyz-9b88',
      chassis: updatedVehicle.chassis,
      renavam: updatedVehicle.renavam,
      year: updatedVehicle.year,
    };

    cacheService.get.mockResolvedValue(null);
    repository.findOne
      .mockResolvedValueOnce(vehicle)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(updatedVehicle);
    repository.save.mockResolvedValue(updatedVehicle);

    const result = await service.update(vehicle.id, updateDto, actor);

    expect(result).toEqual(updatedVehicle);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: vehicle.id,
        licensePlate: 'XYZ9B88',
        chassis: updatedVehicle.chassis,
        renavam: updatedVehicle.renavam,
        year: updatedVehicle.year,
      }),
    );
    expect(cacheService.deleteByPattern).toHaveBeenCalledWith('vehicles:*');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'vehicle',
        action: 'updated',
        actor,
        entityId: vehicle.id,
      }),
    );
  });

  it('removes a vehicle, invalidates cache and records audit', async () => {
    const { service, repository, cacheService, auditService } = buildService();
    cacheService.get.mockResolvedValue(null);
    repository.findOne.mockResolvedValue(vehicle);

    await service.remove(vehicle.id, actor);

    expect(repository.remove).toHaveBeenCalledWith(vehicle);
    expect(cacheService.deleteByPattern).toHaveBeenCalledWith('vehicles:*');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'vehicle',
        action: 'removed',
        actor,
        entityId: vehicle.id,
        payload: { licensePlate: vehicle.licensePlate },
      }),
    );
  });
});
