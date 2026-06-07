import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { AuditEvent } from './audit-event.interface';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly dynamoClient: DynamoDBDocumentClient;
  private readonly sqsClient: SQSClient;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') ?? 'sa-east-1';
    this.dynamoClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region }),
    );
    this.sqsClient = new SQSClient({ region });
  }

  async record(event: AuditEvent): Promise<void> {
    const audit = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    await Promise.all([this.persistToDynamo(audit), this.publishToSqs(audit)]);
  }

  private async persistToDynamo(audit: Record<string, unknown>): Promise<void> {
    const tableName = this.configService.get<string>(
      'AWS_DYNAMODB_AUDIT_TABLE',
    );

    if (!tableName) {
      return;
    }

    try {
      await this.dynamoClient.send(
        new PutCommand({
          TableName: tableName,
          Item: audit,
        }),
      );
    } catch (error) {
      this.logger.warn(`DynamoDB audit failed: ${String(error)}`);
    }
  }

  private async publishToSqs(audit: Record<string, unknown>): Promise<void> {
    const queueUrl = this.configService.get<string>('AWS_SQS_QUEUE_URL');

    if (!queueUrl) {
      return;
    }

    try {
      await this.sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(audit),
        }),
      );
    } catch (error) {
      this.logger.warn(`SQS audit failed: ${String(error)}`);
    }
  }
}
