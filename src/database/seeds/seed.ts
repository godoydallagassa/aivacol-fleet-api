import * as bcrypt from 'bcrypt';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dataSource from '../data-source';
import { User } from '../../users/entities/user.entity';
import { Model } from '../../models/entities/model.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { normalizeLicensePlate } from '../../common/utils/string.util';
import { requiredEnv } from '../../config/env';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const SEED_VEHICLES_PATH = resolve(process.cwd(), 'seed_vehicles.json');

interface SeedVehicle {
  license_plate: string;
  chassis: string;
  renavam: string;
  year: number;
  model: string;
}

function loadSeedVehicles(): SeedVehicle[] {
  const content = readFileSync(SEED_VEHICLES_PATH, 'utf8');
  const parsed = JSON.parse(content) as SeedVehicle[];

  if (!Array.isArray(parsed)) {
    throw new Error('seed_vehicles.json must contain an array.');
  }

  for (const vehicle of parsed) {
    if (
      !vehicle.license_plate ||
      !vehicle.chassis ||
      !vehicle.renavam ||
      !vehicle.year ||
      !vehicle.model
    ) {
      throw new Error('seed_vehicles.json has an invalid vehicle entry.');
    }
  }

  return parsed;
}

async function seed(): Promise<void> {
  const seedUsername = requiredEnv('SEED_USERNAME');
  const seedPassword = requiredEnv('SEED_USER_PASSWORD');
  const seedVehicles = loadSeedVehicles();
  const seedModelNames = [
    ...new Set(seedVehicles.map((vehicle) => vehicle.model)),
  ];

  await dataSource.initialize();

  const users = dataSource.getRepository(User);
  const models = dataSource.getRepository(Model);
  const vehicles = dataSource.getRepository(Vehicle);

  let user = await users.findOne({ where: { username: seedUsername } });

  if (!user) {
    user = users.create({
      username: seedUsername,
      passwordHash: await bcrypt.hash(seedPassword, SALT_ROUNDS),
      createdBy: 'seed',
    });
    await users.save(user);
  }

  for (const name of seedModelNames) {
    const exists = await models.findOne({ where: { name } });

    if (!exists) {
      await models.save(
        models.create({
          name,
          createdBy: user.username,
        }),
      );
    }
  }

  for (const vehicle of seedVehicles) {
    const licensePlate = normalizeLicensePlate(vehicle.license_plate);
    const exists = await vehicles.findOne({ where: { licensePlate } });

    if (exists) {
      continue;
    }

    const model = await models.findOneOrFail({
      where: { name: vehicle.model },
    });

    await vehicles.save(
      vehicles.create({
        licensePlate,
        chassis: vehicle.chassis,
        renavam: vehicle.renavam,
        year: vehicle.year,
        modelId: model.id,
        createdBy: user.username,
      }),
    );
  }
}

seed()
  .then(async () => {
    await dataSource.destroy();
    process.stdout.write('Seed completed.\n');
  })
  .catch(async (error: unknown) => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
