import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateVehicleDto } from './create-vehicle.dto';

describe('CreateVehicleDto', () => {
  it('accepts valid vehicle payloads', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      licensePlate: 'ABC-1D23',
      chassis: '9BWZZZ377VT004251',
      renavam: '12345678901',
      year: 2024,
      modelId: '2bbca076-8a1e-4e23-92c5-f5b33c4879fa',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('normalizes uppercase model ids before validation', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      licensePlate: 'ABC-1D23',
      chassis: '9BWZZZ377VT004251',
      renavam: '12345678901',
      year: 2024,
      modelId: '2BBCA076-8A1E-4E23-92C5-F5B33C4879FA',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.modelId).toBe('2bbca076-8a1e-4e23-92c5-f5b33c4879fa');
  });

  it('rejects invalid renavam and year', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      licensePlate: 'ABC-1D23',
      chassis: '9BWZZZ377VT004251',
      renavam: 'abc',
      year: 1800,
      modelId: 'invalid',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
