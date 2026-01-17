
import { SyncNode, SyncResult } from './types';
import { XMLParser } from 'fast-xml-parser';
import { Readable } from 'stream';
// @ts-ignore
import { Readable as ReadableWeb } from 'stream/web';

export class HttpSyncNode implements SyncNode {
    async execute(connection: any): Promise<SyncResult> {
        const url = connection.source_url;
        if (!url) throw new Error('Source URL missing for HTTP connection');
        console.log(`Fetching from HTTP: ${url}`);

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP fetch failed with status ${res.status}: ${res.statusText}`);
        }

        const contentType = res.headers.get('content-type') || '';
        const isXml = contentType.includes('xml');
        const shouldConvert = connection.options?.convertXml !== false;

        if (isXml && shouldConvert) {
            // For XML Conversion, we still buffer for now as we lack streaming XML-to-JSON
            console.log('Detected XML response, buffering and converting...');
            const text = await res.text();
            try {
                const xmlParser = new XMLParser();
                const jsonObj = xmlParser.parse(text);
                const jsonStr = JSON.stringify(jsonObj, null, 2);
                return {
                    data: jsonStr,
                    extension: 'json',
                    fileSize: jsonStr.length
                };
            } catch (err) {
                console.warn('XML parsing failed, saving raw text', err);
                return {
                    data: text,
                    extension: 'txt',
                    fileSize: text.length
                };
            }
        } else {
            // Stream everything else (JSON, CSV, etc.)
            // Readable.fromWeb required for Node < 20 or consistency
            // @ts-ignore
            const nodeStream = Readable.fromWeb(res.body);
            // We default to JSON extension if json type, else txt?
            // Or try to detect?
            const ext = contentType.includes('json') ? 'json' : 'txt';

            return {
                data: nodeStream,
                extension: ext,
                fileSize: 0 // Streamed
            };
        }
    }
}
