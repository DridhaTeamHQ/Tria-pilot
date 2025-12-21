"use client";

import { ReactLenis as Lenis } from "@studio-freight/react-lenis";
import { useEffect, useState } from "react";

/**
 * PERFORMANCE-OPTIMIZED SMOOTH SCROLL
 * 
 * Optimizations:
 * - Higher lerp (0.12) for faster response, less lag
 * - Shorter duration (1.0) for snappier feel
 * - Only smoothWheel (not touch) - touch devices use native scroll
 * - Disabled when prefers-reduced-motion is set
 */
export function ReactLenis({ children }: { children: React.ReactNode }) {
    // Enable smooth scroll for premium feel
    const [shouldSmooth, setShouldSmooth] = useState(true);

    useEffect(() => {
        // Respect reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setShouldSmooth(false);
        }

        // Disable on low-end devices (less than 4GB RAM)
        if ('deviceMemory' in navigator && (navigator as any).deviceMemory < 4) {
            setShouldSmooth(false);
        }
    }, []);

    // Skip Lenis entirely if smooth scrolling is disabled
    if (!shouldSmooth) {
        return <>{children}</>;
    }

    return (
        <Lenis root options={{
            lerp: 0.1,            // Balanced smooth feel (standard)
            duration: 1.2,        // Slightly longer for elegance but not floaty
            smoothWheel: true,
            touchMultiplier: 0,   // Native touch scroll for best mobile experience
        }}>
            {children}
        </Lenis>
    );
}

