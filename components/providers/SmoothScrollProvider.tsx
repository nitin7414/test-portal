'use client';

import React, { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Lenis for luxurious buttery-smooth momentum scrolling
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease-out for natural glide
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 1.6,
      infinite: false,
      allowNestedScroll: true,
      prevent: (node: HTMLElement) => {
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/exam')) {
          return true; // Zero interference in exam cockpit
        }
        if (!node || typeof (node as unknown as Element).closest !== 'function') return false;
        return (
          node.closest('[data-lenis-prevent]') !== null ||
          node.closest('[role="dialog"]') !== null ||
          node.closest('.overflow-y-auto') !== null ||
          node.closest('.overflow-auto') !== null ||
          node.closest('aside') !== null ||
          node.closest('dialog') !== null ||
          node.closest('#exam-workspace') !== null
        );
      },
    });

    window.__lenis = lenis;

    let frameId: number;
    function update(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(update);
    }

    frameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  return <>{children}</>;
}
