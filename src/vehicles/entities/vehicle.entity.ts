import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Model } from '../../models/entities/model.entity';

@Entity({ name: 'vehicles' })
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'license_plate', unique: true, length: 16 })
  licensePlate: string;

  @Column({ unique: true, length: 40 })
  chassis: string;

  @Column({ unique: true, length: 20 })
  renavam: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ name: 'model_id', type: 'uniqueidentifier' })
  modelId: string;

  @ManyToOne(() => Model, (model) => model.vehicles, {
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'model_id' })
  model: Model;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', length: 80 })
  createdBy: string;
}
