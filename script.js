// === ACCESS GATE ===
const SECRET_PATH = '/f3kpx7mq/';

// If user is on the secret path — remember access
if (window.location.pathname.startsWith(SECRET_PATH)) {
    localStorage.setItem('guide_access', SECRET_PATH);
}

// Rewrite header links to use secret path instead of root
function rewriteHeaderLinks() {
    const accessPath = localStorage.getItem('guide_access');
    if (!accessPath) return;

    document.querySelectorAll('a.logo, .nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === '/' || href === '/index.html') {
            link.setAttribute('href', accessPath);
        } else if (href && href.startsWith('/#')) {
            link.setAttribute('href', accessPath + href.substring(1));
        }
    });
}

// === LOAD COMPONENTS ===
// Note: loadComponent inserts trusted HTML from local component files (same-origin fetch).
// These are static files under our control, not user-generated content.
async function loadComponent(elementId, componentPath) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const response = await fetch(componentPath);
        if (response.ok) {
            const html = await response.text();
            element.innerHTML = html; // Safe: same-origin static HTML components
            if (elementId === 'header-placeholder') {
                initMobileMenu();
                rewriteHeaderLinks();
            }
        }
    } catch (e) {
        console.error('Failed to load component:', componentPath, e);
    }
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

// === TYPING EFFECT ===
const typingPhrases = [
    'openclaw --help',
    'curl -fsSL https://openclaw.ai/install.sh | bash',
    'Привет! Напиши мне план на день.',
    'Создай сайт-визитку за 30 секунд',
    'Проанализируй этот PDF файл',
    'Напомни мне завтра в 9:00'
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

const typingElement = document.getElementById('typing');

function typeEffect() {
    const currentPhrase = typingPhrases[phraseIndex];

    if (isDeleting) {
        typingElement.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 50;
    } else {
        typingElement.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 100;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
        isDeleting = true;
        typingSpeed = 2000; // Pause before deleting
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % typingPhrases.length;
        typingSpeed = 500; // Pause before typing new phrase
    }

    setTimeout(typeEffect, typingSpeed);
}

// Start typing effect
document.addEventListener('DOMContentLoaded', () => {
    // Start typing effect if element exists
    if (document.getElementById('typing')) {
        setTimeout(typeEffect, 1000);
    }
});

// === TAB SWITCHING ===
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;

        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    });
});

// === COPY TO CLIPBOARD ===
const copyButtons = document.querySelectorAll('.copy-btn');

copyButtons.forEach(button => {
    button.addEventListener('click', async () => {
        const textToCopy = button.dataset.copy;

        try {
            await navigator.clipboard.writeText(textToCopy);

            // Visual feedback
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

// === SMOOTH SCROLL FOR ANCHOR LINKS ===
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// === INTERSECTION OBSERVER FOR ANIMATIONS ===
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Animate sections on scroll
document.querySelectorAll('.section, .feature').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});
