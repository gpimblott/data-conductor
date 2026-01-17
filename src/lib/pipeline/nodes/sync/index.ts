
import { RssSyncNode } from './rss';
import { DatabaseSyncNode } from './database';
import { HttpSyncNode } from './http';
import { SyncNode } from './types';

export const syncRegistry: Record<string, SyncNode> = {
    'RSS': new RssSyncNode(),
    'DATABASE': new DatabaseSyncNode(),
    'HTTP': new HttpSyncNode()
};

export * from './types';
