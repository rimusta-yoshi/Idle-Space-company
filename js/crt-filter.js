// CRT Filter Manager
// Barrel distortion via SVG displacement map + scanline/vignette overlay

const CRTFilter = (function () {
    const STORAGE_KEY = 'crt_enabled';
    const DISTORTION_STRENGTH = 0.15;
    const MAP_SIZE = 256;

    function generateDisplacementMap() {
        const canvas = document.createElement('canvas');
        canvas.width = MAP_SIZE;
        canvas.height = MAP_SIZE;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(MAP_SIZE, MAP_SIZE);

        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                // Normalize to -1..1
                const nx = (x / (MAP_SIZE - 1)) * 2 - 1;
                const ny = (y / (MAP_SIZE - 1)) * 2 - 1;

                // Radial distance squared
                const r2 = nx * nx + ny * ny;

                // Barrel distortion: push pixels inward at edges
                const factor = 1 + DISTORTION_STRENGTH * r2;
                const dx = nx * factor - nx;
                const dy = ny * factor - ny;

                // Encode displacement: 128 = no displacement, scale to 0-255 range
                const i = (y * MAP_SIZE + x) * 4;
                imgData.data[i]     = Math.round(128 + dx * 128); // R = x displacement
                imgData.data[i + 1] = Math.round(128 + dy * 128); // G = y displacement
                imgData.data[i + 2] = 128;                        // B unused
                imgData.data[i + 3] = 255;                        // A = full opacity
            }
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL('image/png');
    }

    function injectDisplacementMap() {
        const feImage = document.getElementById('crt-displacement-map');
        if (feImage) {
            const dataUrl = generateDisplacementMap();
            feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl);
            feImage.setAttribute('href', dataUrl);
        }
    }

    // Create scanline/vignette overlay
    const overlay = document.createElement('div');
    overlay.id = 'crt-overlay';
    document.body.appendChild(overlay);

    // Generate and inject barrel distortion map
    injectDisplacementMap();

    function isEnabled() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === null ? false : stored === 'true';
    }

    function apply() {
        if (isEnabled()) {
            document.body.classList.add('crt-enabled');
        } else {
            document.body.classList.remove('crt-enabled');
        }
    }

    function toggle() {
        const newState = !isEnabled();
        localStorage.setItem(STORAGE_KEY, String(newState));
        apply();
        return newState;
    }

    function setEnabled(enabled) {
        localStorage.setItem(STORAGE_KEY, String(enabled));
        apply();
    }

    // Apply on load
    apply();

    return { isEnabled, toggle, setEnabled, apply };
})();

window.CRTFilter = CRTFilter;
