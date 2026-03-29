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

document.addEventListener("DOMContentLoaded", () => {
  // --- Noise Overlay ---
  const noise = document.createElement("div");
  noise.className = "noise-overlay";
  document.body.appendChild(noise);

  // --- GitHub Manager ---
  GitHubManager.init();

  // --- Theme Transition Overlay ---
  const overlay = document.createElement("div");
  overlay.className = "theme-overlay";
  document.body.appendChild(overlay);

  // --- Legacy Audio Player Removed (Replaced by MusicSystem) ---

  // --- Terminal Intro / Interactive Shell ---
  const terminalOverlay = document.getElementById("terminal-intro");
  const terminalBody = document.getElementById("terminal-body");
  
  const introLines = [
    { text: "Initializing portfolio session...", type: "info" },
    { text: "User: Falah_Visitor", type: "success" },
    { text: "Access level: AUTHORIZED", type: "success" },
    { text: "Type 'help' to see commands or 'game' to play.", type: "dim" }
  ];

  async function runTerminal() {
    if (!terminalOverlay) return;
    if (sessionStorage.getItem("visited")) { terminalOverlay.remove(); return; }
    for (let line of introLines) { await typeLine(line.text, line.type); }
    showInput();
  }

  async function typeLine(text, type) {
    const lineEl = document.createElement("div");
    lineEl.className = `terminal-line text-${type}`;
    terminalBody.appendChild(lineEl);
    for (let char of text) { lineEl.textContent += char; await new Promise(r => setTimeout(r, 20)); }
    await new Promise(r => setTimeout(r, 300));
  }

  function showInput() {
    const inputLine = document.createElement("div");
    inputLine.className = "terminal-input-line";
    inputLine.innerHTML = `<span class="terminal-prompt">falah@portfolio:~$</span><input type="text" class="terminal-input" autofocus>`;
    terminalBody.appendChild(inputLine);
    const input = inputLine.querySelector("input");
    if (input) input.focus();

    input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            const val = input.value.trim();
            const args = val.toLowerCase().split(" ");
            const cmd = args[0];
            input.disabled = true;
            
            const isSubDir = window.location.pathname.includes("/projects/");
            const prefix = isSubDir ? "../" : "";

            if (cmd === "game") {
                await typeLine("Redirecting to system_game.exe...", "success");
                window.location.href = prefix + "game.html";
            } else if (cmd === "sudo" && args[1] === "guestbook") {
                const msg = val.substring(15).trim();
                if (msg) {
                    await typeLine(`Saving message: "${msg}"...`, "info");
                    setTimeout(async () => {
                        await typeLine("Message logged in system core. Thank you!", "success");
                        inputLine.remove(); showInput();
                    }, 1000);
                } else {
                    await typeLine("Usage: sudo guestbook <your message>", "accent");
                    inputLine.remove(); showInput();
                }
            } else if (["exit", "about", "projects", "contact", "home", "blog"].includes(cmd)) {
                await typeLine(`Opening ${cmd} page...`, "info");
                sessionStorage.setItem("visited", "true");
                if (cmd === "exit") { 
                    terminalOverlay.classList.add("hidden"); 
                    setTimeout(() => terminalOverlay.remove(), 800); 
                } else {
                    const target = (cmd === "home") ? "index.html" : `${cmd}.html`;
                    window.location.href = prefix + target;
                }
            } else if (cmd === "help") {
                await typeLine("Available: game, about, projects, blog, contact, exit, clear, sudo guestbook", "dim");
                inputLine.remove(); showInput();
            } else if (cmd === "clear") {
                terminalBody.innerHTML = ""; showInput();
            } else {
                await typeLine(`Command not found: ${cmd}`, "accent");
                inputLine.remove(); showInput();
            }
        }
    });

  }

  runTerminal();

  // --- Smooth Theme Transition ---
  async function toggleTheme(nextTheme, x = window.innerWidth / 2, y = window.innerHeight / 2) {
    if (overlay.classList.contains('active')) return;
    
    overlay.style.left = `${x}px`;
    overlay.style.top = `${y}px`;
    overlay.classList.add("active");
    
    await new Promise(r => setTimeout(r, 400));
    
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    
    if (themeIconNode) {
        themeIconNode.className = nextTheme === "dark" ? "fas fa-moon theme-icon" : "fas fa-sun theme-icon";
    }
    fixGithubIconLinks(nextTheme);

    await new Promise(r => setTimeout(r, 400));
    overlay.classList.remove("active");
  }

  // --- Theme Toggle Button ---
  const htmlElement = document.documentElement;
  const themeToggleNode = document.getElementById("themeToggle");
  const themeIconNode = document.getElementById("themeIcon");
  const initialTheme = localStorage.getItem("theme") || "light";

  htmlElement.setAttribute("data-theme", initialTheme);
  if (themeIconNode) themeIconNode.className = initialTheme === "dark" ? "fas fa-moon theme-icon" : "fas fa-sun theme-icon";

  if (themeToggleNode) {
      themeToggleNode.addEventListener("click", (e) => {
        const current = htmlElement.getAttribute("data-theme");
        const next = current === "light" ? "dark" : "light";
        toggleTheme(next, e.clientX, e.clientY);
      });
  }

  function fixGithubIconLinks(theme) {
    document.querySelectorAll('.tech-card img[alt="GitHub"]').forEach((img) => {
      img.style.filter = (theme === "dark" || theme === "matrix") ? "invert(1)" : "none";
    });
  }

  // --- Konami Code (Matrix Mode) ---
  const konamiKeyList = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let konamiCurrentIndex = 0;

  document.addEventListener("keydown", (e) => {
    if (e.key === konamiKeyList[konamiCurrentIndex]) {
        konamiCurrentIndex++;
        if (konamiCurrentIndex === konamiKeyList.length) {
            toggleTheme("matrix");
            konamiCurrentIndex = 0;
        }
    } else {
        konamiCurrentIndex = 0;
    }
  });

  // --- Core Functionality ---
  const pageLoader = document.getElementById("loader");
  if (pageLoader) {
      window.addEventListener("load", () => setTimeout(() => pageLoader.classList.add("hidden"), 800));
      setTimeout(() => pageLoader.classList.add("hidden"), 3000);
  }

  const hamburgerMenu = document.getElementById("hamburger");
  const navbarLinks = document.getElementById("navLinks");
  if (hamburgerMenu && navbarLinks) {
      hamburgerMenu.addEventListener("click", () => { navbarLinks.classList.toggle("open"); hamburgerMenu.classList.toggle("active"); });
      navbarLinks.querySelectorAll("a").forEach(link => { link.addEventListener("click", () => { navbarLinks.classList.remove("open"); hamburgerMenu.classList.remove("active"); }); });
  }

  // --- Page Link Active State ---
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
      
      // Special case for sub-projects
      if (window.location.pathname.includes("/projects/") && linkFile === "projects.html") {
          link.classList.add("active");
      }
  });

  // --- V3 Reveal Observer & Fallback ---
  const revealElements = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { 
        if (entry.isIntersecting) { 
            entry.target.classList.add("visible"); 
            if (entry.target.classList.contains('skill-node')) entry.target.classList.add('visible'); 
        } 
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  revealElements.forEach(el => {
      revealObserver.observe(el);
      // Guarantee reveal if visible on load
      if (el.getBoundingClientRect().top < window.innerHeight) {
          setTimeout(() => el.classList.add('visible'), 500);
      }
  });

  // --- V3 Typewriter Effect ---
  const typeTarget = document.getElementById("typewriter");
  if (typeTarget) {
      const roles = ["Backend Developer", "Laravel Enthusiast", "Problem Solver"];
      let roleIdx = 0, charIdx = 0, isDeleting = false;
      const typeLoop = () => {
          const currentRole = roles[roleIdx];
          typeTarget.textContent = currentRole.substring(0, charIdx);
          let speed = isDeleting ? 50 : 100;
          if (!isDeleting && charIdx === currentRole.length) {
              speed = 2000; isDeleting = true;
          } else if (isDeleting && charIdx === 0) {
              isDeleting = false; roleIdx = (roleIdx + 1) % roles.length; speed = 500;
          }
          charIdx += isDeleting ? -1 : 1;
          setTimeout(typeLoop, speed);
      };
      setTimeout(typeLoop, 1500); // Wait for initial loader transition
  }

  const backToTopBtn = document.getElementById("backToTop");
  if (backToTopBtn) {
    window.addEventListener("scroll", () => backToTopBtn.classList.toggle("show", window.scrollY > 400));
    backToTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // --- Cursor Glow (Optimized) ---
  const glow = document.getElementById("cursorGlow");
  if (glow && window.matchMedia("(pointer: fine)").matches) {
      document.addEventListener("mousemove", (e) => {
          glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      });
  } else if (glow) {
      glow.style.display = "none";
  }

  // --- Dynamic Year ---
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // --- Formspree AJAX Handler ---
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  if (contactForm && formStatus) {
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
                  formStatus.innerHTML = "<div style='color: var(--green); margin-top: 1rem;'>Pesan berhasil dikirim!</div>";
                  contactForm.reset();
              } else {
                  formStatus.innerHTML = "<div style='color: var(--accent); margin-top: 1rem;'>Gagal mengirim pesan. Silakan coba lagi.</div>";
              }
          } catch (error) {
              formStatus.innerHTML = "<div style='color: var(--accent); margin-top: 1rem;'>Terjadi kesalahan jaringan.</div>";
          }
          btn.innerHTML = originalText;
          btn.disabled = false;
      });
  }

  // --- Service Worker ---
  if ('serviceWorker' in navigator) {
      const prefix = window.location.pathname.includes("/projects/") ? "../" : "";
      navigator.serviceWorker.register(prefix + 'sw.js').catch(err => console.log('SW failed', err));
  }

  // ─── Mobile / Safari Compatibility Fixes ────────────────────────

  // 1. iOS Safari Visual Viewport fix (dynamic toolbar shrinks/grows)
  //    Sets --vh CSS variable so 100svh works on older iOS too
  function setVH() {
      const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  setVH();
  if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH);
  } else {
      window.addEventListener('resize', setVH, { passive: true });
  }

  // 2. Close nav when tapping outside (mobile UX)
  document.addEventListener('click', (e) => {
      if (!navbarLinks || !hamburgerMenu) return;
      if (navbarLinks.classList.contains('open') && !navbarLinks.contains(e.target) && !hamburgerMenu.contains(e.target)) {
          navbarLinks.classList.remove('open');
          hamburgerMenu.classList.remove('active');
      }
  }, { passive: true });

  // 3. Prevent iOS bounce scroll from affecting page layout
  document.addEventListener('touchmove', (e) => {
      // Allow scrolling inside chatbot messages
      if (e.target.closest('.chatbot-messages')) return;
  }, { passive: true });

  // 4. Prevent iOS focus zoom on inputs (covered by CSS font-size:16px,
  //    but also blur on orientation change to avoid stuck zoom)
  window.addEventListener('orientationchange', () => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
          document.activeElement.blur();
      }
      // Re-calculate vh after orientation change
      setTimeout(setVH, 300);
  }, { passive: true });

  // 5. Smooth scroll polyfill check (iOS < 15.4 doesn't support scroll-behavior: smooth)
  if (!('scrollBehavior' in document.documentElement.style)) {
      // Polyfill smooth scroll for back-to-top button
      const bttBtn = document.getElementById('backToTop');
      if (bttBtn) {
          bttBtn.addEventListener('click', (e) => {
              e.preventDefault();
              const start = window.scrollY;
              const duration = 500;
              let startTime = null;
              const step = (timestamp) => {
                  if (!startTime) startTime = timestamp;
                  const elapsed = timestamp - startTime;
                  const progress = Math.min(elapsed / duration, 1);
                  const ease = 1 - Math.pow(1 - progress, 3);
                  window.scrollTo(0, start * (1 - ease));
                  if (progress < 1) requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
          });
      }
  }
});


