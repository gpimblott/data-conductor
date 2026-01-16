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

export const restApiHandler: NodeHandler = {
    async execute(ctx) {
        console.log('Calling REST API...', ctx.config);

        // TODO: Implement actual REST API call here
        // 1. Extract URL, method, headers, and body from ctx.config
        // 2. Perform fetch()
        // 3. Return response data

        return {
            success: true,
            output: {
                ...ctx.inputs[0],
                apiResponse: { status: 200, data: { mock: 'response' } },
                source: 'REST API Stub'
            }
        };
    }
};
