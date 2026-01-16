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


const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('Usage: npx tsx src/scripts/create-user.ts <email> <password>');
    process.exit(1);
}

async function createUser() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        const hashedPassword = await bcrypt.hash(password, 10);

        await client.query(
            'INSERT INTO users (email, password) VALUES ($1, $2)',
            [email, hashedPassword]
        );

        console.log(`User created: ${email}`);
    } catch (e) {
        console.error('Error creating user:', e);
    } finally {
        await client.end();
    }
}

createUser();
