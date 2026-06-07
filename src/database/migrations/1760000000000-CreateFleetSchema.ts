import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFleetSchema1760000000000 implements MigrationInterface {
  name = 'CreateFleetSchema1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('users', 'U') IS NULL
      BEGIN
        CREATE TABLE users (
          id uniqueidentifier NOT NULL CONSTRAINT DF_users_id DEFAULT NEWID(),
          username nvarchar(80) NOT NULL,
          password_hash nvarchar(255) NOT NULL,
          created_at datetime2 NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
          updated_at datetime2 NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME(),
          created_by nvarchar(80) NOT NULL CONSTRAINT DF_users_created_by DEFAULT 'system',
          CONSTRAINT PK_users PRIMARY KEY (id),
          CONSTRAINT UQ_users_username UNIQUE (username)
        );
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('models', 'U') IS NULL
      BEGIN
        CREATE TABLE models (
          id uniqueidentifier NOT NULL CONSTRAINT DF_models_id DEFAULT NEWID(),
          name nvarchar(120) NOT NULL,
          created_at datetime2 NOT NULL CONSTRAINT DF_models_created_at DEFAULT SYSUTCDATETIME(),
          updated_at datetime2 NOT NULL CONSTRAINT DF_models_updated_at DEFAULT SYSUTCDATETIME(),
          created_by nvarchar(80) NOT NULL,
          CONSTRAINT PK_models PRIMARY KEY (id),
          CONSTRAINT UQ_models_name UNIQUE (name)
        );
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('vehicles', 'U') IS NULL
      BEGIN
        CREATE TABLE vehicles (
          id uniqueidentifier NOT NULL CONSTRAINT DF_vehicles_id DEFAULT NEWID(),
          license_plate nvarchar(16) NOT NULL,
          chassis nvarchar(40) NOT NULL,
          renavam nvarchar(20) NOT NULL,
          year int NOT NULL,
          model_id uniqueidentifier NOT NULL,
          created_at datetime2 NOT NULL CONSTRAINT DF_vehicles_created_at DEFAULT SYSUTCDATETIME(),
          updated_at datetime2 NOT NULL CONSTRAINT DF_vehicles_updated_at DEFAULT SYSUTCDATETIME(),
          created_by nvarchar(80) NOT NULL,
          CONSTRAINT PK_vehicles PRIMARY KEY (id),
          CONSTRAINT UQ_vehicles_license_plate UNIQUE (license_plate),
          CONSTRAINT UQ_vehicles_chassis UNIQUE (chassis),
          CONSTRAINT UQ_vehicles_renavam UNIQUE (renavam),
          CONSTRAINT FK_vehicles_models FOREIGN KEY (model_id) REFERENCES models(id)
        );
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_vehicles_model_id'
          AND object_id = OBJECT_ID('vehicles')
      )
      BEGIN
        CREATE INDEX IX_vehicles_model_id ON vehicles(model_id);
      END
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('vehicles', 'U') IS NOT NULL DROP TABLE vehicles;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('models', 'U') IS NOT NULL DROP TABLE models;
    `);
    await queryRunner.query(`
      IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
    `);
  }
}
