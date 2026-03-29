async function fetchGitHubStats() {
  const username = "Fals-Code";
  try {
    const userRes = await fetch(`https://api.github.com/users/${username}`);
    if (!userRes.ok) throw new Error("User not found");
    const userData = await userRes.json();
    
    const repoRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
    const repos = await repoRes.json();
    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    const repoEl = document.getElementById("repo-count");
    const starEl = document.getElementById("star-count");
    const followerEl = document.getElementById("follower-count");

    if (repoEl) animateValue(repoEl, 0, userData.public_repos, 2000);
    if (starEl) animateValue(starEl, 0, totalStars, 2000);
    if (followerEl) animateValue(followerEl, 0, userData.followers, 2000);
  } catch (error) {
    console.error("GitHub API Error:", error);
    if (document.getElementById("repo-count")) document.getElementById("repo-count").innerText = "-";
  }
}

function animateValue(obj, start, end, duration) {
  if (!obj) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start) + (end > 0 ? "+" : "");
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

  // --- GitHub Stats ---
  fetchGitHubStats();

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
});


