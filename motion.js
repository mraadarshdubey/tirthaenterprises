/* GSAP motion follows design/manifest.json; content remains visible without CDN. */
(function(){
  if(!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const mm=gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',context=>{
    const section=document.querySelector('#manifesto.approach-section');
    if(!section) return;
    // Start animations on entry, so an unavailable trigger cannot hide copy.
    context.add('revealApproach',()=>{
      const targets=section.querySelectorAll('.approach-label-group,.approach-title>span,.approach-title>em,.approach-body');
      gsap.fromTo(targets,{opacity:0,y:16},{opacity:1,y:0,duration:.65,stagger:.08,ease:'power2.out',clearProps:'opacity,transform'});
      if(window.matchMedia('(min-width:768px)').matches){
        const paths=section.querySelectorAll('.approach-path');
        paths.forEach(path=>{
          const length=path.getTotalLength();
          gsap.fromTo(path,{strokeDasharray:length,strokeDashoffset:length},{strokeDashoffset:0,duration:.9,delay:.15,ease:'power2.out',onComplete:()=>{path.style.removeProperty('stroke-dasharray');path.style.removeProperty('stroke-dashoffset');}});
        });
        gsap.fromTo(section.querySelectorAll('.approach-node'),{opacity:0},{opacity:1,duration:.4,delay:.8,stagger:.08,clearProps:'opacity'});
      }
    });
    ScrollTrigger.create({trigger:section,start:'top 85%',once:true,onEnter:()=>context.revealApproach()});
    context.add('revealPrinciples',()=>{
      gsap.fromTo(section.querySelectorAll('.approach-principles li'),{opacity:0,y:10},{opacity:1,y:0,duration:.45,stagger:.08,ease:'power2.out',clearProps:'opacity,transform'});
    });
    ScrollTrigger.create({trigger:section.querySelector('.approach-principles'),start:'top 90%',once:true,onEnter:()=>context.revealPrinciples()});
  });
  mm.add('(min-width: 1200px) and (min-height: 900px) and (prefers-reduced-motion: no-preference)',()=>{
    const sticky=document.querySelector('.journey__sticky');
    const cards=document.querySelector('.journey__cards');
    if(sticky&&cards&&sticky.offsetHeight<innerHeight-150&&cards.offsetHeight>innerHeight-130){
      ScrollTrigger.create({trigger:sticky,pin:true,pinSpacing:false,start:'top 130px',endTrigger:cards,end:'bottom bottom'});
    }
  });
  document.fonts.ready.then(()=>ScrollTrigger.refresh());
})();
