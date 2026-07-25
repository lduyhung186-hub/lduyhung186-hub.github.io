const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const carousel = document.querySelector("[data-carousel]");

if (carousel) {
  const slides = [...carousel.querySelectorAll("[data-slide]")];
  const dots = [...carousel.querySelectorAll("[data-slide-to]")];
  const status = carousel.querySelector("[data-slide-status]");
  const previous = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");
  const labels = slides.map((slide, index) => {
    const title = slide.querySelector("figcaption strong")?.textContent?.trim() || "视觉记录";
    return `${String(index + 1).padStart(2, "0")} — ${title}`;
  });
  let activeIndex = 0;
  let timer;

  const showSlide = (index) => {
    activeIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });

    status.textContent = labels[activeIndex];
  };

  const stopAutoPlay = () => window.clearInterval(timer);
  const startAutoPlay = () => {
    stopAutoPlay();
    if (!reducedMotion.matches) {
      timer = window.setInterval(() => showSlide(activeIndex + 1), 5200);
    }
  };

  previous.addEventListener("click", () => {
    showSlide(activeIndex - 1);
    startAutoPlay();
  });

  next.addEventListener("click", () => {
    showSlide(activeIndex + 1);
    startAutoPlay();
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showSlide(Number(dot.dataset.slideTo));
      startAutoPlay();
    });
  });

  carousel.addEventListener("pointerenter", stopAutoPlay);
  carousel.addEventListener("pointerleave", startAutoPlay);
  carousel.addEventListener("focusin", stopAutoPlay);
  carousel.addEventListener("focusout", startAutoPlay);
  reducedMotion.addEventListener("change", startAutoPlay);

  showSlide(0);
  startAutoPlay();
}

document.querySelectorAll("[data-switcher]").forEach((switcher) => {
  const controls = [...switcher.querySelectorAll("[data-switch-target]")];
  const panels = [...switcher.querySelectorAll("[data-switch-panel]")];
  if (!controls.length || !panels.length) return;

  const availableIds = new Set(panels.map((panel) => panel.id));

  const activate = (targetId, updateHash = true) => {
    const safeTarget = availableIds.has(targetId) ? targetId : switcher.dataset.defaultPanel;

    controls.forEach((control) => {
      const isActive = control.dataset.switchTarget === safeTarget;
      control.classList.toggle("is-active", isActive);
      control.setAttribute("aria-selected", String(isActive));
      control.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.id === safeTarget;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (updateHash && safeTarget) {
      history.replaceState(null, "", `#${safeTarget}`);
    }
  };

  controls.forEach((control, controlIndex) => {
    control.addEventListener("click", () => activate(control.dataset.switchTarget));
    control.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = controlIndex;
      if (["ArrowDown", "ArrowRight"].includes(event.key)) nextIndex = (controlIndex + 1) % controls.length;
      if (["ArrowUp", "ArrowLeft"].includes(event.key)) nextIndex = (controlIndex - 1 + controls.length) % controls.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = controls.length - 1;
      controls[nextIndex].focus();
      activate(controls[nextIndex].dataset.switchTarget);
    });
  });

  const requestedPanel = window.location.hash.slice(1);
  activate(availableIds.has(requestedPanel) ? requestedPanel : switcher.dataset.defaultPanel, false);
});

const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");

if (menuToggle && navigation) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  menuToggle.addEventListener("click", () => {
    const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    navigation.classList.toggle("is-open", willOpen);
    document.body.style.overflow = willOpen ? "hidden" : "";
  });

  navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });
}

const header = document.querySelector("[data-header]");
const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const revealItems = document.querySelectorAll(".reveal");

if (reducedMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -30px" },
  );

  revealItems.forEach((item) => observer.observe(item));
}
