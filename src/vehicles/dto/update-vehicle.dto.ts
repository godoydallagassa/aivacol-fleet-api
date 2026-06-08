import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const nextYear = new Date().getFullYear() + 1;

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}-?[0-9][A-Za-z0-9][0-9]{2}$/)
  licensePlate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  chassis?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{9,11}$/)
  renavam?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(nextYear)
  year?: number;

  @IsOptional()
  @IsUUID()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  modelId?: string;
}
