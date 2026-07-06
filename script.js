document.addEventListener('DOMContentLoaded', function(){

  /* ---------- Three.js: wireframe globe (rAF loop, paused when off-screen) ---------- */
  (function(){
    var canvas = document.getElementById('globe');
    if(!window.THREE || !canvas) return;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var small = matchMedia('(max-width: 640px)').matches;
    var ink = 0x0C0C0C, line = 0x2E2E2E;

    var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true, powerPreference:'low-power'});
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 6.4;
    var world = new THREE.Group(); scene.add(world);

    world.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2, small ? 2 : 3)),
      new THREE.LineBasicMaterial({color:line, transparent:true, opacity:.34})));
    world.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(2.32, small ? 16 : 20, small ? 8 : 10)),
      new THREE.LineBasicMaterial({color:ink, transparent:true, opacity:.14})));

    var N = small ? 30 : 46, pts = [];
    for(var i=0;i<N;i++){
      var u=Math.random(), v=Math.random(), th=2*Math.PI*u, ph=Math.acos(2*v-1), r=2.02;
      pts.push(new THREE.Vector3(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph)));
    }
    world.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.PointsMaterial({color:ink, size:.06})));

    var seg=[];
    for(var a=0;a<pts.length;a++)for(var b=a+1;b<pts.length;b++){
      if(pts[a].distanceTo(pts[b])<1.1){seg.push(pts[a].x,pts[a].y,pts[a].z,pts[b].x,pts[b].y,pts[b].z);}
    }
    var sGeo=new THREE.BufferGeometry();
    sGeo.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));
    world.add(new THREE.LineSegments(sGeo,new THREE.LineBasicMaterial({color:ink,transparent:true,opacity:.55})));

    world.rotation.x = .35;
    var mx=0,my=0,tx=0,ty=0;
    if(matchMedia('(hover:hover) and (pointer:fine)').matches){
      canvas.parentElement.addEventListener('pointermove',function(e){
        var rc=canvas.getBoundingClientRect();
        mx=((e.clientX-rc.left)/rc.width-.5); my=((e.clientY-rc.top)/rc.height-.5);
      },{passive:true});
      canvas.parentElement.addEventListener('pointerleave',function(){mx=0;my=0;});
    }

    function size(){
      var w = canvas.clientWidth || canvas.parentElement.clientWidth;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
      renderer.setSize(w, w, false);
    }
    new ResizeObserver(size).observe(canvas); size();

    var visible = true;
    new IntersectionObserver(function(es){ visible = es[0].isIntersecting; },{threshold:.01}).observe(canvas);

    var clock = new THREE.Clock();
    (function loop(){
      requestAnimationFrame(loop);
      if(!visible) return;                     // skip work when scrolled away
      var t = clock.getElapsedTime();
      if(!reduce) world.rotation.y = t*0.13;
      tx+=(mx-tx)*.06; ty+=(my-ty)*.06;
      world.rotation.y += tx*.9;
      world.rotation.x = .35 + ty*.7;
      renderer.render(scene, camera);
    })();
  })();

  /* ---------- paper-depth tilt (hover devices only) ---------- */
  (function(){
    var ok = matchMedia('(hover:hover) and (pointer:fine)').matches
          && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!ok) return;
    document.querySelectorAll('.tilt').forEach(function(t){
      var s=t.querySelector('.sheet'); if(!s) return;
      t.addEventListener('pointermove',function(e){
        var rc=t.getBoundingClientRect();
        var px=(e.clientX-rc.left)/rc.width-.5, py=(e.clientY-rc.top)/rc.height-.5;
        s.style.transform='rotateX('+(-py*5).toFixed(2)+'deg) rotateY('+(px*6).toFixed(2)+'deg) translateZ(6px)';
      });
      t.addEventListener('pointerleave',function(){ s.style.transform=''; });
    });
  })();

  /* ---------- reveal on scroll + underline draw ---------- */
  (function(){
    var els=document.querySelectorAll('.reveal,.draw');
    if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in');});return;}
    var io=new IntersectionObserver(function(en){
      en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});
    },{threshold:.15,rootMargin:'0px 0px -6% 0px'});
    els.forEach(function(e){io.observe(e);});
  })();

  /* ---------- contact form ---------- */
  (function(){
    var f=document.getElementById('lead-form'), note=document.getElementById('form-note');
    if(!f) return;
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var d=new FormData(f);
      var name=(d.get('name')||'').toString().trim();
      var email=(d.get('email')||'').toString().trim();
      var service=(d.get('service')||'').toString().trim();
      var msg=(d.get('message')||'').toString().trim();
      var ok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!name||!ok||!service||!msg){
        note.style.color='#8A1F1F';
        note.textContent='Please add your name, a valid email, what you need, and a short note.';
        return;
      }
      var btn=f.querySelector('button[type="submit"], input[type="submit"]');
      note.style.color='var(--ink)';
      note.textContent='Sending...';
      if(btn) btn.disabled=true;

      fetch('https://api.web3forms.com/submit', {
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({
          access_key:d.get('access_key'),
          name:name,
          email:email,
          service:service,
          message:msg,
          subject:'New project inquiry: '+service
        })
      })
      .then(function(r){ return r.json(); })
      .then(function(res){
        if(res.success){
          note.style.color='var(--ink)';
          note.textContent='Thanks, that\'s sent. We will get back to you within one working day.';
          f.reset();
        } else {
          note.style.color='#8A1F1F';
          note.textContent='Something went wrong sending that. Please email us directly at wayforestudio@gmail.com.';
        }
      })
      .catch(function(){
        note.style.color='#8A1F1F';
        note.textContent='Something went wrong sending that. Please email us directly at wayforestudio@gmail.com.';
      })
      .finally(function(){
        if(btn) btn.disabled=false;
      });
    });
  })();

});
