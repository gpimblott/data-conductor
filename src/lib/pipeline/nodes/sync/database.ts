
import { SyncNode, SyncResult } from './types';
import { decrypt } from '@/lib/crypto';
import { Client } from 'pg';
import { parse } from 'pg-connection-string';
// @ts-ignore
import JSONStream from 'JSONStream';
import QueryStream from 'pg-query-stream';
import { Readable } from 'stream';

export class DatabaseSyncNode implements SyncNode {
    async execute(connection: any): Promise<SyncResult> {
        const { connection_string, sql_query, username, password } = connection;

        if (!connection_string || !sql_query) throw new Error('Missing DB config');
        console.log(`Querying remote database (streaming)...`);

        const decryptedString = decrypt(connection_string);
        // Null checks handled inside logic or by connection validation usually, but good to be safe
        const decryptedUser = username ? decrypt(username) : undefined;
        const decryptedPass = password ? decrypt(password) : undefined;

        if (!decryptedUser || !decryptedPass) {
            throw new Error('Missing database credentials.');
        }

        if (decryptedString.startsWith('mysql:')) {
            // MySQL Logic
            const mysql = (await import('mysql2')).default;
            const dbUrl = new URL(decryptedString);

            const dbConnection = mysql.createConnection({
                host: dbUrl.hostname,
                port: Number(dbUrl.port) || 3306,
                database: dbUrl.pathname.replace('/', ''),
                user: decryptedUser,
                password: decryptedPass
            });

            return new Promise<SyncResult>((resolve, reject) => {
                dbConnection.connect(async (err) => {
                    if (err) return reject(err);

                    try {
                        const query = dbConnection.query(sql_query);
                        const stream = query.stream();

                        // Pipe rows -> JSON array stream
                        const jsonStream = stream.pipe(JSONStream.stringify());

                        // We can't easily auto-end connection with simple return stream unless we wrap it.
                        // For simplicity in this refactor, we attach listeners to close connection.

                        jsonStream.on('end', () => {
                            try { dbConnection.end(); } catch (e) { console.error('Error closing mysql', e); }
                        });
                        jsonStream.on('error', () => {
                            try { dbConnection.end(); } catch (e) { console.error('Error closing mysql on error', e); }
                        });

                        resolve({
                            data: jsonStream,
                            extension: 'json',
                            fileSize: 0 // Streamed
                        });
                    } catch (e) {
                        dbConnection.end();
                        reject(e);
                    }
                });
            });

        } else {
            // Postgres Logic (Default)
            const parsedConfig = parse(decryptedString);
            const cleanConfig = Object.fromEntries(
                Object.entries(parsedConfig).map(([k, v]) => [k, v === null ? undefined : v])
            );

            const remoteClient = new Client({
                ...cleanConfig,
                user: decryptedUser,
                password: decryptedPass
            });

            await remoteClient.connect();

            // We need to manage client closure. 
            // Similar to MySQL, we'll close when stream ends.

            const query = new QueryStream(sql_query);
            const stream = remoteClient.query(query);
            const jsonStream = stream.pipe(JSONStream.stringify());

            jsonStream.on('end', () => {
                remoteClient.end().catch(e => console.error('Error closing pg client', e));
            });
            jsonStream.on('error', () => {
                remoteClient.end().catch(e => console.error('Error closing pg client on error', e));
            });

            return {
                data: jsonStream as unknown as Readable,
                extension: 'json',
                fileSize: 0
            };
        }
    }
}
