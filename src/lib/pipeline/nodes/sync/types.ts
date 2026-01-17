
export interface SyncResult {
    data: string | NodeJS.ReadableStream | any;
    extension: string;
    fileSize?: number; // If pre-calculated
}

export interface SyncNode {
    execute(connection: any): Promise<SyncResult>;
}
