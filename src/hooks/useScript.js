import { useState, useEffect } from 'react';

/**
 * Custom hook to dynamically load external scripts
 * @param {string} src - The script URL to load
 * @returns {boolean} - Returns true when the script is loaded
 */
export const useScript = (src) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);

    if (existingScript) {
      // Script already exists, check if it's loaded
      if (existingScript.hasAttribute('data-loaded')) {
        setLoaded(true);
      } else {
        existingScript.addEventListener('load', () => {
          existingScript.setAttribute('data-loaded', 'true');
          setLoaded(true);
        });
      }
      return;
    }

    // Create and append the script
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;

    const handleLoad = () => {
      script.setAttribute('data-loaded', 'true');
      setLoaded(true);
    };

    const handleError = (error) => {
      console.error(`Error loading script: ${src}`, error);
      setLoaded(false);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [src]);

  return loaded;
};
