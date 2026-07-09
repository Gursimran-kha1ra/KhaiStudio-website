/* ═══════════════════════════════════════════════════════════════════════
   KHAI STUDIO — app.js   (single JavaScript entry point)
   ───────────────────────────────────────────────────────────────────────
   Consolidates what used to be duplicated across every page:
     • the vendor <script> stack (loaded here, in order)
     • the header/footer partial loader
     • init.js (sliders, menu, sticky nav, faq, scroll-up, fitvids)
     • the portfolio masonry / filters / lightbox / reveal
     • the contact package-preselect + form submission
   Each page now only needs:  <script src="js/app.js"></script>
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* Vendor libraries — order matters (jQuery first, then its plugins). */
  var VENDORS = [
    "js/jquery.js",
    "js/jquery-migrate.min.js",
    "css/bootstrap/js/popper.js",
    "css/bootstrap/js/bootstrap.js",
    "js/easing.js",
    "js/fitvids.js",
    "js/owl-carousel/owl.carousel.js",
    "js/isotope.js",
    "js/simple-lightbox.js"
  ];

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = false;         // preserve execution order
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }
  function loadSequential(list) {
    return list.reduce(function (p, src) {
      return p.then(function () { return loadScript(src); });
    }, Promise.resolve());
  }
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  function injectPartial(url, elId) {
    var el = document.getElementById(elId);
    if (!el) return Promise.resolve();
    return fetch(url).then(function (r) { return r.text(); })
                     .then(function (html) { el.innerHTML = html; });
  }

  /* ── Boot sequence ──────────────────────────────────────────────────── */
  ready(function () {
    loadSequential(VENDORS)
      .then(function () {
        return Promise.all([
          injectPartial("partials/header.html", "header"),
          injectPartial("partials/footer.html", "footer")
        ]);
      })
      .then(initApp)
      .catch(function (err) { console.error("[Khai Studio]", err); });
  });

  function initApp() {
    var $ = window.jQuery;
    if ($) initFramework($);
    initPortfolio();
    initContact();
    initReveal();
  }

  /* ═══ Framework behaviours (ported from init.js) ═════════════════════ */
  function initFramework($) {
    if ($.fn.owlCarousel) {
      $(".home-slider").owlCarousel({ items: 1, loop: true, autoplay: true, autoplayTimeout: 7000, autoplayHoverPause: true, animateOut: "fadeOut", dots: false, nav: true, navText: "" });
      $(".portfolio-slider-4items").owlCarousel({ loop: true, autoplay: true, autoplayTimeout: 6000, margin: 30, dots: false, nav: true, navText: "", responsive: { 0: { items: 1 }, 568: { items: 2 }, 1024: { items: 3 } } });
      $(".testimonial-slider").owlCarousel({ items: 1, loop: true, autoHeight: true, autoplay: true, autoplayTimeout: 8000, animateOut: "fadeOut" });
    }

    /* mobile menu */
    $(".nav-button").on("click", function (e) { e.preventDefault(); $(".mobile-menu-holder, .menu-mask").addClass("is-active"); $("body").addClass("has-active-menu"); });
    $(".exit-mobile, .menu-mask").on("click", function (e) { e.preventDefault(); $(".mobile-menu-holder, .menu-mask").removeClass("is-active"); $("body").removeClass("has-active-menu"); });
    $(".menu-mobile > li.menu-item-has-children > a").on("click", function (e) { e.preventDefault(); e.stopPropagation(); $(this).parent().toggleClass("menu-open"); });

    /* submenu edge detection */
    $(".menu-nav li").on("mouseenter mouseleave", function () {
      if ($("ul", this).length) {
        var elm = $(".sub-menu", this), off = elm.offset();
        var l = off ? off.left : 0, w = elm.width(), docW = $(window).width();
        if (l + w > docW) $(this).addClass("edge"); else $(this).removeClass("edge");
      }
    });

    /* legacy isotope (any page still using the old classes) */
    var blog = $(".layout-masonry");
    if (blog.length && $.fn.isotope) blog.isotope({ itemSelector: ".blog-item-masonry", layoutMode: "masonry" });
    if ($(".portfolio-filter a").length) {
      $(".portfolio-filter a").on("click", function () {
        $(".portfolio-filter .current").removeClass("current");
        $(this).addClass("current");
        if (blog.length) blog.isotope({ filter: $(this).attr("data-filter") });
        return false;
      });
    }

    /* sticky header */
    $(window).on("scroll", function () {
      if ($(document).scrollTop() > 1) $(".main-header").addClass("nav-fixed-top");
      else $(".main-header").removeClass("nav-fixed-top");
    });

    /* legacy gallery lightbox */
    if ($.fn.simpleLightbox) $(".gallery-post a").simpleLightbox({ heightRatio: 1, widthRatio: 0.8 });

    /* faq accordion */
    $(".faq-section").hide();
    $(".faq-title").on("click", function () {
      if ($(this).next().is(":hidden")) $(this).toggleClass("active").next().slideDown();
      else $(this).removeClass("active").next().slideUp();
      return false;
    });

    /* fluid videos */
    if ($.fn.fitVids) $(".single-post-content, .custom-page-template, .post-video").fitVids();

    /* scroll-up */
    $(".scrollup").hide();
    $(window).on("scroll", function () {
      if ($(this).scrollTop() > 400) $(".scrollup").fadeIn(); else $(".scrollup").fadeOut();
    });
    $("a.scrolltop[href^='#']").on("click", function (e) {
      e.preventDefault();
      $("html, body").stop().animate({ scrollTop: 0 }, 1000, "easeOutExpo");
    });
  }

  /* ═══ Portfolio — CSS-columns masonry, paginated slides + lightbox ═══ */
  var PF_PAGE_SIZE = 24;
  function initPortfolio() {
    var grid = document.querySelector(".pf-grid");
    if (!grid) return;

    var items = Array.prototype.slice.call(grid.querySelectorAll(".pf-item"));
    var prevBtn = document.querySelector(".pf-nav__prev");
    var nextBtn = document.querySelector(".pf-nav__next");
    var indicator = document.querySelector(".pf-nav__indicator");
    var filter = "*", page = 0;

    function matches(el) { return filter === "*" || el.classList.contains(filter.slice(1)); }
    function filtered() { return items.filter(matches); }
    function pageCount() { return Math.max(1, Math.ceil(filtered().length / PF_PAGE_SIZE)); }

    function render() {
      var list = filtered(), total = pageCount();
      if (page >= total) page = total - 1;
      if (page < 0) page = 0;
      var start = page * PF_PAGE_SIZE, end = start + PF_PAGE_SIZE;
      items.forEach(function (el) { el.style.display = "none"; el.classList.remove("is-in"); });
      list.slice(start, end).forEach(function (el, i) {
        el.style.display = "";
        setTimeout(function () { el.classList.add("is-in"); }, i * 35);
      });
      if (indicator) indicator.textContent = (page + 1) + " / " + total;
      if (prevBtn) prevBtn.disabled = (page === 0);
      if (nextBtn) nextBtn.disabled = (page >= total - 1);
    }

    function scrollToGrid() {
      var top = grid.getBoundingClientRect().top + window.pageYOffset - 110;
      window.scrollTo({ top: top, behavior: "smooth" });
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { if (page > 0) { page--; render(); scrollToGrid(); } });
    if (nextBtn) nextBtn.addEventListener("click", function () { if (page < pageCount() - 1) { page++; render(); scrollToGrid(); } });

    document.querySelectorAll(".pf-filter button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".pf-filter button").forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        filter = btn.getAttribute("data-filter"); page = 0; render();
      });
    });

    render();

    /* lightbox — all photos are navigable in the popup */
    var $ = window.jQuery;
    if ($ && $.fn.simpleLightbox) {
      $(".pf-grid a").simpleLightbox({ heightRatio: 0.9, widthRatio: 0.9, animationSpeed: 220 });
    }
  }

  /* ═══ Scroll reveal (portfolio items + .reveal-up) ═══════════════════ */
  function initReveal() {
    var els = document.querySelectorAll(".reveal-up");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ═══ Contact page (package preselect + progressive submit) ══════════ */
  function initContact() {
    var params = new URLSearchParams(window.location.search);
    var pkg = params.get("package");
    var select = document.getElementById("package-select");
    if (pkg && select) {
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === pkg) { select.selectedIndex = i; break; }
      }
    }

    var form = document.getElementById("contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      var name = form.name && form.name.value.trim();
      var email = form.email && form.email.value.trim();
      var msg = form.message && form.message.value.trim();
      var validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      /* let native HTML5 validation handle empties/format */
      if (!name || !email || !validEmail.test(email) || !msg) return;

      e.preventDefault();
      var btn = form.querySelector("#submit");
      var original = btn ? btn.value : "";
      if (btn) { btn.value = "Sending…"; btn.disabled = true; }

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      }).then(function (r) {
        if (r.ok) {
          var s = document.getElementById("form-success");
          if (s) { s.style.display = "block"; s.scrollIntoView({ behavior: "smooth", block: "center" }); }
          form.reset();
        } else {
          alert("Something went wrong. Please email info@khaistudio.ca.");
        }
      }).catch(function () {
        alert("Network error. Please email info@khaistudio.ca.");
      }).then(function () {
        if (btn) { btn.value = original; btn.disabled = false; }
      });
    });
  }

})();
