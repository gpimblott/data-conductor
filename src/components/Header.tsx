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

import Image from 'next/image';
import Link from 'next/link';
import { handleSignOut } from '@/lib/actions';
import styles from './Header.module.css';

import { auth } from '@/auth';

export default async function Header() {
    const session = await auth();

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <div className={styles.logo}>
                    <Image
                        src="/icon.png"
                        alt="Logo"
                        width={32}
                        height={32}
                        className={styles.logoIcon}
                        style={{ borderRadius: '8px' }}
                    />
                    <h1>DataConductor</h1>
                    <div id="header-breadcrumb-portal"></div>
                </div>


                <div className={styles.userMenu}>
                    {session?.user && (
                        <form action={handleSignOut}>
                            <button
                                type="submit"
                                className="btn"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #404040',
                                    color: '#a3a3a3',
                                    fontSize: '0.875rem',
                                    padding: '0.5rem 1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Sign Out
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </header>
    );
}
