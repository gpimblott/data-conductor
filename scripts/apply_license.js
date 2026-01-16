const fs = require('fs');
const path = require('path');

const LICENSE_HEADER = `/*
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

`;

const TARGET_DIR = path.join(__dirname, '../src');
const EXTENSIONS = ['.ts', '.tsx', '.js'];

function walkAndApply(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walkAndApply(filePath);
        } else if (EXTENSIONS.includes(path.extname(file))) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (!content.includes('GNU General Public License')) {
                fs.writeFileSync(filePath, LICENSE_HEADER + content);
                console.log(`Applied license to: ${filePath}`);
            }
        }
    }
}

console.log(`Applying license headers to files in ${TARGET_DIR}...`);
walkAndApply(TARGET_DIR);
console.log('Done.');
