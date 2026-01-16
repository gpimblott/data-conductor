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
import jsonata from 'jsonata';

export const transformJsonHandler: NodeHandler = {
    async execute(ctx) {
        console.log('Transforming JSON...', ctx.config);

        try {
            const input = ctx.inputs[0];
            if (!input) {
                throw new Error('No input data for transformation');
            }

            let expressionString = '';

            // Handle "Simple" Mode (Mapping Rules)
            if (ctx.config.mode === 'simple' && ctx.config.rules && Array.isArray(ctx.config.rules)) {
                // rules: { target: string, source: string }[]
                // Construct object: { "target": source, ... }
                const mappings = ctx.config.rules
                    .filter((r: any) => r.target && r.source)
                    .map((r: any) => `"${r.target}": ${r.source}`)
                    .join(', ');

                expressionString = `{ ${mappings} }`;
            }
            // Handle "Advanced" Mode (Raw Expression)
            else if (ctx.config.expression) {
                expressionString = ctx.config.expression;
            } else {
                // Passthrough if no config
                return { success: true, output: input };
            }

            console.log(`Applying JSONata expression: ${expressionString}`);
            const expression = jsonata(expressionString);
            const result = await expression.evaluate(input);

            return {
                success: true,
                output: result
            };

        } catch (error: any) {
            console.error('Transformation failed:', error);
            return {
                success: false,
                error: `Transformation failed: ${error.message}`
            };
        }
    }
};
