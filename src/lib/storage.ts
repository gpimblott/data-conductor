import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const DATA_DIR = process.env.DATA_DIR || './data';
const S3_BUCKET = process.env.AWS_S3_BUCKET || '';
const S3_REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize S3 Client only if needed (or generally, it's lazy)
const s3Client = new S3Client({ region: S3_REGION });

function sanitizeName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Creates a directory for a specific pipeline execution.
 */
export function createExecutionDirectory(executionId: string): string {
    if (STORAGE_TYPE === 's3') {
        return `executions/${executionId}`;
    } else {
        const dirPath = path.join(DATA_DIR, 'executions', executionId);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return path.resolve(dirPath);
    }
}

/**
 * Saves content to storage (Local or S3).
 * Content can be a string, Buffer, or Readable stream.
 * If filePath provided is absolute (Local), it uses it directly.
 * Otherwise it constructs path based on directory (default 'downloads').
 */
export async function saveFile(nameOrPath: string, content: string | Buffer | Readable, extension: string, directory = 'downloads'): Promise<string> {
    let filename = '';
    let isAbsolute = false;

    if (path.isAbsolute(nameOrPath) || nameOrPath.startsWith('s3://')) {
        // It's a full path/key, we might need to parse it if we want to change it, 
        // but for this function let's assume if a directory is passed, nameOrPath is just the name.
        // If directory is NOT passed/default, maybe we treat nameOrPath as full path?
        // Let's stick to the contract: nameOrPath is usually connectionName or nodeId.
        // We generate a filename.
    }

    // Logic update:
    // If saving an execution result, we might pass the execution dir as 'directory' argument or part of name.

    const safeName = sanitizeName(nameOrPath);

    // If the "directory" argument looks like a full path (e.g. from createExecutionDirectory), use it.
    // Otherwise join with data dir.

    if (STORAGE_TYPE === 's3') {
        if (!S3_BUCKET) {
            throw new Error('STORAGE_TYPE is s3 but AWS_S3_BUCKET is not set.');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const finalFilename = `${safeName}_${timestamp}.${extension}`;
        // If directory is 'executions/123', key is 'executions/123/node_timestamp.json'
        const key = `${directory}/${finalFilename}`;

        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: S3_BUCKET,
                Key: key,
                Body: content,
                ContentType: extension === 'json' ? 'application/json' : 'text/plain'
            }
        });

        await upload.done();
        return `s3://${S3_BUCKET}/${key}`;

    } else {
        // Local
        let dirPath = '';
        if (path.isAbsolute(directory)) {
            dirPath = directory;
        } else {
            dirPath = path.join(DATA_DIR, directory, safeName);
        }

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const finalFilename = `${safeName}_${timestamp}.${extension}`; // Append timestamp to avoid collisions
        const filePath = path.join(dirPath, finalFilename);
        const absPath = path.resolve(filePath);

        if (content instanceof Readable || (typeof (content as any).pipe === 'function')) {
            const writeStream = fs.createWriteStream(absPath);
            await new Promise<void>((resolve, reject) => {
                (content as Readable).pipe(writeStream);
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
                (content as Readable).on('error', reject);
            });
        } else {
            console.log('Writing file to', absPath);
            fs.writeFileSync(absPath, content);
        }

        return absPath;
    }
}

/**
 * Deletes a file from storage.
 */
export async function deleteFile(pathOrUri: string): Promise<void> {
    if (STORAGE_TYPE === 's3' || pathOrUri.startsWith('s3://')) {
        // Simple S3 Delete implementation
        /*
        const bucket = S3_BUCKET; 
        const key = pathOrUri.replace(`s3://${bucket}/`, '');
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        */
        console.warn('S3 Delete not fully implemented yet');
    } else {
        if (fs.existsSync(pathOrUri)) {
            fs.unlinkSync(pathOrUri);
        }
    }
}

/**
 * Deletes a directory recursively.
 */
export async function deleteDirectory(dirPath: string): Promise<void> {
    if (STORAGE_TYPE === 's3') {
        // S3 doesn't have directories, but we'd delete all objects with prefix
        console.warn('S3 Directory Delete not fully implemented yet');
    } else {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
    }
}

/**
 * Lists files for a specific connection (in downloads folder).
 * Returns array of full paths.
 */
export async function listConnectorFiles(connectionName: string): Promise<string[]> {
    const safeName = sanitizeName(connectionName);

    if (STORAGE_TYPE === 's3') {
        // S3 List implementation stub
        return [];
    } else {
        const dirPath = path.join(DATA_DIR, 'downloads', safeName);
        if (!fs.existsSync(dirPath)) {
            return [];
        }

        const files = fs.readdirSync(dirPath);
        // Map to full paths
        return files.map(f => path.join(dirPath, f));
    }
}
