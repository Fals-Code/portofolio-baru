// Mobile Menu Toggle & Viewport Height Fix
document.addEventListener("DOMContentLoaded", function () {
  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("mainNav");
  const navOverlay = document.getElementById("navOverlay");
  const navLinks = mainNav.querySelectorAll(".link");

  // Toggle Mobile Menu
  function toggleMenu() {
    const isOpen = navToggle.classList.toggle("is-active");
    mainNav.classList.toggle("show");
    navOverlay.classList.toggle("show");
    document.body.style.overflow = mainNav.classList.contains("show")
      ? "hidden"
      : "";

    // Update aria-expanded for accessibility
    navToggle.setAttribute("aria-expanded", isOpen);
  }

  // Close Mobile Menu
  function closeMenu() {
    navToggle.classList.remove("is-active");
    mainNav.classList.remove("show");
    navOverlay.classList.remove("show");
    document.body.style.overflow = "";
    navToggle.setAttribute("aria-expanded", "false");
  }

  // Event Listeners
  navToggle.addEventListener("click", toggleMenu);
  navOverlay.addEventListener("click", closeMenu);

  navLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Fix Viewport Height for Mobile (especially iOS)
  function setVH() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }

  setVH();
  window.addEventListener("resize", setVH);
  window.addEventListener("orientationchange", setVH);

  // Smooth Scroll Enhancement
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;

      e.preventDefault();
      const target = document.querySelector(targetId);

      if (target) {
        const offsetTop = target.offsetTop - 70;
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });
      }
    });
  });

  // Add active state to navigation on scroll
  const sections = document.querySelectorAll("section[id]");

  function updateActiveNav() {
    const scrollY = window.pageYOffset;

    sections.forEach((section) => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 100;
      const sectionId = section.getAttribute("id");

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach((link) => {
          link.classList.remove("active");
          if (link.getAttribute("href") === `#${sectionId}`) {
            link.classList.add("active");
          }
        });
      }
    });
  }

  window.addEventListener("scroll", updateActiveNav);

  const inputs = document.querySelectorAll("input, textarea, select");
  inputs.forEach((input) => {
    input.addEventListener("focus", function () {
      if (window.innerWidth < 768) {
        this.style.fontSize = "16px";
      }
    });
  });
});
