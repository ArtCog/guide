/* ============================================================
   smoke.js — auto-mounting WebGL2 indigo smoke for .editorial-hero
   Drop a <script src="smoke.js"></script> into any page that has
   <header class="editorial-hero"> and the canvas is injected
   automatically. Falls back to nothing on no-WebGL2 or
   prefers-reduced-motion.
   ============================================================ */

(function () {
  if (typeof window === 'undefined') return;

  // Respect motion preferences
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  uv.x+=.25;
  uv*=vec2(2,1);

  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);

  // Single density field — no per-channel chromatic shift (avoids
  // yellow/brown leakage when tint is a cool color).
  float d = fbm(uv+vec2(0,T*.015)+n);

  // Tint from u_color (highlights) to deep-tinted shadows in same family
  vec3 deepTint = u_color * 0.10;
  vec3 col = mix(deepTint, u_color, 1.0 - d);

  // Ease-in fade from near-black at t=0
  col = mix(vec3(0.02), col, min(time*0.1, 1.0));
  col = clamp(col, vec3(0.02), vec3(1.0));

  O = vec4(col, 1);
}`;

  const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  }

  function mountSmoke(host) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-smoke', '');
    host.insertBefore(canvas, host.firstChild);

    const gl = canvas.getContext('webgl2');
    if (!gl) {
      // Fallback: leave canvas removed
      canvas.remove();
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'resolution');
    const uTime = gl.getUniformLocation(program, 'time');
    const uColor = gl.getUniformLocation(program, 'u_color');

    // Royal indigo — matches --accent (#5e6bff)
    const color = [0.37, 0.42, 1.0];

    function resize() {
      const dpr = Math.max(1, window.devicePixelRatio);
      const w = host.offsetWidth;
      const h = host.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    function loop(now) {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now * 1e-3);
      gl.uniform3fv(uColor, color);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  function init() {
    const hosts = document.querySelectorAll('.editorial-hero');
    hosts.forEach(mountSmoke);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
