import {
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const nextYear = new Date().getFullYear() + 1;

export class CreateVehicleDto {
  @IsString()
  @Matches(/^[A-Za-z]{3}-?[0-9][A-Za-z0-9][0-9]{2}$/)
  licensePlate: string;

  @IsString()
  @MaxLength(40)
  chassis: string;

  @IsString()
  @Matches(/^[0-9]{9,11}$/)
  renavam: string;

  @IsInt()
  @Min(1900)
  @Max(nextYear)
  year: number;

  @IsUUID()
  modelId: string;
}
