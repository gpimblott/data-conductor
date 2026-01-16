import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

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
 * Saves content to storage (Local or S3).
 * Returns the path or URI of the saved file.
 */
export async function saveFile(connectionName: string, content: string, extension: string): Promise<string> {
    const safeName = sanitizeName(connectionName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.${extension}`;

    if (STORAGE_TYPE === 's3') {
        if (!S3_BUCKET) {
            throw new Error('STORAGE_TYPE is s3 but AWS_S3_BUCKET is not set.');
        }
        const key = `downloads/${safeName}/${filename}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: content,
            ContentType: extension === 'json' ? 'application/json' : 'text/plain'
        }));

        return `s3://${S3_BUCKET}/${key}`;
    } else {
        // Local Storage
        const dirPath = path.join(DATA_DIR, 'downloads', safeName);

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const filePath = path.join(dirPath, filename);
        // Absolute path is better for return value consistency? Or relative? 
        // Logic currently expects a path it can read or reference. 
        // path.resolve to match typical expectations.
        const absPath = path.resolve(filePath);

        fs.writeFileSync(absPath, content);
        return absPath;
    }
}
