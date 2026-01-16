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


import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from './lib/db';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            authorize: async (credentials) => {
                const schema = z.object({
                    email: z.string().email(),
                    password: z.string().min(1),
                });

                const parsed = schema.safeParse(credentials);

                if (parsed.success) {
                    const { email, password } = parsed.data;
                    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
                    const user = result.rows[0];

                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) return { id: user.id, email: user.email };
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
});
