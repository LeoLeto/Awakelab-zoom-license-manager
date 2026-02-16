// History Types

export interface HistoryChange {
  field: string;
  oldValue?: any;
  newValue?: any;
}

export interface HistoryMetadata {
  licenseEmail?: string;
  assignmentName?: string;
  reason?: string;
}

export interface HistoryEntry {
  _id: string;
  entityType: 'license' | 'assignment';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'unassign' | 'status_change';
  actor: string;
  changes: HistoryChange[];
  metadata?: HistoryMetadata;
  timestamp: string;
  createdAt: string;
}

export interface HistoryFilters {
  entityType?: 'license' | 'assignment';
  action?: string;
  actor?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}
