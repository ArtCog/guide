// === GUIDE PAGE SCRIPTS ===

// === LOAD COMPONENTS ===
async function loadComponent(elementId, componentPath) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const response = await fetch(componentPath);
        if (response.ok) {
            const html = await response.text();
            element.innerHTML = html;

            // Re-initialize mobile menu after header loads
            if (elementId === 'header-placeholder') {
                initMobileMenu();
            }
        }
    } catch (e) {
        console.error('Failed to load component:', componentPath, e);
    }
}

// === GENERATE TABLE OF CONTENTS ===
function generateTOC() {
    const tocList = document.getElementById('toc-list');
    if (!tocList) return;

    const headings = document.querySelectorAll('.guide-body h2, .guide-body h3');
    let html = '';

    headings.forEach((heading, index) => {
        // Create ID if it doesn't exist
        if (!heading.id) {
            heading.id = 'section-' + index;
        }

        const level = heading.tagName === 'H2' ? 'toc-h2' : 'toc-h3';
        html += `<li class="${level}">
            <a href="#${heading.id}" class="toc-link">${heading.textContent}</a>
        </li>`;
    });

    tocList.innerHTML = html;
}

// === READING PROGRESS BAR ===
function updateReadingProgress() {
    const progressBar = document.getElementById('reading-progress');
    if (!progressBar) return;

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    progressBar.style.width = progress + '%';
}

// === ACTIVE TOC LINK ON SCROLL ===
function updateActiveTOCLink() {
    const headings = document.querySelectorAll('.guide-body h2, .guide-body h3');
    const tocLinks = document.querySelectorAll('.toc-link');

    let current = '';

    headings.forEach(heading => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 120) {
            current = heading.id;
        }
    });

    tocLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
}

// === SMOOTH SCROLL FOR TOC LINKS ===
function initTOCLinks() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('toc-link')) {
            e.preventDefault();
            const targetId = e.target.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                const headerOffset = 100;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.scrollY - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });
}

// === MOBILE MENU ===
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (!menuBtn || !navLinks) return;

    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// === COPY CODE BLOCKS ===
function initCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const textToCopy = button.dataset.copy;

            try {
                await navigator.clipboard.writeText(textToCopy);

                const originalText = button.textContent;
                button.textContent = 'Скопировано!';
                button.classList.add('copied');

                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();

                try {
                    document.execCommand('copy');
                    button.textContent = 'Скопировано!';
                    button.classList.add('copied');

                    setTimeout(() => {
                        button.textContent = 'Копировать';
                        button.classList.remove('copied');
                    }, 2000);
                } catch (e) {
                    console.error('Failed to copy:', e);
                }

                document.body.removeChild(textArea);
            }
        });
    });
}

// === SCROLL THROTTLE ===
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    // Determine base path based on current location
    const pathParts = window.location.pathname.split('/');
    const inGuidesFolder = pathParts.includes('guides');
    const depth = inGuidesFolder ? pathParts.filter(p => p).length - 1 : 0;

    let basePath = '';
    if (depth >= 2) {
        basePath = '../../';
    } else if (depth === 1) {
        basePath = '../';
    }

    // Load components
    loadComponent('header-placeholder', basePath + 'components/header.html');
    loadComponent('footer-placeholder', basePath + 'components/footer.html');

    // Generate TOC
    generateTOC();

    // Init TOC links
    initTOCLinks();

    // Init copy buttons
    initCopyButtons();

    // Scroll listeners with throttle
    const throttledScroll = throttle(() => {
        updateReadingProgress();
        updateActiveTOCLink();
    }, 50);

    window.addEventListener('scroll', throttledScroll);

    // Initial call
    updateReadingProgress();
    updateActiveTOCLink();
});
