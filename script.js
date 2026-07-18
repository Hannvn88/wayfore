document.addEventListener('DOMContentLoaded', function(){

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- Three.js: wireframe globe ----------
     The globe drifts continuously and slowly around its vertical axis — never a
     frozen frame, never a fast spin. Vertex markers are HTML links overlaid on
     the canvas; each frame we project their 3D positions to screen space so the
     labels ride along with the drift and fade as they turn to the back. */
  (function(){
    var canvas = document.getElementById('globe');
    var layer  = document.getElementById('verts');
    if(!window.THREE || !canvas) return;
    var small = matchMedia('(max-width: 640px)').matches;
    var ink = 0x14120E, line = 0x353128;

    var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true, powerPreference:'low-power'});
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 6.4;
    var world = new THREE.Group(); scene.add(world);

    world.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2, small ? 2 : 3)),
      new THREE.LineBasicMaterial({color:line, transparent:true, opacity:.4})));
    world.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(2.32, small ? 16 : 20, small ? 8 : 10)),
      new THREE.LineBasicMaterial({color:ink, transparent:true, opacity:.16})));

    var N = small ? 30 : 46, pts = [];
    for(var i=0;i<N;i++){
      var u=Math.random(), v=Math.random(), th=2*Math.PI*u, ph=Math.acos(2*v-1), r=2.02;
      pts.push(new THREE.Vector3(r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph)));
    }
    world.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.PointsMaterial({color:ink, size:.05, transparent:true, opacity:.55})));

    var seg=[];
    for(var a=0;a<pts.length;a++)for(var b=a+1;b<pts.length;b++){
      if(pts[a].distanceTo(pts[b])<1.1){seg.push(pts[a].x,pts[a].y,pts[a].z,pts[b].x,pts[b].y,pts[b].z);}
    }
    var sGeo=new THREE.BufferGeometry();
    sGeo.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));
    world.add(new THREE.LineSegments(sGeo,new THREE.LineBasicMaterial({color:ink,transparent:true,opacity:.5})));

    // ---- vertex markers (HTML overlay projected from 3D) ----
    var markers = [];
    if(layer){
      layer.querySelectorAll('.vert').forEach(function(el){
        var x=parseFloat(el.getAttribute('data-x'))||0,
            y=parseFloat(el.getAttribute('data-y'))||0,
            z=parseFloat(el.getAttribute('data-z'))||0;
        var base=new THREE.Vector3(x,y,z).normalize().multiplyScalar(2.08);
        markers.push({el:el, base:base, live:el.classList.contains('live')});
      });
    }
    function updateMarkers(){
      if(!markers.length) return;
      var W = canvas.clientWidth || canvas.parentElement.clientWidth, H = W;
      var q = world.quaternion, tmp = new THREE.Vector3();
      for(var i=0;i<markers.length;i++){
        var m=markers[i];
        tmp.copy(m.base).applyQuaternion(q);
        var depth = tmp.z;                       // >0 = front hemisphere (toward camera)
        var p = tmp.clone().project(camera);
        m.el.style.left = ((p.x*0.5+0.5)*W).toFixed(1)+'px';
        m.el.style.top  = ((-p.y*0.5+0.5)*H).toFixed(1)+'px';
        var front = depth > 0;
        m.el.style.opacity = front ? '1' : Math.max(0.1, 0.55 + depth*0.35).toFixed(2);
        m.el.style.zIndex = String(front ? 5 : 2);
        if(m.live) m.el.style.pointerEvents = depth > -0.15 ? 'auto' : 'none';
      }
    }

    function render(){ renderer.render(scene, camera); updateMarkers(); }
    function size(){
      var w = canvas.clientWidth || canvas.parentElement.clientWidth;
      if(!w) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
      renderer.setSize(w, w, false);
      render();
    }
    new ResizeObserver(size).observe(canvas);
    size();
    setTimeout(size, 120);       // re-render once layout/fonts settle

    // subtle parallax on hover devices, added on top of the base drift
    var mx=0,my=0,tx=0,ty=0;
    if(fine && !reduce){
      var host = canvas.parentElement;
      host.addEventListener('pointermove',function(e){
        var rc=canvas.getBoundingClientRect();
        mx=((e.clientX-rc.left)/rc.width-.5); my=((e.clientY-rc.top)/rc.height-.5);
      },{passive:true});
      host.addEventListener('pointerleave',function(){mx=0;my=0;});
    }

    var visible = true;
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ visible = es[0].isIntersecting; },{threshold:.01}).observe(canvas);
    }

    var clock = new THREE.Clock();
    // A gentle side-to-side sway rather than a full rotation: the sphere is never
    // static, but the nodes stay roughly in place and don't drift to the edge.
    var swayY = reduce ? 0 : 0.14;      // ~8° each way
    var swayX = reduce ? 0 : 0.05;
    (function loop(){
      requestAnimationFrame(loop);
      if(!visible) return;
      var t = clock.getElapsedTime();
      tx+=(mx-tx)*.05; ty+=(my-ty)*.05;
      world.rotation.y = -0.16 + Math.sin(t*0.55)*swayY + tx*0.4;
      world.rotation.x = 0.24 + Math.sin(t*0.4)*swayX + ty*0.35;
      render();
    })();
  })();

  /* ---------- accordions: only one open at a time ---------- */
  (function(){
    var group = document.querySelector('[data-accordions]');
    if(!group) return;
    var items = group.querySelectorAll('details.acc');
    items.forEach(function(d){
      d.addEventListener('toggle', function(){
        if(d.open) items.forEach(function(o){ if(o!==d) o.open=false; });
      });
    });
  })();

  /* ---------- reveal on scroll ---------- */
  (function(){
    var els=document.querySelectorAll('.reveal');
    if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in');});return;}
    var io=new IntersectionObserver(function(en){
      en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});
    },{threshold:.12,rootMargin:'0px 0px -6% 0px'});
    els.forEach(function(e){io.observe(e);});
  })();

  /* ---------- contact form (Web3Forms, unchanged wiring) ---------- */
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
        note.style.color='var(--danger)';
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
          name:name, email:email, service:service, message:msg,
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
          note.style.color='var(--danger)';
          note.textContent='Something went wrong sending that. Please email us directly at wayforestudio@gmail.com.';
        }
      })
      .catch(function(){
        note.style.color='var(--danger)';
        note.textContent='Something went wrong sending that. Please email us directly at wayforestudio@gmail.com.';
      })
      .finally(function(){ if(btn) btn.disabled=false; });
    });
  })();

});
