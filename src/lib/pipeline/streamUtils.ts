import fs from 'fs';
import JSONStream from 'JSONStream';
import { Readable } from 'stream';

/**
 * Creates a readable object stream from a JSON file.
 * Intelligently handles:
 * - JSON Arrays: Streams each item locally (memory efficient).
 * - JSON Objects: Streams the single root object.
 * - NDJSON (Newlines): Handled as multiple objects if possible (future enhancement, currently assumes valid JSON).
 * 
 * @param filePath Absolute path to the JSON file
 */
export async function createJsonInputStream(filePath: string): Promise<Readable> {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Input file not found: ${filePath}`);
    }

    // Peek at the first non-whitespace character to determine type
    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(100);
    const { bytesRead } = await fd.read(buffer, 0, 100, 0);
    await fd.close();

    const header = buffer.toString('utf8', 0, bytesRead).trim();

    if (header.startsWith('[')) {
        // It's an array - stream items
        return fs.createReadStream(filePath, { encoding: 'utf8' })
            .pipe(JSONStream.parse('*')) as unknown as Readable;
    } else {
        // It's likely an object (or scalar) - stream root
        // JSONStream.parse() with no args emits the root object
        // @ts-ignore
        return fs.createReadStream(filePath, { encoding: 'utf8' })
            .pipe(JSONStream.parse()) as unknown as Readable;
    }
}
