(function(){
 'use strict';
 if(!window.gsap||!window.ScrollTrigger)return;
 gsap.registerPlugin(ScrollTrigger);
 const mm=gsap.matchMedia();
 mm.add('(prefers-reduced-motion: no-preference)',context=>{
   document.querySelectorAll('.upgrade-reveal').forEach(el=>{
     const name='reveal'+Array.from(document.querySelectorAll('.upgrade-reveal')).indexOf(el);
     context.add(name,()=>gsap.fromTo(el,{opacity:0,y:14},{opacity:1,y:0,duration:.55,ease:'power2.out',clearProps:'opacity,transform'}));
     ScrollTrigger.create({trigger:el,start:'top 90%',once:true,onEnter:()=>context[name]()});
   });
 });
 document.fonts.ready.then(()=>ScrollTrigger.refresh());
})();
