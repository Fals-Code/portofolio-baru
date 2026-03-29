/* ─── GitHub Manager: Caching & Stats ─────────────────────────── */
const GitHubManager = {
  username: "Fals-Code",
  cacheKey: "gh_data_cache_v1",
  cacheExpiry: 3600000, // 1 hour

  async init() {
    let data = this.getCache();
    if (!data) {
      data = await this.refreshData();
    }
    if (data) {
      this.updateStats(data);
      this.renderLanguages(data);
    } else {
      // API call failed and no cache
      const repoEl = document.getElementById("repo-count");
      if (repoEl) repoEl.innerText = "-";
      const wrap = document.getElementById("github-langs-wrap");
      if (wrap) wrap.innerHTML = `<p class='text-dim' style='text-align:center;padding:2rem 0;'><i class='fab fa-github' style='font-size:2rem;opacity:.3;display:block;margin-bottom:1rem;'></i>Data currently unavailable.</p>`;
    }
  },

  getCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < this.cacheExpiry) {
        return parsed.data;
      }
    } catch (e) { return null; }
    return null;
  },

  async refreshData() {
    try {
      const [uRes, rRes] = await Promise.all([
        fetch(`https://api.github.com/users/${this.username}`),
        fetch(`https://api.github.com/users/${this.username}/repos?per_page=100&sort=updated`)
      ]);
      if (!uRes.ok || !rRes.ok) throw new Error("GitHub API rate limit or error");
      
      const user = await uRes.json();
      const repos = await rRes.json();
      
      const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
      
      // Aggregate Languages
      const langTotals = {};
      const langColors = {
        PHP: '#4F5D95', JavaScript: '#f1e05a', HTML: '#e34c26', CSS: '#563d7c', 
        Blade: '#f7523f', Shell: '#89e051', Python: '#3572A5', TypeScript: '#2b7489'
      };

      // To stay safe with rate limits while being accurate, fetch top 15 repo languages
      const topRepos = repos.filter(r => !r.fork).slice(0, 15);
      await Promise.allSettled(topRepos.map(async r => {
        const lr = await fetch(r.languages_url);
        if (lr.ok) {
          const lData = await lr.json();
          Object.entries(lData).forEach(([l, b]) => {
            langTotals[l] = (langTotals[l] || 0) + b;
          });
        }
      }));

      const data = {
        public_repos: user.public_repos,
        followers: user.followers,
        total_stars: totalStars,
        languages: langTotals,
        repo_list_count: repos.filter(r => !r.fork).length
      };

      localStorage.setItem(this.cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
      return data;
    } catch (e) {
      console.error("GitHub Fetch Error:", e);
      return null;
    }
  },

  updateStats(data) {
    const elRepo = document.getElementById("repo-count");
    const elFollower = document.getElementById("follower-count");
    const elStar = document.getElementById("star-count");

    if (elRepo) animateValue(elRepo, 0, data.public_repos, 2000);
    if (elFollower) animateValue(elFollower, 0, data.followers, 2000);
    if (elStar) animateValue(elStar, 0, data.total_stars, 2000);
  },

  renderLanguages(data) {
    const wrap = document.getElementById("github-langs-wrap");
    if (!wrap || !data.languages) return;

    const langColors = {
        PHP: '#4F5D95', JavaScript: '#f1e05a', HTML: '#e34c26', CSS: '#563d7c', 
        Blade: '#f7523f', Shell: '#89e051', Python: '#3572A5', TypeScript: '#2b7489',
        Vue: '#41b883', Java: '#b07219', C: '#555555', 'C++': '#f34b7d'
    };

    const total = Object.values(data.languages).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const sorted = Object.entries(data.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const bar = sorted.map(([lang, bytes]) => {
      const pct = (bytes / total * 100).toFixed(1);
      const color = langColors[lang] || '#6b7280';
      return `<div class="gh-lang-segment" style="width:${pct}%;background:${color};" title="${lang}: ${pct}%"></div>`;
    }).join("");

    const cards = sorted.map(([lang, bytes], i) => {
      const pct = (bytes / total * 100).toFixed(1);
      const color = langColors[lang] || '#6b7280';
      return `
        <div class="gh-lang-card" style="animation-delay:${i * 0.05}s">
          <div class="gh-lang-dot" style="background:${color};box-shadow:0 0 8px ${color}66;"></div>
          <div class="gh-lang-info">
            <span class="gh-lang-name">${lang}</span>
            <span class="gh-lang-pct" style="color:${color}">${pct}%</span>
          </div>
          <div class="gh-lang-bar-wrap">
            <div class="gh-lang-bar-fill" style="width:${pct}%;background:${color};"></div>
          </div>
        </div>`;
    }).join("");

    wrap.innerHTML = `
      <div class="gh-meta">
        <span><i class="fab fa-github"></i> <strong>${this.username}</strong></span>
        <span class="gh-repo-count">from ${data.repo_list_count} repos</span>
      </div>
      <div class="gh-stacked-bar">${bar}</div>
      <div class="gh-lang-grid">${cards}</div>`;
  }
};

function animateValue(obj, start, end, duration) {
  if (!obj) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    obj.innerHTML = value + (end > 0 ? "+" : "");
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

const App = {
  init() {
    this.initPage();
    this.initBarba();
  },

  initPage() {
    console.log("App: Initializing page components...");
    
    // --- GitHub Manager ---
    if (typeof GitHubManager !== 'undefined') {
      GitHubManager.init();
    }

    // --- V3 Reveal Observer ---
    const revealElements = document.querySelectorAll(".reveal");
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => { 
          if (entry.isIntersecting) { 
              entry.target.classList.add("visible"); 
          } 
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    revealElements.forEach(el => {
        revealObserver.observe(el);
        if (el.getBoundingClientRect().top < window.innerHeight) {
            setTimeout(() => el.classList.add('visible'), 500);
        }
    });

    // --- Typewriter Effect ---
    const typeTarget = document.getElementById("typewriter");
    if (typeTarget) {
        this.initTypewriter(typeTarget);
    }

    // --- Project Filter ---
    this.initProjectFilter();
    
    // --- Active Nav Link ---
    this.updateActiveNav();
    
    // --- Theme Fixes ---
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    this.fixGithubIconLinks(currentTheme);

    // --- Formspree Handler ---
    this.initContactForm();

    // --- Dynamic Year ---
    const yearSpan = document.getElementById("year");
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    // --- Back to Top ---
    const backToTopBtn = document.getElementById("backToTop");
    if (backToTopBtn) {
        // Re-bind scroll listener for visibility if needed, 
        // but backToTop is likely outside the container.
    }
  },

  initContactForm() {
    const contactForm = document.getElementById("contactForm");
    const formStatus = document.getElementById("formStatus");
    if (!contactForm || !formStatus) return;

    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("submitBtn");
        const originalText = btn.innerHTML;
        btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i><span>Mengirim...</span>";
        btn.disabled = true;

        const data = new FormData(contactForm);
        try {
            const res = await fetch(contactForm.action, {
                method: contactForm.method,
                body: data,
                headers: { 'Accept': 'application/json' }
            });
            if (res.ok) {
                formStatus.innerHTML = "<div class='form-status success'>Pesan berhasil dikirim!</div>";
                contactForm.reset();
            } else {
                formStatus.innerHTML = "<div class='form-status error'>Gagal mengirim pesan.</div>";
            }
        } catch (error) {
            formStatus.innerHTML = "<div class='form-status error'>Terjadi kesalahan jaringan.</div>";
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
  },

  initTypewriter(target) {
    const roles = ["Backend Developer", "Laravel Enthusiast", "Problem Solver"];
    let roleIdx = 0, charIdx = 0, isDeleting = false;
    const typeLoop = () => {
        if (!document.getElementById("typewriter")) return; // Stop if element is gone
        const currentRole = roles[roleIdx];
        target.textContent = currentRole.substring(0, charIdx);
        let speed = isDeleting ? 50 : 100;
        if (!isDeleting && charIdx === currentRole.length) {
            speed = 2000; isDeleting = true;
        } else if (isDeleting && charIdx === 0) {
            isDeleting = false; roleIdx = (roleIdx + 1) % roles.length; speed = 500;
        }
        charIdx += isDeleting ? -1 : 1;
        setTimeout(typeLoop, speed);
    };
    setTimeout(typeLoop, 1000);
  },

  updateActiveNav() {
    const currentFileName = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach(link => {
        const linkHref = link.getAttribute("href");
        if (!linkHref) return;
        const linkFile = linkHref.split("/").pop();
        if (currentFileName === linkFile || (currentFileName === "" && linkFile === "index.html")) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
  },

  fixGithubIconLinks(theme) {
    document.querySelectorAll('.tech-card img[alt="GitHub"]').forEach((img) => {
      img.style.filter = (theme === "dark" || theme === "matrix") ? "invert(1)" : "none";
    });
  },

  initProjectFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card[data-tags]');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            projectCards.forEach(card => {
                const tags = card.dataset.tags;
                const isVisible = filter === 'all' || tags.includes(filter);
                card.style.opacity = isVisible ? '1' : '0.3';
                card.style.transform = isVisible ? 'scale(1)' : 'scale(0.95)';
                card.style.pointerEvents = isVisible ? 'all' : 'none';
            });
        });
    });
  },

  initBarba() {
    if (typeof barba === 'undefined') return;

    barba.init({
      transitions: [{
        name: 'opacity-transition',
        leave(data) {
          return gsap.to(data.current.container, {
            opacity: 0,
            duration: 0.5
          });
        },
        enter(data) {
          return gsap.from(data.next.container, {
            opacity: 0,
            duration: 0.5
          });
        }
      }]
    });

    barba.hooks.afterEnter((data) => {
      window.scrollTo(0, 0);
      this.initPage();
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // --- Persistent Elements (Initialize once) ---
  
  // Theme Setup
  const overlay = document.createElement("div");
  overlay.className = "theme-overlay";
  document.body.appendChild(overlay);

  const themeToggleNode = document.getElementById("themeToggle");
  const themeIconNode = document.getElementById("themeIcon");
  const initialTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", initialTheme);
  
  if (themeToggleNode) {
    themeToggleNode.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      if (themeIconNode) themeIconNode.className = next === "dark" ? "fas fa-moon theme-icon" : "fas fa-sun theme-icon";
      App.fixGithubIconLinks(next);
    });
  }

  // Hamburger
  const hamburgerMenu = document.getElementById("hamburger");
  const navbarLinks = document.getElementById("navLinks");
  if (hamburgerMenu && navbarLinks) {
      hamburgerMenu.addEventListener("click", () => { navbarLinks.classList.toggle("open"); hamburgerMenu.classList.toggle("active"); });
  }

  // Loader
  const pageLoader = document.getElementById("loader");
  if (pageLoader) {
      window.addEventListener("load", () => setTimeout(() => pageLoader.classList.add("hidden"), 800));
      setTimeout(() => pageLoader.classList.add("hidden"), 3000);
  }

  // Initialize App
  App.init();
});


