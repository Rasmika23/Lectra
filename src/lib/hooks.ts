import { useEffect, RefObject } from 'react';

/**
 * Hook to scroll a container (or window) to the top when certain dependencies change to truthy.
 * Useful for showing success/error messages that are at the top of a scrollable area.
 * 
 * If a ref is provided, it tries to scroll that element. 
 * If the element is not scrollable (or if no ref is provided), it searches for the 
 * nearest scrollable parent and scrolls it.
 */
export function useScrollToTop(ref: RefObject<HTMLElement | null> | null, dependencies: any[]) {
  useEffect(() => {
    // If any of the dependencies became truthy, scroll to top
    const shouldScroll = dependencies.some(dep => !!dep);
    
    if (shouldScroll) {
      // Small delay to ensure the DOM has updated (e.g. message is rendered)
      const timeoutId = setTimeout(() => {
        let scrollTarget: HTMLElement | Window | null = null;

        if (ref && ref.current) {
          // Check if the ref'd element itself has a scrollbar
          if (ref.current.scrollHeight > ref.current.clientHeight) {
            scrollTarget = ref.current;
          } else {
            // Find nearest scrollable parent
            let parent = ref.current.parentElement;
            while (parent) {
              const style = window.getComputedStyle(parent);
              const overflowY = style.getPropertyValue('overflow-y');
              if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
                scrollTarget = parent;
                break;
              }
              parent = parent.parentElement;
            }
          }
        }

        // Final fallbacks: scrollable main or window
        if (!scrollTarget) {
          scrollTarget = document.querySelector('main.overflow-y-auto') as HTMLElement | null;
        }

        if (scrollTarget) {
          (scrollTarget as HTMLElement).scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        } else {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, dependencies);
}
