/* Modal */
    (function(){
      var modal = document.getElementById('authModal');
      var closeModal = document.getElementById('closeModal');
      var openBtns = [document.getElementById('openLogin3'), document.getElementById('openLogin4')].filter(Boolean);

      function lockScroll(){ document.body.style.overflow = 'hidden'; }
      function unlockScroll(){ document.body.style.overflow = ''; }

      function showModal(){
        if(!modal) return;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden','false');
        lockScroll();
      }
      function hideModal(){
        if(!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden','true');
        unlockScroll();
      }

      openBtns.forEach(function(b){ b.addEventListener('click', function(e){ e.preventDefault(); showModal(); }); });
      if(closeModal) closeModal.addEventListener('click', hideModal);
      if(modal){
        modal.addEventListener('click', function(e){ if(e.target === modal) hideModal(); });
        document.addEventListener('keydown', function(e){ if(e.key === 'Escape') hideModal(); });
      }
    })();

    /* Accordion: suave + apenas 1 aberto */
    (function(){
      var accordionEls = Array.prototype.slice.call(document.querySelectorAll('.accordions details'));
      function collapseDetails(details){
        var summary = details.querySelector('summary');
        var content = details.querySelector('.content');
        if (!summary || !content) return;
        var startHeight = details.offsetHeight;
        var endHeight = summary.offsetHeight;
        details.style.overflow = 'hidden';
        var anim = details.animate([{ height: startHeight + 'px' }, { height: endHeight + 'px' }],
          { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
        anim.onfinish = function(){
          details.open = false;
          details.style.height = '';
          details.style.overflow = '';
        };
      }
      function expandDetails(details){
        var summary = details.querySelector('summary');
        var content = details.querySelector('.content');
        if (!summary || !content) return;
        for (var k=0;k<accordionEls.length;k++){
          var o = accordionEls[k];
          if (o !== details && o.open) collapseDetails(o);
        }
        var startHeight = details.offsetHeight;
        details.open = true;
        requestAnimationFrame(function(){
          var endHeight = summary.offsetHeight + content.scrollHeight;
          details.style.overflow = 'hidden';
          var anim = details.animate([{ height: startHeight + 'px' }, { height: endHeight + 'px' }],
            { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
          anim.onfinish = function(){
            details.style.height = '';
            details.style.overflow = '';
          };
        });
      }
      for (var j=0;j<accordionEls.length;j++){
        (function(d){
          var summary = d.querySelector('summary');
          if (!summary) return;
          summary.addEventListener('click', function(e){
            e.preventDefault();
            if (d.open) collapseDetails(d);
            else expandDetails(d);
          });
        })(accordionEls[j]);
      }
    })();

    /* Reveal */
    (function(){
      var revealEls = document.querySelectorAll('.reveal');
      if ('IntersectionObserver' in window){
        var io = new IntersectionObserver(function(entries, obs){
          entries.forEach(function(entry){
            if(entry.isIntersecting){
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        }, { root:null, threshold:0.02, rootMargin:'0px 0px -22% 0px' });
        revealEls.forEach(function(el){ io.observe(el); });
      } else {
        revealEls.forEach(function(el){ el.classList.add('is-visible'); });
      }
    })();

    /* Offset do header */
    (function(){
      var header = document.querySelector('header');
      if(!header) return;
      function apply(){
        var h = Math.ceil(header.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--navOffset', (h + 14) + 'px');
      }
      apply();
      window.addEventListener('resize', apply, { passive:true });
    })();

    /* Filtro do currículo (mantém seu comportamento) */
    (function () {
      const TOP = '.chips .chip[data-filter]';
      const CARDS = '.roadmap .blockCard[data-in]';
      const CARD_CHIP = '.planChip[data-plan]';

      function cacheOriginalChipLabels() {
        document.querySelectorAll(CARD_CHIP).forEach(chip => {
          if (!chip.dataset.label) chip.dataset.label = chip.textContent.trim();
        });
      }
      function resetChipLabels() {
        document.querySelectorAll(CARD_CHIP).forEach(chip => {
          if (chip.dataset.label) chip.textContent = chip.dataset.label;
          chip.classList.remove('is-selected');
        });
      }
      function setPlan(plan) {
        document.querySelectorAll(TOP).forEach(b => {
          b.classList.toggle('active', b.dataset.filter === plan);
        });
        document.querySelectorAll(CARDS).forEach(card => {
          if (plan === 'all') { card.classList.remove('is--dim'); return; }
          const allowed = (card.dataset.in || '').trim().split(/\s+/);
          card.classList.toggle('is--dim', !allowed.includes(plan));
        });
        try { localStorage.setItem('dj_plan', plan); } catch (e) { }
      }

      cacheOriginalChipLabels();
      document.addEventListener('click', (e) => {
        const top = e.target.closest(TOP);
        if (top) { e.preventDefault(); resetChipLabels(); setPlan(top.dataset.filter); return; }
        const chip = e.target.closest(CARD_CHIP);
        if (chip) {
          e.preventDefault();
          resetChipLabels();
          chip.classList.add('is-selected');
          // abre modal: o curso é free, mas login é o gate.
          const open = document.getElementById('openLogin3');
          if (open) open.click();
          setPlan(chip.dataset.plan);
          return;
        }
      });

      let initial = 'social';
      try { initial = localStorage.getItem('dj_plan') || initial; } catch (e) { }
      const active = document.querySelector(TOP + '.active');
      if (active) initial = active.dataset.filter;
      setPlan(initial);
    })();
