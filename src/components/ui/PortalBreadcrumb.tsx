/*
 * DataConductor
 * Copyright (C) 2026
 */

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Breadcrumb } from './Breadcrumb';

interface PortalBreadcrumbProps {
    items: { label: string; href?: string }[];
}

export const PortalBreadcrumb: React.FC<PortalBreadcrumbProps> = ({ items }) => {
    const [mounted, setMounted] = useState(false);
    const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setMounted(true);
        setPortalElement(document.getElementById('header-breadcrumb-portal'));
    }, []);

    if (!mounted || !portalElement) {
        return null;
    }

    return createPortal(
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '1px', height: '24px', background: '#404040', marginRight: '1rem' }}></div>
            <Breadcrumb items={items} />
        </div>,
        portalElement
    );
};
