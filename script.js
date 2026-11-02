(function(){
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav scroll state ---------- */
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function(){
      if (window.scrollY > 40) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', function(){
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      menu.classList.toggle('is-open', !open);
    });
    menu.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        menu.classList.remove('is-open');
      });
    });
  }

  /* ---------- Scroll cue (home hero only) ---------- */
  var cue = document.getElementById('scrollCue');
  if (cue) {
    cue.addEventListener('click', function(){
      var next = document.getElementById('introBridge') || document.querySelector('main > section:nth-of-type(2)');
      if (next) next.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ---------- Hero scroll-linked journey (home hero only) ----------
     Writes --hero-progress (0 → 1) onto the pin wrapper as the visitor
     scrolls through it. Every visual response (background wash, logo,
     Tamil line, mascot) reads this single value via CSS calc(), so
     there is one source of truth and one rAF-throttled listener —
     no scroll hijacking, native scrolling stays fully intact. */
  var heroPinWrap = document.getElementById('heroPinWrap');
  if (heroPinWrap && !reduceMotion) {
    var ticking = false;
    var updateHeroProgress = function(){
      var rect = heroPinWrap.getBoundingClientRect();
      var scrollable = heroPinWrap.offsetHeight - window.innerHeight;
      var progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;
      heroPinWrap.style.setProperty('--hero-progress', progress.toFixed(4));
      ticking = false;
    };
    var onHeroScroll = function(){
      if (!ticking) {
        window.requestAnimationFrame(updateHeroProgress);
        ticking = true;
      }
    };
    document.addEventListener('scroll', onHeroScroll, { passive: true });
    window.addEventListener('resize', onHeroScroll, { passive: true });
    updateHeroProgress();
  }

  /* ---------- Hero mascot: subtle pointer parallax (desktop, motion-safe) ---------- */
  var mascotWrap = document.getElementById('heroMascotParallax');
  if (mascotWrap && !reduceMotion && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
    var heroEl = document.getElementById('hero');
    var maxShift = 10;
    heroEl.addEventListener('mousemove', function(e){
      var rect = heroEl.getBoundingClientRect();
      var relX = (e.clientX - rect.left) / rect.width - 0.5;
      var relY = (e.clientY - rect.top) / rect.height - 0.5;
      mascotWrap.style.transform = 'translate(' + (relX * maxShift * -1).toFixed(2) + 'px,' + (relY * maxShift * -0.6).toFixed(2) + 'px)';
    });
    heroEl.addEventListener('mouseleave', function(){
      mascotWrap.style.transform = 'translate(0,0)';
    });
  }

  /* ---------- Ambient grain/light drift (whole document, all pages) ----------
     Writes --scroll-t (0→1 across full document height) onto <html>.
     CSS reads this to nudge two soft radial washes very slightly as the
     visitor scrolls — restrained, GPU-cheap (one custom property), and
     skipped entirely under reduced motion (the static CSS default already
     looks complete). */
  if (!reduceMotion) {
    var scrollTicking = false;
    var updateScrollT = function(){
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      var t = scrollable > 0 ? window.scrollY / scrollable : 0;
      if (t < 0) t = 0; if (t > 1) t = 1;
      doc.style.setProperty('--scroll-t', t.toFixed(4));
      scrollTicking = false;
    };
    document.addEventListener('scroll', function(){
      if (!scrollTicking) { window.requestAnimationFrame(updateScrollT); scrollTicking = true; }
    }, { passive: true });
    updateScrollT();
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(function(el){ io.observe(el); });
    } else {
      reveals.forEach(function(el){ el.classList.add('is-visible'); });
    }
  }

  /* ---------- YouTube facade (click-to-load, no autoplay-with-sound) ---------- */
  var facade = document.getElementById('videoFacade');
  if (facade) {
    var loadVideo = function(){
      var id = facade.getAttribute('data-video-id');
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.title = 'Soil Steps investor presentation video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      facade.innerHTML = '';
      facade.appendChild(iframe);
    };
    facade.addEventListener('click', loadVideo);
    facade.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadVideo(); }
    });
  }

  /* ---------- Journey Reels (official Instagram embeds) ----------
     Reusable component: any element on the page shaped like
       <div class="reel-embed" data-permalink="https://www.instagram.com/reel/...">
     is auto-discovered here — adding a new Reel later needs no JS
     changes, just another element with a permalink.

     Behaviour:
     - Lazy: nothing is requested from Instagram until a card is
       about to enter the viewport (IntersectionObserver).
     - Uses Instagram's own oEmbed blockquote + platform script
       (loaded once, on demand) — this is Instagram's official
       embed method, not a custom player.
     - No autoplay-with-sound: Instagram's embedded player requires
       a tap to play, same as visiting the Reel directly.
     - If the platform script fails to load, or a given Reel never
       finishes rendering within a few seconds (blocked, deleted,
       offline, etc.), the card falls back to its visible "Watch on
       Instagram" link rather than showing a broken or fake player. */
  var reelEmbeds = document.querySelectorAll('.reel-embed[data-permalink]');
  if (reelEmbeds.length) {
    var IG_SCRIPT_SRC = 'https://www.instagram.com/embed.js';
    var igScriptState = 'idle'; // idle | loading | ready | failed

    var markCard = function(embedEl, state){
      var card = embedEl.closest('.reel-card');
      if (!card) return;
      card.classList.remove('is-loaded', 'is-failed');
      if (state) card.classList.add(state);
    };

    var renderBlockquote = function(embedEl){
      var permalink = embedEl.getAttribute('data-permalink');
      var bq = document.createElement('blockquote');
      bq.className = 'instagram-media';
      bq.setAttribute('data-instgrm-permalink', permalink);
      bq.setAttribute('data-instgrm-version', '14');
      embedEl.appendChild(bq);

      // Instagram's script turns the blockquote into an iframe. If
      // that hasn't happened after a few seconds, treat it as a
      // failed load and reveal the plain-link fallback instead.
      var settled = false;
      var timeout = window.setTimeout(function(){
        if (settled) return;
        settled = true;
        markCard(embedEl, 'is-failed');
      }, 7000);

      var mo = new MutationObserver(function(){
        if (embedEl.querySelector('iframe')) {
          settled = true;
          window.clearTimeout(timeout);
          markCard(embedEl, 'is-loaded');
          mo.disconnect();
        }
      });
      mo.observe(embedEl, { childList: true, subtree: true });
    };

    var pendingEmbeds = [];

    var processAll = function(){
      if (window.instgrm && window.instgrm.Embeds && window.instgrm.Embeds.process) {
        window.instgrm.Embeds.process();
      }
    };

    var loadInstagramScript = function(){
      if (igScriptState === 'loading' || igScriptState === 'ready') return;
      igScriptState = 'loading';
      var s = document.createElement('script');
      s.async = true;
      s.src = IG_SCRIPT_SRC;
      s.onload = function(){
        igScriptState = 'ready';
        processAll();
      };
      s.onerror = function(){
        igScriptState = 'failed';
        pendingEmbeds.forEach(function(el){ markCard(el, 'is-failed'); });
      };
      document.body.appendChild(s);
    };

    var activate = function(embedEl){
      if (embedEl.hasAttribute('data-activated')) return;
      embedEl.setAttribute('data-activated', 'true');
      pendingEmbeds.push(embedEl);
      renderBlockquote(embedEl);
      if (igScriptState === 'ready') {
        processAll();
      } else if (igScriptState === 'failed') {
        markCard(embedEl, 'is-failed');
      } else {
        loadInstagramScript();
      }
    };

    if ('IntersectionObserver' in window) {
      var reelIo = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            activate(entry.target);
            reelIo.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px 0px' });
      reelEmbeds.forEach(function(el){ reelIo.observe(el); });
    } else {
      reelEmbeds.forEach(activate);
    }
  }

  /* ---------- Gallery lightbox ----------
     Two content types share one overlay:
     - Text placeholders (Community page today): [data-caption] only.
     - Real images (Founder page): [data-full][data-title][data-meta],
       grouped by [data-group] so Next/Prev + arrow keys move within
       the same collection. Click-to-enlarge, keyboard accessible,
       clear close control, no autoplay — per the brief. */
  var lightbox = document.getElementById('lightbox');
  var lightboxContent = document.getElementById('lightboxContent');
  var lightboxClose = document.getElementById('lightboxClose');
  if (lightbox && lightboxContent && lightboxClose) {
    var currentGroup = [];
    var currentIndex = -1;

    function renderImage(el){
      var full = el.getAttribute('data-full');
      var title = el.getAttribute('data-title') || '';
      var meta = el.getAttribute('data-meta') || '';
      lightboxContent.className = 'lightbox-content has-image';
      lightboxContent.innerHTML =
        '<div class="lightbox-image-wrap">' +
          (currentGroup.length > 1 ? '<button type="button" class="lightbox-nav lightbox-nav--prev" aria-label="Previous image">&#8249;</button>' : '') +
          '<img src="' + full + '" alt="' + title.replace(/"/g,'&quot;') + '">' +
          (currentGroup.length > 1 ? '<button type="button" class="lightbox-nav lightbox-nav--next" aria-label="Next image">&#8250;</button>' : '') +
        '</div>' +
        (title || meta ? '<div class="lightbox-caption">' +
          (title ? '<span class="lb-title">' + title + '</span>' : '') +
          (meta ? '<span class="lb-meta">' + meta + '</span>' : '') +
        '</div>' : '');
      var prev = lightboxContent.querySelector('.lightbox-nav--prev');
      var next = lightboxContent.querySelector('.lightbox-nav--next');
      if (prev) prev.addEventListener('click', function(e){ e.stopPropagation(); step(-1); });
      if (next) next.addEventListener('click', function(e){ e.stopPropagation(); step(1); });
    }

    function step(dir){
      if (!currentGroup.length) return;
      currentIndex = (currentIndex + dir + currentGroup.length) % currentGroup.length;
      renderImage(currentGroup[currentIndex]);
    }

    function openImageLightbox(el){
      var groupName = el.getAttribute('data-group');
      currentGroup = groupName
        ? Array.prototype.filter.call(document.querySelectorAll('[data-group="' + groupName + '"]'), function(n){ return n.hasAttribute('data-full'); })
        : [el];
      currentIndex = currentGroup.indexOf(el);
      renderImage(el);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      lightboxClose.focus();
    }

    function openTextLightbox(caption){
      lightboxContent.className = 'lightbox-content';
      lightboxContent.textContent = caption;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      lightboxClose.focus();
    }

    function closeLightbox(){
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxContent.innerHTML = '';
      currentGroup = []; currentIndex = -1;
    }

    /* Delegated (not bound per-element) so gallery items rendered later
       from MEDIA_GALLERIES / TEAM data below still open the lightbox. */
    document.addEventListener('click', function(e){
      var btn = e.target.closest ? e.target.closest('.gallery-item, [data-lightbox]') : null;
      if (!btn) return;
      if (btn.hasAttribute('data-full')) openImageLightbox(btn);
      else openTextLightbox(btn.getAttribute('data-caption') || 'Media placeholder');
    });
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function(e){ if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', function(e){
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
  }

  /* ---------- Team data (single editable source; team page only) ----------
     A member with a photo gets its real width/height here, so the card
     uses that photo's own aspect ratio instead of a fixed template. A
     member with no photo yet just omits photo/w/h and falls back to the
     placeholder box. */
  var teamGrid = document.getElementById('teamGrid');
  if (teamGrid) {
    var TEAM = [
      { name: 'Thiru. Siddeshwar.B', role: '', photo: 'assets/team/siddesh-coo.jpg', w: 482, h: 653 },
      { name: 'Thiru. Sanjay.R', role: '', photo: 'assets/team/sanjai-cto.jpg', w: 477, h: 656 },
      { name: 'Thiru. Vignesh senguttuvan', role: '', photo: 'assets/team/vicky-team.jpg', w: 1086, h: 1448 }
    ];
    TEAM.forEach(function(member){
      var card = document.createElement('div');
      card.className = 'team-card';
      var photoHtml;
      if (member.photo) {
        photoHtml = '<div class="team-photo" style="aspect-ratio:' + member.w + '/' + member.h + '">' +
          '<img src="' + member.photo + '" alt="' + member.name + ', ' + member.role.split('·')[0].trim() + '" loading="lazy">' +
        '</div>';
      } else {
        photoHtml = '<div class="team-photo is-placeholder"><span>Photo — to be added</span></div>';
      }
      card.innerHTML = photoHtml +
        '<div class="team-name">' + member.name + '</div>' +
        '<div class="team-role">' + member.role + '</div>';
      teamGrid.appendChild(card);
    });
  }


  /* ---------- Department team profiles ---------- */
  var DEPARTMENT_TEAMS = [
    {
      grid: 'communityTeamGrid',
      members: [
        { name: 'SRI DHARSHINI R', role: 'Community', photo: 'assets/team/sri-dharshini-r.jpg', position: 'center 34%' },
        { name: 'SIVA SRUTHY VGP', role: 'Community', photo: 'assets/team/siva-sruthy-vgp.jpg', position: 'center 30%' },
        { name: 'Alwin Joseph', role: 'Community', photo: 'assets/team/alwin-joseph.jpg', position: 'center 22%' }
      ]
    },
    {
      grid: 'technicalTeamGrid',
      members: [
        { name: 'MITHRAN M', role: 'Technical', photo: 'assets/team/mithran-m.jpg', position: 'center 24%' }
      ]
    },
    {
      grid: 'fundingTeamGrid',
      members: [
        { name: 'DEEPAK ROHITH M R', role: 'Funding & Operations', photo: 'assets/team/deepak-rohith-mr.jpg', position: 'center 22%' },
        { name: 'ASWIN V K', role: 'Funding & Operations', initials: 'AVK' }
      ]
    }
  ];

  DEPARTMENT_TEAMS.forEach(function(department) {
    var grid = document.getElementById(department.grid);
    if (!grid) return;
    department.members.forEach(function(member) {
      var card = document.createElement('article');
      card.className = 'team-card department-card';
      var photoHtml = member.photo
        ? '<div class="team-photo department-photo"><img src="' + member.photo +
          '" alt="' + member.name + '" loading="lazy" style="object-position:' +
          (member.position || 'center') + '"></div>'
        : '<div class="team-photo department-photo department-monogram" aria-label="' +
          member.name + '"><span>' + member.initials + '</span><small>SOIL STEPS</small></div>';
      card.innerHTML = photoHtml +
        '<div class="department-card-meta"><div class="team-name">' + member.name +
        '</div><div class="team-role">' + member.role + '</div></div>';
      grid.appendChild(card);
    });
  });

  /* ---------- Photo galleries (Community + Farmers Meet) ----------
     Single editable data source, same pattern as TEAM/REELS above.
     Each item keeps the photo's true pixel width/height as its
     aspect-ratio, so nothing gets stretched or force-cropped to a
     template. To add a future photo or video: add an entry with its
     own w/h and a role ('feature'/'col'/'end' for the community
     layout, 'wide'/'row' for the farmers layout) — no CSS or markup
     redesign needed. */
  var MEDIA_GALLERIES = {
    communityGallery: {
      layout: 'feature-cols-end',
      items: [
        { role: 'feature', src: 'assets/community/community-intro-poster.jpg', w: 602, h: 745,
          alt: 'Poster introducing the Soil Steps Community, with a QR code to join, over a photo of the group standing together in a field',
          title: 'Introducing Soil Steps Community', meta: 'Scan to join' },
        { role: 'col', src: 'assets/community/meetup-1-poster.jpg', w: 567, h: 746,
          alt: 'Invitation poster for Soil Steps Community Meet-Up 1',
          title: 'Community Meet-Up 1', meta: '13 Sept · Gandhi Mandapam, Guindy' },
        { role: 'col', src: 'assets/community/community-online-meeting.jpg', w: 420, h: 673,
          alt: 'A Soil Steps Community video call, screen full of participants',
          title: 'A Soil Steps Community call', meta: '' },
        { role: 'end', src: 'assets/community/community-group-outdoor.jpg', w: 355, h: 549,
          alt: 'Community members gathered outdoors under a tree',
          title: 'Meeting up, in person', meta: '' }
      ]
    },
    farmersGallery: {
      layout: 'wide-row',
      items: [
        { role: 'wide', src: 'assets/farmers/farmers-meet-group.jpg', w: 882, h: 655,
          alt: 'The Soil Steps team with a group of farmers, standing together outdoors',
          title: 'Meeting the farmers', meta: '' },
        { role: 'row', src: 'assets/farmers/farmers-seated.jpg', w: 425, h: 679,
          alt: 'Farmers seated together under a shelter, in conversation',
          title: 'Listening to the farmers', meta: '' },
        { role: 'row', src: 'assets/farmers/farmer-gathering.jpg', w: 424, h: 673,
          alt: 'A farmer gathering under a decorated shelter',
          title: 'A farmer gathering', meta: '' }
      ]
    }
  };

  function buildGalleryItem(item, groupName){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gallery-item';
    btn.style.aspectRatio = item.w + '/' + item.h;
    btn.setAttribute('data-lightbox', '');
    btn.setAttribute('data-group', groupName);
    btn.setAttribute('data-full', item.src);
    btn.setAttribute('data-title', item.title || '');
    btn.setAttribute('data-meta', item.meta || '');
    var img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt || '';
    img.loading = 'lazy';
    btn.appendChild(img);
    return btn;
  }

  Object.keys(MEDIA_GALLERIES).forEach(function(containerId){
    var container = document.getElementById(containerId);
    if (!container) return;
    var config = MEDIA_GALLERIES[containerId];

    if (config.layout === 'feature-cols-end') {
      var feature = config.items.filter(function(i){ return i.role === 'feature'; })[0];
      var cols = config.items.filter(function(i){ return i.role === 'col'; });
      var end = config.items.filter(function(i){ return i.role === 'end'; })[0];
      if (feature) container.appendChild(buildGalleryItem(feature, containerId));
      if (cols.length) {
        var colWrap = document.createElement('div');
        colWrap.className = 'gallery-col';
        cols.forEach(function(i){ colWrap.appendChild(buildGalleryItem(i, containerId)); });
        container.appendChild(colWrap);
      }
      if (end) container.appendChild(buildGalleryItem(end, containerId));
    } else if (config.layout === 'wide-row') {
      var wide = config.items.filter(function(i){ return i.role === 'wide'; })[0];
      var rowItems = config.items.filter(function(i){ return i.role === 'row'; });
      if (wide) container.appendChild(buildGalleryItem(wide, containerId));
      if (rowItems.length) {
        var rowWrap = document.createElement('div');
        rowWrap.className = 'gallery-row';
        rowItems.forEach(function(i){ rowWrap.appendChild(buildGalleryItem(i, containerId)); });
        container.appendChild(rowWrap);
      }
    }
  });

  /* ---------- Instagram Reel galleries (Community + Farmers Meet) ----------
     Single editable data source — add a new reel here and it will render
     automatically wherever its container id appears on the page. Uses
     Instagram's official oEmbed blockquote format plus Instagram's own
     embed.js (loaded once, on demand). If the embed script is blocked or
     never finishes loading — ad blockers, offline testing, network
     restrictions — each card falls back to a real, working link to the
     original Reel rather than a fake player. */
  var REELS = {
    communityReels: [
      { url: 'https://www.instagram.com/reel/DbLOMuihMYr/', label: 'Community Reel 01' },
      { url: 'https://www.instagram.com/reel/DaA7CK_tbGi/', label: 'Community Reel 02' }
    ],
    farmersReel: [
      { url: 'https://www.instagram.com/reel/DcdwMcTvUev/', label: 'Farmers Meet Reel' }
    ]
  };

  function buildReelCard(item){
    var card = document.createElement('div');
    card.className = 'reel-card';

    var wrap = document.createElement('div');
    wrap.className = 'reel-embed-wrap';

    var loading = document.createElement('div');
    loading.className = 'reel-loading';
    loading.setAttribute('aria-hidden', 'true');
    loading.innerHTML = '<span class="reel-loading-spinner"></span><span class="reel-loading-text">Loading reel…</span>';
    wrap.appendChild(loading);

    var blockquote = document.createElement('blockquote');
    blockquote.className = 'instagram-media';
    blockquote.setAttribute('data-instgrm-permalink', item.url);
    blockquote.setAttribute('data-instgrm-version', '14');
    blockquote.setAttribute('style', 'margin:0;width:100%;');
    wrap.appendChild(blockquote);

    var fallback = document.createElement('div');
    fallback.className = 'reel-fallback';
    fallback.hidden = true;
    fallback.innerHTML =
      '<svg class="reel-fallback-icon" viewBox="0 0 24 24" aria-hidden="true">' +
        '<rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="var(--clay)" stroke-width="1.6"/>' +
        '<circle cx="12" cy="12" r="5" stroke="var(--clay)" stroke-width="1.6" fill="none"/>' +
        '<circle cx="17.4" cy="6.6" r="1.15" fill="var(--clay)"/>' +
      '</svg>' +
      '<p>This reel opens directly on Instagram.</p>' +
      '<a class="btn-outline" href="' + item.url + '" target="_blank" rel="noopener noreferrer">Watch on Instagram &rarr;</a>';

    card.appendChild(wrap);
    card.appendChild(fallback);

    if (item.label) {
      var caption = document.createElement('span');
      caption.className = 'reel-caption';
      caption.textContent = item.label;
      card.appendChild(caption);
    }

    watchReelEmbed(wrap, fallback);
    return card;
  }

  /* Watches a single reel card for Instagram's embed.js to finish
     replacing the blockquote with its iframe. If that hasn't happened
     within a reasonable window, reveals the fallback link instead —
     this is a real check, not a guess, so the fallback only ever shows
     when the embed genuinely didn't render. */
  function watchReelEmbed(wrap, fallback){
    var settled = false;
    var mo = new MutationObserver(function(){
      if (wrap.querySelector('iframe')) {
        settled = true;
        wrap.classList.add('is-ready');
        mo.disconnect();
      }
    });
    mo.observe(wrap, { childList: true, subtree: true });
    window.setTimeout(function(){
      if (!settled) {
        mo.disconnect();
        wrap.hidden = true;
        fallback.hidden = false;
      }
    }, 9000);
  }

  function loadInstagramEmbedScript(callback){
    if (window.instgrm && window.instgrm.Embeds) { callback(); return; }
    var existing = document.getElementById('ig-embed-script');
    if (existing) { existing.addEventListener('load', callback); return; }
    var s = document.createElement('script');
    s.id = 'ig-embed-script';
    s.async = true;
    s.src = 'https://www.instagram.com/embed.js';
    s.addEventListener('load', callback);
    document.body.appendChild(s);
  }

  Object.keys(REELS).forEach(function(containerId){
    var container = document.getElementById(containerId);
    var items = REELS[containerId];
    if (!container || !items || !items.length) return;
    items.forEach(function(item){ container.appendChild(buildReelCard(item)); });
    loadInstagramEmbedScript(function(){
      if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
    });
  });

  /* ---------- Footer year (every page) ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  /* =========================================================
     PREMIUM EXPERIENCE LAYER
  ========================================================= */

  // Progress rail + "back to top" control.
  var progress = document.createElement('div');
  progress.className = 'site-progress';
  progress.innerHTML = '<span></span>';
  document.body.appendChild(progress);
  var progressBar = progress.firstElementChild;

  var backTop = document.createElement('button');
  backTop.type = 'button';
  backTop.className = 'back-top';
  backTop.setAttribute('aria-label', 'Back to top');
  backTop.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.appendChild(backTop);

  var progressTick = false;
  function updatePremiumScroll(){
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var t = Math.max(0, Math.min(1, window.scrollY / max));
    progressBar.style.transform = 'scaleX(' + t.toFixed(4) + ')';
    backTop.classList.toggle('is-visible', window.scrollY > Math.max(500, window.innerHeight * .75));
    progressTick = false;
  }
  document.addEventListener('scroll', function(){
    if (!progressTick) {
      requestAnimationFrame(updatePremiumScroll);
      progressTick = true;
    }
  }, {passive:true});
  window.addEventListener('resize', updatePremiumScroll, {passive:true});
  updatePremiumScroll();

  backTop.addEventListener('click', function(){
    window.scrollTo({top:0, behavior: reduceMotion ? 'auto' : 'smooth'});
  });

  // Keyboard-accessible skip link.
  if (!document.querySelector('.skip-link')) {
    var skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#top';
    skip.textContent = 'Skip to content';
    document.body.prepend(skip);
  }
  if (!document.getElementById('top')) {
    var main = document.querySelector('main');
    if (main) main.id = 'top';
  }

  // Elegant page entrance/exit — internal navigation only.
  var transition = document.createElement('div');
  transition.className = 'page-transition';
  transition.setAttribute('aria-hidden','true');
  document.body.appendChild(transition);

  window.requestAnimationFrame(function(){
    transition.classList.add('is-entering');
    window.setTimeout(function(){ transition.classList.remove('is-entering'); }, 550);
  });

  document.querySelectorAll('a[href]').forEach(function(link){
    var href = link.getAttribute('href');
    if (!href || href.charAt(0)==='#' || href.indexOf('mailto:')===0 || href.indexOf('tel:')===0) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    var url;
    try { url = new URL(href, window.location.href); } catch(e){ return; }
    if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.search === window.location.search) return;
    link.addEventListener('click', function(e){
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      transition.classList.remove('is-entering');
      transition.classList.add('is-leaving');
      window.setTimeout(function(){ window.location.href = url.href; }, 280);
    });
  });

  // Subtle cursor personality on desktop — never used on touch.
  if (!reduceMotion && window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
    var cursor = document.createElement('div');
    var cursorRing = document.createElement('div');
    cursor.className = 'premium-cursor';
    cursorRing.className = 'premium-cursor-ring';
    document.body.appendChild(cursor);
    document.body.appendChild(cursorRing);

    var cx = 0, cy = 0, tx = 0, ty = 0, cursorFrame = false;
    function drawCursor(){
      cx += (tx-cx)*.28;
      cy += (ty-cy)*.28;
      cursor.style.left = tx + 'px'; cursor.style.top = ty + 'px';
      cursorRing.style.left = cx + 'px'; cursorRing.style.top = cy + 'px';
      cursorFrame = false;
    }
    document.addEventListener('pointermove', function(e){
      tx=e.clientX; ty=e.clientY;
      cursor.classList.add('is-active'); cursorRing.classList.add('is-active');
      if (!cursorFrame) { requestAnimationFrame(function(){drawCursor();}); cursorFrame=true; }
    }, {passive:true});
    document.addEventListener('pointerleave', function(){
      cursor.classList.remove('is-active'); cursorRing.classList.remove('is-active');
    });
    document.querySelectorAll('a,button,.gallery-item,.team-card,.supporter-card').forEach(function(el){
      el.addEventListener('mouseenter', function(){cursorRing.classList.add('is-hover')});
      el.addEventListener('mouseleave', function(){cursorRing.classList.remove('is-hover')});
    });
  }

  // Tactile tilt on selected content cards. Kept deliberately shallow.
  if (!reduceMotion && window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
    var tiltItems = document.querySelectorAll('.mission-block,.supporter-card,.team-card,.reel-card,.cert-card');
    tiltItems.forEach(function(card){
      card.addEventListener('pointermove', function(e){
        var r=card.getBoundingClientRect();
        var x=(e.clientX-r.left)/r.width-.5;
        var y=(e.clientY-r.top)/r.height-.5;
        card.style.setProperty('--mx', ((x+.5)*100).toFixed(1)+'%');
        card.style.setProperty('--my', ((y+.5)*100).toFixed(1)+'%');
        card.style.transform='perspective(900px) rotateX('+(-y*2.2).toFixed(2)+'deg) rotateY('+(x*2.2).toFixed(2)+'deg) translateY(-3px)';
      });
      card.addEventListener('pointerleave', function(){
        card.style.transform='';
      });
    });
  }

  // Stagger nearby reveal items without changing document structure.
  document.querySelectorAll('.reveal').forEach(function(el, i){
    var parent = el.parentElement;
    if (!parent) return;
    var siblings = Array.prototype.filter.call(parent.children, function(n){ return n.classList && n.classList.contains('reveal'); });
    var index = siblings.indexOf(el);
    if (index > -1) el.style.setProperty('--reveal-delay', Math.min(index*75, 375) + 'ms');
  });

  // Keep lazy images inexpensive; preserve eager loading for the first viewport.
  var allImgs = document.querySelectorAll('img');
  allImgs.forEach(function(img, i){
    if (i > 3 && !img.hasAttribute('loading')) img.setAttribute('loading','lazy');
    img.setAttribute('decoding','async');
  });

  // Soft pointer parallax for premium decorative elements.
  if (!reduceMotion && window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.page-hero,.intro-bridge,.limits-section').forEach(function(section){
      section.addEventListener('pointermove', function(e){
        var r=section.getBoundingClientRect();
        var x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        section.style.setProperty('--px',(x*8).toFixed(2)+'px');
        section.style.setProperty('--py',(y*8).toFixed(2)+'px');
      });
    });
  }


  /* ---------- Cinematic intro ----------
     Shown once per browser session; ?intro=1 forces it for previews.
     Click, wheel, touch or Enter can dismiss it immediately.
  */
  var cinematicIntro = document.getElementById('cinematicIntro');
  if (cinematicIntro) {
    var forceIntro = new URLSearchParams(window.location.search).get('intro') === '1';
    var introSeen = false;
    try { introSeen = sessionStorage.getItem('soilsteps-intro-seen') === '1'; } catch(e) {}

    if (!reduceMotion && (forceIntro || !introSeen)) {
      document.body.classList.add('intro-active');
      var introClosed = false;
      var closeIntro = function(){
        if (introClosed) return;
        introClosed = true;
        try { sessionStorage.setItem('soilsteps-intro-seen','1'); } catch(e) {}
        cinematicIntro.classList.add('is-leaving');
        document.body.classList.remove('intro-active');
        window.setTimeout(function(){
          if (cinematicIntro && cinematicIntro.parentNode) cinematicIntro.parentNode.removeChild(cinematicIntro);
        }, 1050);
      };
      var introTimer = window.setTimeout(closeIntro, 3450);
      var skipBtn = document.getElementById('cinematicSkip');
      if (skipBtn) skipBtn.addEventListener('click', function(){
        window.clearTimeout(introTimer); closeIntro();
      });
      var introWheel = function(e){
        if (Math.abs(e.deltaY) > 2) {
          window.clearTimeout(introTimer); closeIntro();
          window.removeEventListener('wheel', introWheel);
        }
      };
      window.addEventListener('wheel', introWheel, {passive:true});
      window.addEventListener('touchstart', function(){
        window.clearTimeout(introTimer); closeIntro();
      }, {once:true, passive:true});
      window.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
          window.clearTimeout(introTimer); closeIntro();
        }
      }, {once:true});
    } else {
      cinematicIntro.remove();
    }
  }

})();
