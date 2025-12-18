(() => {
  // ============================================
  // HOMEPAGE DETECTION - Only run on /home
  // ============================================
  function isGenieHomepage() {
    const path = window.location.pathname;
    // STRICT path matching - only exactly /home or /home/
    return path === '/home' || path === '/home/';
  }
  
  // Detect splash page (root path)
  function isSplashPage() {
    const path = window.location.pathname;
    return path === '/' || path === '';
  }
  
  // Update splash page class for hiding Cargo nav
  function updateSplashPageClass() {
    if (isSplashPage()) {
      document.body.classList.add('is-splash-page');
    } else {
      document.body.classList.remove('is-splash-page');
    }
  }
  
  // Run splash detection immediately and on navigation
  updateSplashPageClass();
  
  // Track state
  let genieInitialized = false;
  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 15;
  let lastUrl = window.location.href;
  let initDebounceTimer = null;
  
  // Force a complete reset and cleanup
  function forceReset() {
    console.log('[Genie] Force reset triggered');
    genieInitialized = false;
    initAttempts = 0;
    
    // Clear debounce timer
    if (initDebounceTimer) {
      clearTimeout(initDebounceTimer);
      initDebounceTimer = null;
    }
    
    // Clean up any existing animations
    const cursor = document.querySelector('.animated-cursor');
    if (cursor) cursor.remove();
    
    // Clean up iOS ghost elements
    document.querySelectorAll('.ios-ghost').forEach(el => el.remove());
    
    // Kill all GSAP animations
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf('*');
    }
    
    // Reset window opacities
    ['#hello-win','#about-win','#contact-win','#decor-win-1','#decor-win-2'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.style.opacity = '0';
        el.style.transform = '';
        el.style.boxShadow = '';
        // Clear stored content
        delete el.dataset.originalContent;
      }
    });
    
    // Clear SVG layers
    ['ghosts-hello', 'main-hello', 'ghosts-about', 'main-about', 'ghosts-contact', 'main-contact', 
     'ghosts-decor1', 'main-decor1', 'ghosts-decor2', 'main-decor2', 'ghosts-gif', 'main-gif'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
  }
  
  // Ensure body classes are correct for current page
  function updateBodyClasses() {
    if (isGenieHomepage()) {
      document.body.classList.add('is-genie-homepage');
      document.body.classList.remove('is-not-genie-homepage');
      console.log('[Genie] Added is-genie-homepage class');
    } else {
      document.body.classList.remove('is-genie-homepage');
      document.body.classList.add('is-not-genie-homepage');
      // Also force remove overflow hidden in case it got stuck
      document.body.style.overflow = '';
      console.log('[Genie] Removed is-genie-homepage class, restored scrolling');
    }
  }
  
  // Debounced initialization to prevent double-init
  function debouncedInit() {
    if (initDebounceTimer) {
      clearTimeout(initDebounceTimer);
    }
    initDebounceTimer = setTimeout(() => {
      if (isGenieHomepage() && !genieInitialized) {
        initAttempts = 0;
        tryInitialize();
      }
    }, 200);
  }
  
  // Main initialization function
  function tryInitialize() {
    // Prevent double initialization
    if (genieInitialized) {
      console.log('[Genie] Already initialized, skipping');
      return;
    }
    
    // Double-check we're on /home
    if (!isGenieHomepage()) {
      console.log('[Genie] Not on /home, aborting init');
      updateBodyClasses();
      return;
    }
    
    initAttempts++;
    console.log(`[Genie] Init attempt ${initAttempts}, path: ${window.location.pathname}`);
    
    updateBodyClasses();
    
    // Check if required elements exist
    const layoutWrapper = document.getElementById('layout-wrapper');
    const icons = document.querySelectorAll('.desktop-icon');
    const stage = document.getElementById('stage');
    
    if (layoutWrapper && icons.length >= 3 && stage) {
      console.log('[Genie] Elements ready, initializing...');
      genieInitialized = true;
      initGenieAnimations();
    } else if (initAttempts < MAX_INIT_ATTEMPTS) {
      console.log('[Genie] Elements not ready, retrying...', { layoutWrapper: !!layoutWrapper, icons: icons.length, stage: !!stage });
      setTimeout(tryInitialize, 100);
    } else {
      console.log('[Genie] Max attempts reached, forcing init...');
      genieInitialized = true;
      initGenieAnimations();
    }
  }
  
  // ============================================
  // CARGO SPA NAVIGATION DETECTION
  // ============================================
  
  // Single unified URL change handler
  function handleNavigation() {
    const currentUrl = window.location.href;
    const urlChanged = currentUrl !== lastUrl;
    
    if (urlChanged) {
      console.log('[Genie] Navigation detected:', lastUrl, '->', currentUrl);
      lastUrl = currentUrl;
    }
    
    // ALWAYS update body classes on any navigation
    updateBodyClasses();
    updateSplashPageClass();
    
    // If we're leaving /home, clean up
    if (!isGenieHomepage()) {
      if (genieInitialized) {
        console.log('[Genie] Left /home, cleaning up');
        forceReset();
      }
      return;
    }
    
    // We're on /home - use debounced init
    if (!genieInitialized) {
      debouncedInit();
    }
  }
  
  // Method 1: Intercept History API (pushState/replaceState)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    console.log('[Genie] pushState detected');
    setTimeout(handleNavigation, 50);
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    console.log('[Genie] replaceState detected');
    setTimeout(handleNavigation, 50);
  };
  
  // Method 2: Listen for popstate (back/forward buttons)
  window.addEventListener('popstate', () => {
    console.log('[Genie] popstate detected');
    setTimeout(handleNavigation, 50);
  });
  
  // Method 3: Poll for URL changes as backup (some SPAs don't use History API)
  let lastCheckedUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastCheckedUrl) {
      console.log('[Genie] URL poll detected change');
      lastCheckedUrl = window.location.href;
      handleNavigation();
    }
  }, 250);
  
  // Method 4: MutationObserver for DOM changes (backup)
  const observer = new MutationObserver((mutations) => {
    // Always ensure correct body classes
    updateBodyClasses();
    
    if (isGenieHomepage() && !genieInitialized) {
      const layoutWrapper = document.getElementById('layout-wrapper');
      const stage = document.getElementById('stage');
      if (layoutWrapper && stage) {
        console.log('[Genie] MutationObserver detected elements');
        debouncedInit();
      }
    }
  });
  
  // Initial setup
  function initialSetup() {
    console.log('[Genie] Initial setup, path:', window.location.pathname);
    
    // Start observing DOM
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Set correct body classes immediately
    updateBodyClasses();
    
    // Try to initialize if we're on /home
    if (isGenieHomepage()) {
      tryInitialize();
    }
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialSetup);
  } else {
    initialSetup();
  }
  
  // Also try on window load
  window.addEventListener('load', () => {
    updateBodyClasses();
    if (isGenieHomepage() && !genieInitialized) {
      console.log('[Genie] Window load - attempting init');
      tryInitialize();
    }
  });
  
  // Check on visibility change (tab switching on mobile)
  document.addEventListener('visibilitychange', () => {
    updateBodyClasses();
    if (document.visibilityState === 'visible' && isGenieHomepage() && !genieInitialized) {
      console.log('[Genie] Visibility change - attempting init');
      debouncedInit();
    }
  });
  
  // ============================================
  // GENIE HOMEPAGE ANIMATION CODE
  // ============================================
  function initGenieAnimations() {
    // Safety check - only run on /home
    if (!isGenieHomepage()) {
      console.log('initGenieAnimations called but not on /home, aborting');
      return;
    }
    
    // Detect iOS Safari specifically
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOSSafari = isIOS; // All iOS browsers use WebKit
    
    console.log('[Genie] Device detection:', { isIOS, isSafari, isIOSSafari });
    
    // GSAP Performance optimizations
    gsap.ticker.lagSmoothing(1000, 16); // Avoid animation lags when CPU freezes
    
    // On iOS, use simpler rendering
    if (isIOSSafari) {
      gsap.config({ force3D: false }); // Prevents blur on Safari during transforms
    }
    
    window.HELLO_BELT_DONE = false;
    
    // Flag for simplified mobile animation
    window.USE_SIMPLE_ANIMATION = isIOSSafari;
    
    // On iOS, remove SVG stages since we use DOM-based animation
    if (isIOSSafari) {
      const svgStages = document.querySelectorAll('#stage, #stage-gif, #stage-top');
      svgStages.forEach(stage => {
        if (stage && stage.parentNode) {
          stage.parentNode.removeChild(stage);
        }
      });
    }

    // Detect if we're in portrait mobile mode
    const isMobilePortrait = () => window.innerWidth < 768 && window.innerHeight > window.innerWidth;
  
  // Use different canvas dimensions for mobile portrait
  // Larger canvas = more room for bigger windows, then scaled down to fit screen
 const getBaseDimensions = () => {
  if (isMobilePortrait()) {
    return { width: 600, height: 1000 }; // 📱 15% increase
  }
  return { width: 1400, height: 770 };
};

  
  let BASE_WIDTH = getBaseDimensions().width;
  let BASE_HEIGHT = getBaseDimensions().height;
  window.LAYOUT_SCALE = 1;

  const svg = document.getElementById('stage');
  const svgGif = document.getElementById('stage-gif');
  const svgTop = document.getElementById('stage-top');

  const ghostLayers = {
    hello: document.getElementById('ghosts-hello'),
    about: document.getElementById('ghosts-about'),
    contact: document.getElementById('ghosts-contact'),
    gif: document.getElementById('ghosts-gif'),
    decor1: document.getElementById('ghosts-decor1'),
    decor2: document.getElementById('ghosts-decor2')
  };
  
  const mainLayers = {
    hello: document.getElementById('main-hello'),
    about: document.getElementById('main-about'),
    contact: document.getElementById('main-contact'),
    gif: document.getElementById('main-gif'),
    decor1: document.getElementById('main-decor1'),
    decor2: document.getElementById('main-decor2')
  };

  function enforceLayerOrder() {
    if (!svg) return; // Skip if SVG was removed (iOS)
    const allLayers = [ghostLayers.hello, mainLayers.hello];
    allLayers.forEach(layer => {
      if (layer && layer.parentNode === svg) {
        svg.removeChild(layer);
      }
    });
    if (ghostLayers.hello) svg.appendChild(ghostLayers.hello);
    if (mainLayers.hello) svg.appendChild(mainLayers.hello);
  }

  // ✅ FIX: Set BOTH viewBox AND explicit pixel dimensions
  // This ensures 1:1 mapping between viewBox units and element pixels
  // Only the parent transform will scale everything
  function fitViewBox() {
    const dims = getBaseDimensions();
    BASE_WIDTH = dims.width;
    BASE_HEIGHT = dims.height;
    
    const allSvgs = [svg, svgGif, svgTop];
    allSvgs.forEach(s => {
      if (s) {
        // ViewBox defines coordinate system
        s.setAttribute('viewBox', `0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`);
        // Explicit dimensions ensure 1:1 mapping (no internal scaling)
        s.style.width = BASE_WIDTH + 'px';
        s.style.height = BASE_HEIGHT + 'px';
      }
    });
    
    console.log('📐 fitViewBox: SVGs set to', `${BASE_WIDTH}×${BASE_HEIGHT}`, 'with matching viewBox');
  }
    
  function applyLayoutScale() {
    const scaler = document.getElementById('layout-scaler');
    if (!scaler) return;
    
    const dims = getBaseDimensions();
    BASE_WIDTH = dims.width;
    BASE_HEIGHT = dims.height;
    
    // Update scaler dimensions
    scaler.style.width = BASE_WIDTH + 'px';
    scaler.style.height = BASE_HEIGHT + 'px';
    
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const scaleW = viewportW / BASE_WIDTH;
    const scaleH = viewportH / BASE_HEIGHT;
    
    let scale = Math.min(scaleW, scaleH);
    
    // On mobile, scale down a bit more to make cluster smaller
    if (isMobilePortrait()) {
      scale = scale * 0.92;  // Slightly smaller on mobile
    }
    
    if (scale > 1) scale = 1;
    
    const MIN_SCALE = 0.25;
    if (scale < MIN_SCALE) scale = MIN_SCALE;
    
    window.LAYOUT_SCALE = scale;
    const boost = isMobilePortrait() ? 1.11 : 1;
    scaler.style.transform = `scale(${scale * boost})`;
    
    console.log('📐 Layout scale:', {
      scale: scale.toFixed(3),
      viewport: `${viewportW}×${viewportH}`,
      canvas: `${BASE_WIDTH}×${BASE_HEIGHT}`,
      scaledSize: `${Math.round(BASE_WIDTH * scale)}×${Math.round(BASE_HEIGHT * scale)}`
    });
  }

  function getWindowSpecs() {
  if (isMobilePortrait()) {
    return {
      hello:  { w:370, h:300, dom:'#hello-win',  rot: 0,   floatAmp:20, floatDur:4.8, titleH:28 },
      about:  { w:290, h:217, dom:'#about-win',  rot:-3,   floatAmp:18, floatDur:4.4, titleH:28 },
      contact:{ w:270, h:205, dom:'#contact-win',rot: 2,   floatAmp:16, floatDur:4.2, titleH:28 },
      decor1: { w:260, h:185, dom:'#decor-win-1',rot: 4,   floatAmp:14, floatDur:5.0, titleH:28 },
      decor2: { w:265, h:185, dom:'#decor-win-2',rot:-3,   floatAmp:12, floatDur:4.6, titleH:28 }
    };
  }
  return {
    hello:  { w:420, h:300, dom:'#hello-win',  rot: 0,   floatAmp:40, floatDur:4.8, titleH:28 },
    about:  { w:225, h:180, dom:'#about-win',  rot:-2,   floatAmp:38, floatDur:4.4, titleH:28 },
    contact:{ w:220, h:157, dom:'#contact-win',rot: 1,   floatAmp:35, floatDur:4.2, titleH:28 },
    decor1: { w:200, h:145, dom:'#decor-win-1',rot: 3,   floatAmp:33, floatDur:5.0, titleH:28 },
    decor2: { w:190, h:140, dom:'#decor-win-2',rot:-2.5, floatAmp:28, floatDur:4.6, titleH:28 }
  };
}

  let SPECS = getWindowSpecs();

  const getCanonicalPositions = () => {
    if (isMobilePortrait()) {
      // Canvas is 600×1000, hello window is 370px wide
      // True center = (600-370)/2 = 115
      return {
        hello:   { x: 115, y: 380 },   // Centered
        about:   { x: 260, y: 200 },   // Upper right
        contact: { x: 50,  y: 620 },   // Lower left
        decor1:  { x: 45,  y: 330 },   // Left side  
        decor2:  { x: 255, y: 535 }    // Right side
      };
    }
    // Desktop: Canvas is 1400×770, center is (700, 385)
    return {
      hello:   { x: 490, y: 250 },   // Main window, centered
      about:   { x: 640, y: 120 },   // Upper right, overlapping hello
      contact: { x: 420, y: 380 },   // Lower left of hello
      decor1:  { x: 280, y: 200 },   // Left side
      decor2:  { x: 780, y: 340 }    // Right side
    };
  };

  const finalPosition = (id, w, h) => {
    const positions = getCanonicalPositions();
    const p = positions[id];
    if (p) return { x: p.x, y: p.y };
    return {
      x: (BASE_WIDTH - w) / 2,
      y: (BASE_HEIGHT - h) / 2
    };
  };
  
  // ✅ FIX: Account for border width in DOM positioning
  // DOM windows have 1.4px border that adds to their rendered size
  // SVG paths don't have this - they're just coordinates
  function updateDOMWindows() {
    SPECS = getWindowSpecs();
    const positions = getCanonicalPositions();
    const BORDER_WIDTH = 1.4; // Must match CSS border width
    
    Object.keys(SPECS).forEach(id => {
      const spec = SPECS[id];
      const pos = positions[id];
      const el = document.querySelector(spec.dom);
      if (el) {
        // Set size to spec dimensions (border is additional)
        el.style.width = spec.w + 'px';
        el.style.height = spec.h + 'px';
        // Position matches SVG exactly
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
        el.style.transformOrigin = 'center center';
      }
    });
  }

  // ✅ FIX: SVG path functions - these draw INSIDE the border
  // To match DOM windows with border, we need to account for stroke width
  const STROKE_WIDTH = 1.0;  // Thinner outline to match DOM windows
  const HALF_STROKE = STROKE_WIDTH / 2;
  
  // Border path - draws at exact coordinates (stroke centered on path)
  const rectPath = (x, y, w, h) => `M${x},${y}H${x+w}V${y+h}H${x}Z`;

  // Title bar fill - inset by half stroke to not overlap border
  const titleRectPath = (x, y, w, titleH) => {
    const inset = HALF_STROKE;
    return `M${x+inset},${y+inset}H${x+w-inset}V${y+titleH}H${x+inset}Z`;
  };

  // Body fill - inset by half stroke
  const bodyRectPath = (x, y, w, h, titleH) => {
    const inset = HALF_STROKE;
    return `M${x+inset},${y+titleH}H${x+w-inset}V${y+h-inset}H${x+inset}Z`;
  };

  // Title divider line
  const titleLinePath = (x, y, w, titleH) => {
    const ly = y + titleH;
    return `M${x},${ly}H${x+w}`;
  };

  // Return starting position at bottom of screen for fly-in animation
  const getStartPosition = (id) => {
    const dims = getBaseDimensions();
    // Start from bottom center, with slight horizontal offset per window for variety
    const offsets = {
      hello: 0,
      about: 80,
      contact: -80,
      decor1: -120,
      decor2: 120
    };
    return {
      x: (dims.width / 2) + (offsets[id] || 0),
      y: dims.height + 50  // Just below the visible area
    };
  };

  function createWindowElement() {
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');

    const bodyFill = document.createElementNS('http://www.w3.org/2000/svg','path');
    bodyFill.setAttribute('fill','#fff');
    bodyFill.setAttribute('stroke','none');
    
    const titleFill = document.createElementNS('http://www.w3.org/2000/svg','path');
    titleFill.setAttribute('fill','url(#dottedTexture)');
    titleFill.setAttribute('stroke','none');

    const b = document.createElementNS('http://www.w3.org/2000/svg','path');
    b.setAttribute('fill','none');
    b.setAttribute('stroke','#000');
    b.setAttribute('stroke-width', String(STROKE_WIDTH));

    const t = document.createElementNS('http://www.w3.org/2000/svg','path');
    t.setAttribute('fill','none');
    t.setAttribute('stroke','#000');
    t.setAttribute('stroke-width','1');

    g.append(bodyFill, titleFill, b, t);
    return { g, bodyFill, titleFill, b, t };
  }

  function createGhostElement(opacity = 0.9) {
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('opacity', opacity);

    const bodyFill = document.createElementNS('http://www.w3.org/2000/svg','path');
    bodyFill.setAttribute('fill','#fff');
    bodyFill.setAttribute('stroke','none');
    
    const titleFill = document.createElementNS('http://www.w3.org/2000/svg','path');
    titleFill.setAttribute('fill','#f6f3ec');
    titleFill.setAttribute('stroke','none');

    const b = document.createElementNS('http://www.w3.org/2000/svg','path');
    b.setAttribute('fill','none');
    b.setAttribute('stroke','#000');
    b.setAttribute('stroke-width', String(STROKE_WIDTH));

    const t = document.createElementNS('http://www.w3.org/2000/svg','path');
    t.setAttribute('fill','none');
    t.setAttribute('stroke','#000');
    t.setAttribute('stroke-width','1');

    g.append(bodyFill, titleFill, b, t);
    return { g, bodyFill, titleFill, b, t };
  }

  function floatForever(el, amp=10, dur=4.5) {
    // Use yPercent or y transform for GPU-accelerated smooth animation
    // First, get current position and set it as the base
    const currentTop = parseFloat(el.style.top) || 0;
    
    gsap.to(el, {
      duration: dur,
      y: amp,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      force3D: true // Force GPU acceleration
    });
  }

  function typewriterReveal(windowBody, duration = 1.8, onCompleteCallback = null) {
    const imageEl = windowBody.querySelector('img');
    
    if (imageEl) {
      const isHelloWindow = windowBody.closest('#hello-win');
      
      if (isHelloWindow) {
        imageEl.style.opacity = '0';
        imageEl.style.visibility = 'hidden';
        
        windowBody.style.position = 'relative';
        windowBody.style.overflow = 'hidden';
        windowBody.style.transform = 'translateZ(0)';
        
        const createMistBelt = () => {
          const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const width = imageEl.naturalWidth || imageEl.width;
          const height = imageEl.naturalHeight || imageEl.height;
          
          canvas.width = width;
          canvas.height = height;
          
          try {
            ctx.drawImage(imageEl, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            
            const container = document.createElement('div');
            container.style.cssText = `
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 10;
              transform: translateZ(0);
            `;
            windowBody.appendChild(container);
            
            const particles = [];
            // Use larger step on mobile for performance, smaller on desktop for detail
            const step = isMobile ? 2.5 : 1.5;
            
            const displayWidth = imageEl.offsetWidth;
            const displayHeight = imageEl.offsetHeight;
            const offsetX = imageEl.offsetLeft;
            const offsetY = imageEl.offsetTop;
            
            // Create particles from image pixels
            for (let y = 0; y < height; y += step) {
              for (let x = 0; x < width; x += step) {
                const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];
                const alpha = imageData.data[idx + 3];
                
                // Skip transparent or near-white pixels
                if (alpha <= 50 || (r > 240 && g > 240 && b > 240)) continue;
                
                const scaledX = (x / width) * displayWidth + offsetX;
                const scaledY = (y / height) * displayHeight + offsetY;
                // Make pixels visible but not too chunky
                const scaledStep = Math.max(2, (step / width) * displayWidth * 1.1);
                
                // Color particle (final revealed state) - crisp pixel edges
                const colorParticle = document.createElement('div');
                colorParticle.style.cssText = `
                  position: absolute;
                  left: ${scaledX}px;
                  top: ${scaledY}px;
                  width: ${scaledStep}px;
                  height: ${scaledStep}px;
                  background-color: rgb(${r}, ${g}, ${b});
                  opacity: 0;
                  z-index: 9;
                  image-rendering: pixelated;
                `;
                container.appendChild(colorParticle);
                
                // Mist particle (the dissolving fog effect) - MORE blur on mobile for mistier effect
                const blurAmount = isMobile ? 4 : 2;
                const mistSize = isMobile ? 1.5 : 1.2;
                const mistParticle = document.createElement('div');
                mistParticle.style.cssText = `
                  position: absolute;
                  left: ${scaledX}px;
                  top: ${scaledY}px;
                  width: ${scaledStep * mistSize}px;
                  height: ${scaledStep * mistSize}px;
                  background-color: rgba(${r}, ${g}, ${b}, 0.6);
                  opacity: 0;
                  z-index: 10;
                  filter: blur(${blurAmount}px);
                `;
                container.appendChild(mistParticle);
                
                particles.push({ colorParticle, mistParticle, y: scaledY });
              }
            }
            
            // Animate the mist belt sweeping down
            let frame = 0;
            const beltHeight = isMobile ? 80 : 60; // Wider belt on mobile
            const speed = isMobile ? 6 : 8; // Slightly slower on mobile for more mist visibility
            const totalFrames = (displayHeight + beltHeight) / speed;
            
            // Pre-calculate reveal times with randomness for organic feel
            particles.forEach(item => {
              const base = item.y / displayHeight;
              const randomOffset = (Math.random() - 0.5) * (isMobile ? 0.15 : 0.1);
              item.revealTime = Math.max(0, Math.min(1, base + randomOffset));
              item.mistDuration = isMobile ? (0.06 + Math.random() * 0.08) : (0.03 + Math.random() * 0.05);
            });
            
            const tick = () => {
              const progress = frame / totalFrames;
              
              for (let i = 0; i < particles.length; i++) {
                const item = particles[i];
                const pixelProgress = item.revealTime;
                const mistEnd = pixelProgress + item.mistDuration;
                
                if (progress < pixelProgress) {
                  // Not yet reached
                  item.colorParticle.style.opacity = '0';
                  item.mistParticle.style.opacity = '0';
                } else if (progress >= pixelProgress && progress < mistEnd) {
                  // In the mist zone - show dissolving fog
                  const mistProgress = (progress - pixelProgress) / item.mistDuration;
                  if (!item.mistValue) item.mistValue = Math.random();
                  const densityFactor = Math.pow(mistProgress, 2);
                  const threshold = 0.9 - (densityFactor * 0.8);
                  if (item.mistValue > threshold) {
                    const mistOpacity = 0.25 + (densityFactor * 0.75);
                    item.mistParticle.style.opacity = mistOpacity;
                  } else {
                    item.mistParticle.style.opacity = '0';
                  }
                  item.colorParticle.style.opacity = '0';
                } else {
                  // Past mist zone - show solid color
                  item.mistParticle.style.opacity = '0';
                  item.colorParticle.style.opacity = '1';
                  // Occasional flicker just after reveal
                  if (progress - mistEnd < 0.08) {
                    if (Math.random() < 0.06) {
                      item.colorParticle.style.opacity = String(0.3 + Math.random() * 0.4);
                    }
                  }
                }
              }
              
              frame++;
              if (frame < totalFrames) {
                requestAnimationFrame(tick);
              } else {
                // Animation complete - show real image and clean up
                for (let i = 0; i < particles.length; i++) {
                  particles[i].colorParticle.style.opacity = '1';
                  particles[i].mistParticle.style.opacity = '0';
                }
                imageEl.style.opacity = '1';
                imageEl.style.visibility = 'visible';
                setTimeout(() => {
                  container.remove();
                  window.HELLO_BELT_DONE = true;
                  if (onCompleteCallback) onCompleteCallback();
                }, 100);
              }
            };
            
            requestAnimationFrame(tick);
            
          } catch (e) {
            console.error('Mist belt error (CORS?):', e);
            // Fallback to simple fade
            imageEl.style.opacity = '1';
            imageEl.style.visibility = 'visible';
            window.HELLO_BELT_DONE = true;
            if (onCompleteCallback) onCompleteCallback();
          }
        };
        
        // Need image to be loaded first
        imageEl.crossOrigin = 'anonymous';
        if (imageEl.complete && imageEl.naturalWidth > 0) {
          createMistBelt();
        } else {
          imageEl.addEventListener('load', createMistBelt);
        }
        
        return gsap.timeline(); // Return empty timeline, actual animation is self-contained
      }
    }
    
    // Text typewriter effect for about/contact windows
    // Check if there's a window-body-inner, use that instead
    const innerDiv = windowBody.querySelector('.window-body-inner');
    const targetEl = innerDiv || windowBody;
    
    const fullText = targetEl.textContent.trim();
    const htmlContent = targetEl.innerHTML;

    if (!fullText) {
      const tl = gsap.timeline();
      tl.to({}, { duration: 0.01 });
      return tl;
    }

    // Store the original content, then clear it
    targetEl.innerHTML = '';

    const textSpan = document.createElement('span');
    textSpan.innerHTML = '';
    targetEl.appendChild(textSpan);

    const typingCursor = document.createElement('span');
    typingCursor.className = 'typewriter-cursor';
    targetEl.appendChild(typingCursor);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    let processedText = '';
    let boldMap = [];

    function traverseNodes(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        for (let i = 0; i < text.length; i++) {
          boldMap.push(node.parentElement && node.parentElement.tagName === 'B');
          processedText += text[i];
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') {
          boldMap.push(false);
          processedText += '\n';
        }
        node.childNodes.forEach(child => traverseNodes(child));
      }
    }

    traverseNodes(tempDiv);

    const totalChars = processedText.length;
    const msPerChar = 35; // Faster typing
    
    let currentIndex = 0;
    
    // Create a unique flag for this window
    const windowId = windowBody.closest('.window')?.id || 'unknown';
    window['TYPING_DONE_' + windowId] = false;
    
    function typeNextChar() {
      if (currentIndex >= totalChars) {
        // Done typing
        typingCursor.remove();
        targetEl.innerHTML = htmlContent;
        window['TYPING_DONE_' + windowId] = true;
        if (onCompleteCallback) onCompleteCallback();
        return;
      }
      
      let htmlStr = '';
      let inBold = false;
      
      for (let i = 0; i <= currentIndex; i++) {
        const shouldBeBold = boldMap[i];
        const c = processedText[i];
        
        if (shouldBeBold && !inBold) {
          htmlStr += '<b>';
          inBold = true;
        }
        if (!shouldBeBold && inBold) {
          htmlStr += '</b>';
          inBold = false;
        }
        
        if (c === '\n') {
          if (inBold) {
            htmlStr += '</b><br><b>';
          } else {
            htmlStr += '<br>';
          }
        } else {
          htmlStr += c;
        }
      }
      
      if (inBold) {
        htmlStr += '</b>';
      }
      
      textSpan.innerHTML = htmlStr;
      currentIndex++;
      
      // Schedule next character
      setTimeout(typeNextChar, msPerChar);
    }
    
    // Start typing
    typeNextChar();

    // Return a simple timeline - actual completion tracked via window flags
    const tl = gsap.timeline();
    tl.to({}, { duration: 0.1 }); // Minimal duration, we use flags instead
    return tl;
  }

  // ✅ FIX: showDom clears SVG and shows DOM at same position
  function showDom(id, pos, rot, ghostContainer, mainContainer) {
    const s = SPECS[id];
    const el = document.querySelector(s.dom);
    const windowBody = el.querySelector('.window-body');
    
    // Store original content for about/contact, then clear it
    // Content will be typed back in by typewriterReveal
    if (id === 'about' || id === 'contact') {
      if (!el.dataset.originalContent) {
        el.dataset.originalContent = windowBody.innerHTML;
      }
      windowBody.innerHTML = ''; // Start empty
    }
    
    // Clean up SVG elements first
    if (ghostContainer) {
      while (ghostContainer.firstChild) ghostContainer.removeChild(ghostContainer.firstChild);
    }
    if (mainContainer) {
      while (mainContainer.firstChild) mainContainer.removeChild(mainContainer.firstChild);
    }
    
    // Show DOM window immediately (no requestAnimationFrame to avoid flash)
    gsap.set(el, { 
      opacity: 1,
      rotation: rot,
      transformOrigin: 'center center'
    });
    
    gsap.to(el, {
      boxShadow: '4px 4px 0 rgba(25,25,25,1)',
      duration: 0.32,
      ease: 'power2.out'
    });
    
    const contentTl = gsap.timeline({ paused: true });
    const contentDuration = id === 'hello' ? 1.44 : 0.96;
    const isDecorWindow = id === 'decor1' || id === 'decor2';
    
    if (isDecorWindow) {
      contentTl.to({}, { duration: 0.01 });
    } else if (id === 'hello') {
      // For hello window, trigger the mist belt image reveal
      contentTl.call(() => {
        typewriterReveal(windowBody, contentDuration);
      }, null, 0);
      contentTl.to({}, { duration: 2 }); // Duration for the mist effect
    } else {
      // For about/contact, restore content then typewrite it
      contentTl.call(() => {
        // Restore the original content first
        const originalContent = el.dataset.originalContent || '';
        windowBody.innerHTML = originalContent;
        // Then trigger typewriter
        typewriterReveal(windowBody, contentDuration);
      }, null, 0);
      contentTl.to({}, { duration: contentDuration + 0.5 }); // Extra buffer for typing to complete
    }
    
    return contentTl;
  }

  function createAnimatedCursor() {
    const existingCursor = document.querySelector('.animated-cursor');
    if (existingCursor) existingCursor.remove();
    
    const cursor = document.createElement('div');
    cursor.className = 'animated-cursor';
    
    cursor.innerHTML = `
      <svg viewBox="0 0 100.8 127.68" xmlns="http://www.w3.org/2000/svg">
        <defs><style>.cls-1 { fill: #fff; }</style></defs>
        <path class="cls-1" d="M41.52,6.24c.06,17.36-.04,34.72,0,52.08h6.24v-22.8c3.92,0,7.84,0,11.76,0,.03,7.6-.02,15.2,0,22.8h6.48v-17.28h10.32v23.52h6.48v-17.52h5.4c.6,0,.12,1.41.11,1.79-.04,1.32.17,2.67.01,3.97,2.08.01,4.16,0,6.24,0,.12,13.08-.1,26.17.01,39.25l-.37.83h-6.12v17.28h-5.76v11.28h-46.56v-10.92c-.15-.24-.33-.31-.6-.36-1.42-.26-4.26.01-5.88,0,0-3.76,0-7.52,0-11.28h-5.52v-12h-5.64l-.36-.36v-11.4l-5.29.15c-.22.02-.71-.41-.71-.51v-5.88h-5.76v-11.28c3.76,0,7.52.01,11.28,0,0,1.84,0,3.68,0,5.52h6v11.76h6.48c.06-22.88-.08-45.76,0-68.64,3.91-.03,7.85-.01,11.76,0Z"/>
        <path d="M29.76,6.24c-.08,22.88.06,45.76,0,68.64h-6.48v-11.76h-6c0-1.84,0-3.68,0-5.52,2,0,4,0,6,0V6.6c.15-.24.33-.31.6-.36,1.42-.26,4.26.01,5.88,0Z"/>
        <path d="M29.76,6.24c0-2.08,0-4.16,0-6.24h11.76c0,2.08,0,4.16,0,6.24-3.91-.01-7.85-.03-11.76,0Z"/>
        <path d="M41.52,6.24c2.08,0,4.16,0,6.24,0v23.52h11.76c0,1.92,0,3.84,0,5.76-3.92,0-7.84,0-11.76,0v22.8h-6.24c-.04-17.36.06-34.72,0-52.08Z"/>
        <path d="M59.52,35.52c5.68-.01,11.36,0,17.04,0v5.28h11.64l.36.36v5.64h5.64c.24.15.31.33.36.6.24,1.32-.01,3.9,0,5.4-2.08-.01-4.16,0-6.24,0,.16-1.3-.05-2.64-.01-3.97.01-.38.5-1.79-.11-1.79h-5.4v17.52h-6.48v-23.52h-10.32v17.28h-6.48c-.02-7.6.03-15.2,0-22.8Z"/>
        <path d="M29.28,110.16c-2.08-.02-4.16.01-6.24,0v-11.28h-5.76v-12h-5.76v-11.52h-5.40l-.36-.36v-6.12H0v-17.28h17.28c0,2,0,4,0,6-3.76.01-7.52,0-11.28,0v11.28h5.76v5.88c0,.10.49.53.71.51l5.29-.15v11.4l.36.36h5.64v12h5.52c0,3.76,0,7.52,0,11.28Z"/>
        <path d="M94.56,52.8c2.08.01,4.16,0,6.24,0v40.08h-6.24v17.28h-6v17.52H29.28c-.01-5.84.01-11.68,0-17.52,1.62.01,4.46-.26,5.88,0,.27.05.45.12.6.36v10.92h46.56v-11.28h5.76v-17.28h6.12l.37-.83c-.11-13.08.11-26.17-.01-39.25Z"/>
      </svg>
    `;
    
    document.body.appendChild(cursor);
    return cursor;
  }

  function pointToWindowV2(cursor, windowEl, duration = 0.6) {
    const rect = windowEl.getBoundingClientRect();
    const cursorWidth = window.innerWidth <= 768 ? 20 : 28;
    
    const targetX = rect.left + (rect.width / 2) - (cursorWidth / 2);
    const targetY = rect.top + (rect.height * 0.80);
    
    return gsap.to(cursor, {
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'power2.out'
    });
  }

  const contentTimelines = {
    hello: null,
    about: null,
    contact: null,
    gif: null
  };

  // ✅ FIX: launch() ensures SVG paths match DOM window positions exactly
  function launch(id, delay = 0) {
    enforceLayerOrder();
    
    const s = SPECS[id];
    const { w, h, titleH, rot } = s;
    
    const ghostLayer = ghostLayers[id];
    const mainLayer = mainLayers[id];
    const start = getStartPosition(id);
    const end = finalPosition(id, w, h);
    
    // iOS Safari: Use DOM-based ghost animation instead of SVG morphing
    if (window.USE_SIMPLE_ANIMATION) {
      const el = document.querySelector(s.dom);
      const windowBody = el.querySelector('.window-body');
      
      // Create DOM-based ghost elements - ghosts trail BEHIND their main window
      const isMobile = window.innerWidth <= 768;
      const ghostCount = isMobile ? 10 : 10;
      const ghostSpacing = isMobile ? 8 : 15;
      const ghosts = [];
      const scaler = document.getElementById('layout-scaler');
      
      // Window z-indexes: hello=16, about=17, contact=18, decor1=5, decor2=6
      // We need ghosts BEHIND their window but respecting window stacking
      // Solution: multiply by 10 to create gaps
      // hello: window=160, ghosts=150-159
      // about: window=170, ghosts=160-169 (above hello window at 160)
      const baseZIndex = parseInt(window.getComputedStyle(el).zIndex) || 10;
      const windowZIndex = baseZIndex * 10;
      
      // Boost main window z-index
      el.style.zIndex = windowZIndex;
      
      for (let i = 0; i < ghostCount; i++) {
        const ghost = document.createElement('div');
        ghost.className = 'window ios-ghost';
        // Ghosts are below their window but stagger down
        const ghostZ = windowZIndex - 1 - i;
        ghost.style.cssText = `
          position: absolute;
          width: ${w}px;
          height: ${h}px;
          left: ${end.x}px;
          top: ${end.y}px;
          opacity: 0;
          pointer-events: none;
          z-index: ${ghostZ};
        `;
        ghost.innerHTML = `<div class="title-bar"><div class="title-bar-text"></div></div><div class="window-body"></div>`;
        scaler.appendChild(ghost);
        ghosts.push(ghost);
      }
      
      // Position main window and ghosts completely OFF screen (below visible area)
      const startY = 1200; // Well below the 1000px canvas height
      const startScale = 0.15;
      
      // Hide main window initially, position off-screen
      gsap.set(el, {
        opacity: 0,
        scale: startScale,
        y: startY - parseFloat(el.style.top),
        rotation: 0,
        transformOrigin: 'center center'
      });
      
      ghosts.forEach((ghost, i) => {
        gsap.set(ghost, {
          opacity: 0,
          scale: startScale,
          y: startY - end.y + (i + 1) * ghostSpacing,
          rotation: 0,
          transformOrigin: 'center center'
        });
      });
      
      const tl = gsap.timeline({ delay: delay / 1000 });
      
      // Fade in and animate main window from bottom
      tl.to(el, {
        opacity: 1,
        scale: 1,
        y: 0,
        rotation: rot,
        duration: 0.6,
        ease: 'sine.inOut'
      }, 0);
      
      // ✨ GENIE EFFECT: Animate ghosts with BASELINE SHIFT + PROGRESSIVE SCALING + HIGH OPACITY
      ghosts.forEach((ghost, i) => {
        const lagMultiplier = isMobile ? 0.03 : 0.045;
        const lag = 0.04 + i * lagMultiplier;
        const ghostDuration = 0.5 + i * 0.04;
        const ghostOpacity = 0.98 - i * 0.03; // Higher starting opacity, slower fade
        
        // Base scale - FILL THE ENTIRE SCREEN
        const baseScaleX = isMobile ? 1 : 8.0; // Start 800% width - fills screen!
        const baseScaleY = isMobile ? 1 : 6.0; // Start 600% height - fills screen!
        
        // Plateau for first half, then decay
        // Ghosts 0-5: barely any change (stay MASSIVE)
        // Ghosts 6-10: more dramatic falloff
        const falloffFactor = i < 6 ? Math.pow(0.99, i) : Math.pow(0.92, i - 5);
        const ghostScaleX = isMobile ? (1 - (i * 0.05)) : (baseScaleX * falloffFactor);
        const ghostScaleY = isMobile ? (1 - (i * 0.05)) : (baseScaleY * falloffFactor);
        
        tl.to(ghost, {
          opacity: Math.max(0.50, ghostOpacity), // Higher minimum opacity
          scaleX: ghostScaleX, // Horizontal stretch - WIDER baseline + crescendo
          scaleY: ghostScaleY, // Vertical stretch - taller baseline + crescendo
          y: 0,
          rotation: rot,
          duration: ghostDuration,
          ease: 'sine.inOut'
        }, lag);
        
        // Fade out ghost
        tl.to(ghost, {
          opacity: 0,
          duration: 0.3,
          ease: 'sine.out',
          onComplete: () => ghost.remove()
        }, lag + ghostDuration - 0.15);
      });
      
      // Show box shadow after animation
      tl.to(el, {
        boxShadow: '4px 4px 0 rgba(25,25,25,1)',
        duration: 0.2
      }, 0.5);
      
      // Set up content timeline
      const contentTl = gsap.timeline({ paused: true });
      const contentDuration = id === 'hello' ? 1.44 : 0.96;
      const isDecorWindow = id === 'decor1' || id === 'decor2';
      
      if (isDecorWindow) {
        contentTl.to({}, { duration: 0.01 });
      } else if (id === 'hello') {
        contentTl.call(() => {
          typewriterReveal(windowBody, contentDuration);
        }, null, 0);
        contentTl.to({}, { duration: 2 });
      } else {
        if (!el.dataset.originalContent) {
          el.dataset.originalContent = windowBody.innerHTML;
        }
        windowBody.innerHTML = '';
        contentTl.call(() => {
          const originalContent = el.dataset.originalContent || '';
          windowBody.innerHTML = originalContent;
          typewriterReveal(windowBody, contentDuration);
        }, null, 0);
        contentTl.to({}, { duration: contentDuration + 0.5 });
      }
      
      tl.add(() => {
        contentTimelines[id] = contentTl;
      }, '+=0');
      
      return; // Exit early for iOS
    }
    
    // Desktop/Android: Full SVG morphing animation
    // Target paths use exact same coordinates as DOM windows
    const targetBodyRect = bodyRectPath(end.x, end.y, w, h, titleH);
    const targetTitleRect = titleRectPath(end.x, end.y, w, titleH);
    const targetBorderRect = rectPath(end.x, end.y, w, h);
    const targetTitle = titleLinePath(end.x, end.y, w, titleH);

    console.log(`🚀 Launch ${id}:`, {
      target: `(${end.x}, ${end.y})`,
      size: `${w}×${h}`,
      borderPath: targetBorderRect
    });

    while (ghostLayer.firstChild) ghostLayer.removeChild(ghostLayer.firstChild);
    while (mainLayer.firstChild) mainLayer.removeChild(mainLayer.firstChild);

    const ghostContainer = document.createElementNS('http://www.w3.org/2000/svg','g');
    const mainContainer = document.createElementNS('http://www.w3.org/2000/svg','g');
      
    ghostLayer.appendChild(ghostContainer);
    mainLayer.appendChild(mainContainer);

    const mainWin = createWindowElement();
    mainContainer.appendChild(mainWin.g);

    const isMobile = window.innerWidth <= 768;
    const isDecorWindow = (id === 'decor1' || id === 'decor2');
    const ghostCount = isMobile ? 6 : (isDecorWindow ? 5 : 7);
    const ghosts = [];
    
    for (let i = 0; i < ghostCount; i++) {
      const opacity = Math.max(0.3, 0.9 - i * 0.1);
      const ghost = createGhostElement(opacity);
      ghostContainer.appendChild(ghost.g);
      ghosts.push(ghost);
    }

    // Seed shapes at start position (bottom of screen)
    const seedSize = 12;
    const seedPath = rectPath(start.x - seedSize/2, start.y - seedSize/2, seedSize, seedSize);
    const seedTitlePath = titleLinePath(start.x - seedSize/2, start.y - seedSize/2, seedSize, 4);
    
    gsap.set([mainWin.bodyFill, mainWin.titleFill, mainWin.b], { attr: { d: seedPath } });
    gsap.set(mainWin.t, { attr: { d: seedTitlePath } });

    ghosts.forEach((ghost, i) => {
      const offset = (i + 1) * 8;  // Increased spacing between ghost seeds
      const ghostSeed = rectPath(start.x - seedSize/2, start.y - seedSize/2 + offset, seedSize, seedSize);
      const ghostTitleSeed = titleLinePath(start.x - seedSize/2, start.y - seedSize/2 + offset, seedSize, 4);

      gsap.set([ghost.bodyFill, ghost.titleFill, ghost.b], { attr: { d: ghostSeed } });
      gsap.set(ghost.t, { attr: { d: ghostTitleSeed } });
    });

    const tl = gsap.timeline({ delay: delay / 1000 });

    // Calculate center point for rotation (center of final window position)
    const centerX = end.x + w / 2;
    const centerY = end.y + h / 2;

    // Main window morph
    tl.to(mainWin.bodyFill, { duration: 0.6, morphSVG: targetBodyRect, ease: 'sine.inOut' }, 0.05)
      .to(mainWin.titleFill, { duration: 0.6, morphSVG: targetTitleRect, ease: 'sine.inOut' }, 0.05)
      .to(mainWin.b, { duration: 0.6, morphSVG: targetBorderRect, ease: 'sine.inOut' }, 0.05)
      .to(mainWin.t, { duration: 0.6, morphSVG: targetTitle, ease: 'sine.inOut' }, 0.08);
    
    // Animate rotation using svgOrigin (GSAP's SVG-specific transform origin)
    if (rot !== 0) {
      tl.to(mainWin.g, { 
        duration: 0.6, 
        rotation: rot,
        svgOrigin: `${centerX} ${centerY}`,
        ease: 'sine.inOut' 
      }, 0.05);
    }

    // Ghost morphs + rotation - more staggered for better trail effect
    ghosts.forEach((ghost, i) => {
      const lag = 0.08 + i * 0.07;  // More staggered timing
      const ghostDuration = 0.5 + i * 0.08;  // Longer duration for later ghosts
      
      tl.to(ghost.bodyFill, { duration: ghostDuration, morphSVG: targetBodyRect, ease: 'sine.inOut' }, lag)
        .to(ghost.titleFill, { duration: ghostDuration, morphSVG: targetTitleRect, ease: 'sine.inOut' }, lag)
        .to(ghost.b, { duration: ghostDuration, morphSVG: targetBorderRect, ease: 'sine.inOut' }, lag)
        .to(ghost.t, { duration: ghostDuration, morphSVG: targetTitle, ease: 'sine.inOut' }, lag + 0.03);

      // Rotate ghost groups using svgOrigin
      if (rot !== 0) {
        tl.to(ghost.g, { 
          duration: ghostDuration, 
          rotation: rot,
          svgOrigin: `${centerX} ${centerY}`,
          ease: 'sine.inOut' 
        }, lag);
      }

      tl.to(ghost.g, { opacity: 0, duration: 0.28, ease: 'sine.out' }, lag + ghostDuration - 0.2);
    });

    tl.add(() => {
      contentTimelines[id] = showDom(id, end, rot, ghostContainer, mainContainer);
    }, '+=0');
  }

  // Initialize
  fitViewBox();
  applyLayoutScale();
  updateDOMWindows();
  
  window.addEventListener('resize', () => {
    fitViewBox();
    applyLayoutScale();
    updateDOMWindows();
  }, { passive: true });

  // Launch animations - called after setup is complete
  function launchAnimations() {
    const isMobile = window.innerWidth <= 768;
    const initDelay = isMobile ? 100 : 0; // Much faster start
    
    gsap.delayedCall(initDelay / 1000, () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('[Genie] Launching animations...');
          
          ['#hello-win','#about-win','#contact-win','#decor-win-1','#decor-win-2'].forEach(s => gsap.set(s, { opacity: 0 }));

          SPECS = getWindowSpecs();
          updateDOMWindows();
          
          launch('hello', 0);
          launch('about', 1000);   // More spaced out
          launch('contact', 2000); // More spaced out
          launch('decor1', 600);   
          launch('decor2', 1600);
          
          const startContentAnimations = () => {
            if (contentTimelines.hello && contentTimelines.about && contentTimelines.contact) {
              window.HELLO_BELT_DONE = false;
              
              // Create cursor early so it's ready
              const cursor = createAnimatedCursor();
              const helloWin = document.querySelector('#hello-win');
              const aboutWin = document.querySelector('#about-win');
              const contactWin = document.querySelector('#contact-win');

              // Helper to position cursor at bottom-right of a window (avoids text)
              const getCursorPosition = (rect) => {
                const cursorWidth = window.innerWidth <= 768 ? 20 : 28;
                return {
                  x: rect.right - cursorWidth - 40, // More inside from right edge
                  y: rect.bottom - 35 // More inside from bottom edge
                };
              };

              // Position cursor at hello window and show it immediately
              const showCursorAtHello = () => {
                const rect = helloWin.getBoundingClientRect();
                const pos = getCursorPosition(rect);
                gsap.set(cursor, { x: pos.x, y: pos.y, opacity: 1, scale: 1 });
              };
              
              // Show cursor right away
              showCursorAtHello();

              // STEP 1: Play hello timeline (mist belt animation)
              contentTimelines.hello.play();

              // STEP 2: When hello completes AND mist is done, move cursor to about and play
              const waitForHelloAndStartAbout = () => {
                if (window.HELLO_BELT_DONE) {
                  // Start float animations
                  const decor1Win = document.querySelector('#decor-win-1');
                  const decor2Win = document.querySelector('#decor-win-2');
                  
                  if (helloWin) floatForever(helloWin, SPECS.hello.floatAmp, SPECS.hello.floatDur);
                  if (aboutWin) floatForever(aboutWin, SPECS.about.floatAmp, SPECS.about.floatDur);
                  if (contactWin) floatForever(contactWin, SPECS.contact.floatAmp, SPECS.contact.floatDur);
                  if (decor1Win) floatForever(decor1Win, SPECS.decor1.floatAmp, SPECS.decor1.floatDur);
                  if (decor2Win) floatForever(decor2Win, SPECS.decor2.floatAmp, SPECS.decor2.floatDur);
                  
                  // Move cursor to about window, then play about timeline
                  const aboutRect = aboutWin.getBoundingClientRect();
                  const aboutPos = getCursorPosition(aboutRect);
                  gsap.to(cursor, {
                    x: aboutPos.x,
                    y: aboutPos.y,
                    duration: 0.5,
                    ease: 'power2.out',
                    onComplete: () => {
                      contentTimelines.about.play();
                      // Wait for about typing to finish, then move to contact
                      waitForAboutAndStartContact();
                    }
                  });
                } else {
                  setTimeout(waitForHelloAndStartAbout, 100);
                }
              };
              
              // Start waiting for hello
              setTimeout(waitForHelloAndStartAbout, 500);
              
              // STEP 3: Wait for about typing, then move to contact
              const waitForAboutAndStartContact = () => {
                if (window['TYPING_DONE_about-win']) {
                  const contactRect = contactWin.getBoundingClientRect();
                  const contactPos = getCursorPosition(contactRect);
                  gsap.to(cursor, {
                    x: contactPos.x,
                    y: contactPos.y,
                    duration: 0.5,
                    ease: 'power2.out',
                    onComplete: () => {
                      contentTimelines.contact.play();
                      // Wait for contact typing to finish, then go to taskbar
                      waitForContactAndGoToTaskbar();
                    }
                  });
                } else {
                  setTimeout(waitForAboutAndStartContact, 100);
                }
              };
              
              // STEP 4: Wait for contact typing, then go to taskbar
              const waitForContactAndGoToTaskbar = () => {
                if (window['TYPING_DONE_contact-win']) {
                  gsap.delayedCall(0.3, () => {
                    const isMobile = window.innerWidth <= 768;
                    const cw = isMobile ? 20 : 28;
                    
                    const taskbarClearance = isMobile ? 90 : 140;
                    gsap.to(cursor, {
                      x: (window.innerWidth / 2) - (cw / 2),
                      y: taskbarClearance,
                      duration: 0.7,
                      ease: 'power2.inOut',
                      onComplete: () => {
                        // Bounce pointing upward toward taskbar
                        gsap.to(cursor, {
                          y: taskbarClearance - 20,
                          duration: 0.4,
                          ease: 'power1.inOut',
                          yoyo: true,
                          repeat: 2,
                          onComplete: () => {
                            // Fade out
                            gsap.to(cursor, {
                              opacity: 0,
                              duration: 0.3,
                              onComplete: () => {
                                cursor.remove();
                              }
                            });
                          }
                        });
                      }
                    });
                  });
                } else {
                  setTimeout(waitForContactAndGoToTaskbar, 100);
                }
              };

            } else {
              gsap.delayedCall(0.1, startContentAnimations);
            }
          };
          
          gsap.delayedCall(3.5, startContentAnimations); // Adjusted for new spacing
        });
      });
    });
  }
  
  // Start the animations!
  launchAnimations();
  
  // ============================================
  // FUNCTIONAL SCROLLBARS
  // ============================================
  function initScrollbars() {
    const scrollableWindows = ['#about-win', '#contact-win'];
    
    scrollableWindows.forEach(selector => {
      const win = document.querySelector(selector);
      if (!win) return;
      
      const windowBody = win.querySelector('.window-body');
      const inner = win.querySelector('.window-body-inner');
      const scrollbar = win.querySelector('.faux-scrollbar');
      const track = win.querySelector('.scrollbar-track');
      const thumb = win.querySelector('.scrollbar-thumb');
      const upArrow = win.querySelector('.scrollbar-arrow-up');
      const downArrow = win.querySelector('.scrollbar-arrow-down');
      
      if (!track || !thumb) return;
      
      let thumbPosition = 8; // Starting top position
      let isDragging = false;
      let dragStartY = 0;
      let dragStartTop = 0;
      
      // Get bounds for thumb movement
      function getThumbBounds() {
        const trackHeight = track.clientHeight;
        const thumbHeight = thumb.clientHeight;
        return {
          min: 4,
          max: trackHeight - thumbHeight - 4
        };
      }
      
      // Update thumb position
      function setThumbPosition(pos) {
        const bounds = getThumbBounds();
        thumbPosition = Math.max(bounds.min, Math.min(bounds.max, pos));
        thumb.style.top = thumbPosition + 'px';
      }
      
      // Arrow click handlers
      if (upArrow) {
        upArrow.addEventListener('click', (e) => {
          e.stopPropagation();
          setThumbPosition(thumbPosition - 20);
        });
      }
      
      if (downArrow) {
        downArrow.addEventListener('click', (e) => {
          e.stopPropagation();
          setThumbPosition(thumbPosition + 20);
        });
      }
      
      // Thumb drag - mouse
      thumb.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragStartY = e.clientY;
        dragStartTop = thumbPosition;
        thumb.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
      });
      
      // Thumb drag - touch
      thumb.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scroll interference
        e.stopPropagation();
        isDragging = true;
        dragStartY = e.touches[0].clientY;
        dragStartTop = thumbPosition;
        thumb.classList.add('dragging');
      }, { passive: false });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaY = e.clientY - dragStartY;
        setThumbPosition(dragStartTop + deltaY);
      });
      
      document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault(); // Prevent page scroll while dragging
        const deltaY = e.touches[0].clientY - dragStartY;
        setThumbPosition(dragStartTop + deltaY);
      }, { passive: false });
      
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          thumb.classList.remove('dragging');
          document.body.style.cursor = '';
        }
      });
      
      document.addEventListener('touchend', () => {
        if (isDragging) {
          isDragging = false;
          thumb.classList.remove('dragging');
        }
      });
      
      // Track click - jump to position
      track.addEventListener('click', (e) => {
        if (e.target === thumb) return;
        const rect = track.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const thumbHeight = thumb.clientHeight;
        setThumbPosition(clickY - thumbHeight / 2);
      });
      
      // Initialize thumb position
      setThumbPosition(8);
    });
  }
  
  // Initialize scrollbars after animations complete
  setTimeout(initScrollbars, 5000);
  
  // ========================================
  
  } // End of initGenieAnimations function

  // SWIPE NAVIGATION - SLIDE v10 (wait for content)
  (function(){
    var startX=0,startY=0,curX=0,dragging=false,navigating=false;
    var pages=['home','project-01-copy','project-02','project-03','project-04-2'];
    var startPath='';
    var slide=null;
    
    function cur(){var p=location.pathname;return p==='/'||p==='/home'||p==='/home/'?'home':p.replace(/^\//,'');}
    function next(d){var i=pages.indexOf(cur());if(i<0)return null;return d==='L'&&i<pages.length-1?pages[i+1]:d==='R'&&i>0?pages[i-1]:null;}
    function go(id){var a=document.querySelector('a[href="'+id+'"],a[href="/'+id+'"]');a?a.click():location.href=id==='home'?'/home':'/'+id;}
    
    function createSlide(){
      if(slide&&document.body.contains(slide))return slide;
      slide=document.createElement('div');
      slide.id='swipe-slide';
      slide.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:#f5f3ed;pointer-events:none;z-index:99999;transform:translateX(100%);';
      document.body.appendChild(slide);
      return slide;
    }
    
    function ensureSlide(){
      if(!slide||!document.body.contains(slide))createSlide();
      return slide;
    }
    
    function revealSlide(){
      var s=ensureSlide();
      s.style.transition='transform 0.35s ease-out';
      s.style.transform='translateX(-100%)';
      setTimeout(function(){
        s.style.transition='none';
        s.style.transform='translateX(100%)';
        navigating=false;
      },400);
    }
    
    function waitForContent(callback){
      var checks=0;
      var maxChecks=60; // 3 seconds max
      var checker=setInterval(function(){
        checks++;
        // Check if URL changed AND there's actual content
        var hasContent=document.querySelector('.page .bodycopy')||
                       document.querySelector('#layout-wrapper')||
                       document.querySelector('article')||
                       document.querySelector('.content');
        var urlChanged=location.pathname!==startPath;
        
        if(urlChanged&&hasContent){
          clearInterval(checker);
          // Extra small delay for render
          setTimeout(callback,100);
        }
        if(checks>=maxChecks){
          clearInterval(checker);
          callback(); // Reveal anyway after timeout
        }
      },50);
    }
    
    document.addEventListener('touchstart',function(e){
      if(navigating)return;
      startX=curX=e.touches[0].clientX;
      startY=e.touches[0].clientY;
      dragging=false;
      ensureSlide().style.transition='none';
    },{passive:true});
    
    document.addEventListener('touchmove',function(e){
      if(navigating)return;
      var dx=e.touches[0].clientX-startX;
      var dy=Math.abs(e.touches[0].clientY-startY);
      var dir=dx>0?'R':'L';
      
      if(!dragging&&Math.abs(dx)>15&&dy<50&&next(dir))dragging=true;
      
      if(dragging){
        curX=e.touches[0].clientX;
        var progress=Math.abs(dx)/window.innerWidth;
        var s=ensureSlide();
        if(dir==='L'){
          s.style.transform='translateX('+(100-progress*100)+'%)';
        }else{
          s.style.transform='translateX('+(-100+progress*100)+'%)';
        }
      }
    },{passive:true});
    
    document.addEventListener('touchend',function(){
      var s=ensureSlide();
      if(!dragging||navigating){
        s.style.transition='transform 0.25s ease-out';
        s.style.transform='translateX(100%)';
        dragging=false;
        return;
      }
      
      var dx=curX-startX;
      var dir=dx>0?'R':'L';
      var progress=Math.abs(dx)/window.innerWidth;
      
      if(progress>0.2){
        var t=next(dir);
        if(t){
          navigating=true;
          startPath=location.pathname;
          
          s.style.transition='transform 0.2s ease-out';
          s.style.transform='translateX(0%)';
          
          setTimeout(function(){
            go(t);
            waitForContent(revealSlide);
          },220);
        }else{
          s.style.transition='transform 0.25s ease-out';
          s.style.transform='translateX(100%)';
        }
      }else{
        s.style.transition='transform 0.25s ease-out';
        s.style.transform=dir==='L'?'translateX(100%)':'translateX(-100%)';
      }
      dragging=false;
    },{passive:true});
    
    createSlide();
    setInterval(ensureSlide,200);
  })();

})();
