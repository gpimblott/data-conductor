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
 * Saves content to storage (Local or S3).
 * Content can be a string, Buffer, or Readable stream.
 * Returns the path or URI of the saved file.
 */
export async function saveFile(connectionName: string, content: string | Buffer | Readable, extension: string): Promise<string> {
    const safeName = sanitizeName(connectionName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.${extension}`;

    if (STORAGE_TYPE === 's3') {
        if (!S3_BUCKET) {
            throw new Error('STORAGE_TYPE is s3 but AWS_S3_BUCKET is not set.');
        }
        const key = `downloads/${safeName}/${filename}`;

        // Use lib-storage Upload for efficient stream handling (multipart)
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
        // Local Storage
        const dirPath = path.join(DATA_DIR, 'downloads', safeName);

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const filePath = path.join(dirPath, filename);
        const absPath = path.resolve(filePath);

        if (content instanceof Readable) {
            const writeStream = fs.createWriteStream(absPath);
            await new Promise<void>((resolve, reject) => {
                content.pipe(writeStream);
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
                // Handle stream errors too if not piped correctly? content.on('error', reject)
                content.on('error', reject);
            });
        } else {
            fs.writeFileSync(absPath, content);
        }

        return absPath;
    }
}
