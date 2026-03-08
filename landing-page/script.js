// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // 1. Copy to Clipboard functionality
    const copyBtns = document.querySelectorAll('.copy-btn');
    
    copyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const codeToCopy = 'npx devscan@latest';
            
            try {
                await navigator.clipboard.writeText(codeToCopy);
                
                // Visual feedback
                const icon = btn.querySelector('i');
                const originalClass = icon.className;
                
                icon.className = 'ph-fill ph-check-circle';
                icon.style.color = 'var(--success)';
                btn.style.transform = 'scale(1.1)';
                
                // Reset after 2 seconds
                setTimeout(() => {
                    icon.className = originalClass;
                    icon.style.color = '';
                    btn.style.transform = '';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        });
    });

    // 2. Scroll Reveal Animations (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
    
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
        revealElements.forEach(el => {
            el.classList.add('active');
            el.style.transitionDuration = '0s';
            el.style.transitionDelay = '0s';
        });
    } else {
        const revealOptions = {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        };
        
        const revealObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    return;
                }
                
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            });
        }, revealOptions);
        
        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
        
        // Trigger reveal for items immediately in viewport on load
        setTimeout(() => {
            revealElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top <= window.innerHeight) {
                    el.classList.add('active');
                }
            });
        }, 100);
    }
    
    // 3. Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(5, 5, 5, 0.85)';
            navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            navbar.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        } else {
            navbar.style.background = 'rgba(5, 5, 5, 0.7)';
            navbar.style.borderBottom = '1px solid var(--border-color)';
            navbar.style.boxShadow = 'none';
        }
    });

    // 4. Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navHeight = navbar.offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
