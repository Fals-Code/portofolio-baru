async function fetchGitHubStats() {
  const username = "Fals-Code";
  try {
    const userRes = await fetch(`https://api.github.com/users/Fals-Code`);
    if (!userRes.ok) throw new Error("User tidak ditemukan");
    const userData = await userRes.json();
    const repoRes = await fetch(
      `https://api.github.com/users/Fals-Code/repos?per_page=100`,
    );
    const repos = await repoRes.json();
    const totalStars = repos.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0,
    );

    animateValue(
      document.getElementById("repo-count"),
      0,
      userData.public_repos,
      2000,
    );
    animateValue(document.getElementById("star-count"), 0, totalStars, 2000);
    animateValue(
      document.getElementById("follower-count"),
      0,
      userData.followers,
      2000,
    );
  } catch (error) {
    console.error("GitHub API Error:", error);
    if (document.getElementById("repo-count"))
      document.getElementById("repo-count").innerText = "-";
  }
}

function animateValue(obj, start, end, duration) {
  if (!obj) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start) + "+";
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

document.addEventListener("DOMContentLoaded", fetchGitHubStats);

document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  window.addEventListener("load", () => {
    setTimeout(() => loader.classList.add("hidden"), 800);
  });
  setTimeout(() => loader.classList.add("hidden"), 3000);

  const html = document.documentElement;
  const toggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const savedTheme = localStorage.getItem("theme") || "light";

  html.setAttribute("data-theme", savedTheme);
  applyThemeIcon(savedTheme);
  fixGithubIcon(savedTheme);

  toggle.addEventListener("click", () => {
    const current = html.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    applyThemeIcon(next);
    fixGithubIcon(next);
  });

  function applyThemeIcon(theme) {
    themeIcon.className =
      theme === "dark" ? "fas fa-moon theme-icon" : "fas fa-sun theme-icon";
  }

  function fixGithubIcon(theme) {
    document.querySelectorAll('.tech-card img[alt="GitHub"]').forEach((img) => {
      img.style.filter = theme === "dark" ? "invert(1)" : "none";
    });
  }

  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });

  const revealEls = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.1 },
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  const sections = document.querySelectorAll("section[id]");
  const navAnchors = document.querySelectorAll(".nav-links a");
  window.addEventListener("scroll", highlightNavLink, { passive: true });

  function highlightNavLink() {
    let current = "";
    sections.forEach((section) => {
      if (window.scrollY >= section.offsetTop - 100) {
        current = section.getAttribute("id");
      }
    });
    navAnchors.forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === `#${current}`);
    });
  }

  const backToTop = document.getElementById("backToTop");
  window.addEventListener(
    "scroll",
    () => {
      backToTop.classList.toggle("show", window.scrollY > 400);
    },
    { passive: true },
  );

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const glow = document.getElementById("cursorGlow");
  if (window.matchMedia("(pointer: fine)").matches) {
    document.addEventListener("mousemove", (e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    });
  } else {
    glow.style.display = "none";
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  const contactForm = document.getElementById("contactForm");
  const submitBtn = document.getElementById("submitBtn");
  const formStatus = document.getElementById("formStatus");
  const FORMSPREE_URL = "https://formspree.io/f/xbdaeavv";

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> <span>Sending...</span>';
    formStatus.className = "form-status";
    formStatus.textContent = "";

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        formStatus.className = "form-status success";
        formStatus.textContent =
          "\u2705 Pesan terkirim! Saya akan segera membalasnya.";
        contactForm.reset();
      } else {
        throw new Error("Server error");
      }
    } catch {
      formStatus.className = "form-status error";
      formStatus.textContent =
        "\u274c Gagal mengirim. Silakan hubungi via email langsung.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<i class="fas fa-paper-plane"></i> <span>Send Message</span>';
      setTimeout(() => {
        formStatus.textContent = "";
        formStatus.className = "form-status";
      }, 6000);
    }
  });
});
