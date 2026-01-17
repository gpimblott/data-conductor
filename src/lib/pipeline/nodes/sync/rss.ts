import Parser from 'rss-parser';
import { SyncNode, SyncResult } from './types';

const parser = new Parser();

export class RssSyncNode implements SyncNode {
    async execute(connection: any): Promise<SyncResult> {
        const url = connection.source_url;
        if (!url) throw new Error('Source URL missing for RSS connection');
        console.log(`Fetching RSS feed from: ${url}`);

        let content = '';
        let ext = 'json';
        try {
            const feed = await parser.parseURL(url);
            content = JSON.stringify(feed, null, 2);
        } catch (err) {
            console.warn('RSS parse failed, trying raw fetch...', err);
            const res = await fetch(url);
            content = await res.text();
            ext = 'txt';
        }

        return {
            data: content,
            extension: ext,
            fileSize: content.length
        };
    }
}
