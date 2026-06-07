export interface AuditEvent {
  entity: 'model' | 'vehicle';
  action: 'created' | 'updated' | 'removed';
  actor: string;
  entityId: string;
  payload: Record<string, unknown>;
}
