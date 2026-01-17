/*
 * DataConductor
 * Copyright (C) 2026
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { NodeHandler } from '../registry';
import { Readable } from 'stream';

export const restApiHandler: NodeHandler = {
    async execute(ctx) {
        console.log('Calling REST API...', ctx.config);

        const { url, method = 'GET', headers, body } = ctx.config;

        if (!url) throw new Error('URL is required');

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const res = await fetch(url, options);

        if (!res.ok) {
            const errorText = await res.text(); // Read error for debugging
            throw new Error(`API Request failed: ${res.status} ${res.statusText} - ${errorText}`);
        }

        if (!res.body) {
            return { success: true, output: null };
        }

        // Convert Web Stream to Node Stream for compatibility with Orchestrator fs.pipe()
        // @ts-ignore - Readable.fromWeb exists in Node 18+ types but might be missing in older definitions
        const nodeStream = Readable.fromWeb(res.body);

        return {
            success: true,
            output: nodeStream
        };
    }
};
