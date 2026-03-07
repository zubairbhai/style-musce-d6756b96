import { useEffect, useRef } from "react";

/**
 * Full-screen WebGL neon golden wave shader.
 * Renders behind the UI with `fixed inset-0 -z-10`.
 * GPU-accelerated — no DOM re-renders.
 */
export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
    if (!gl) return;

    /* ───── vertex shader ───── */
    const vsSource = `
      attribute vec4 aVertexPosition;
      void main() {
        gl_Position = aVertexPosition;
      }
    `;

    const fsSource = `
      precision highp float;

      uniform vec2  iResolution;
      uniform float iTime;

      /* ── helpers ── */
      float hash(float n) { return fract(sin(n) * 43758.5453123); }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n = i.x + i.y * 57.0;
        return mix(
          mix(hash(n),       hash(n + 1.0),   f.x),
          mix(hash(n + 57.0), hash(n + 58.0), f.x),
          f.y
        );
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        float aspect = iResolution.x / iResolution.y;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= aspect;

        float t = iTime * 0.22;

        /* ── deeper background for better neon contrast ── */
        vec3 bg = vec3(0.005, 0.002, 0.01);

        /* ── dual-neon palette ── */
        vec3 neonGold = vec3(1.0, 0.85, 0.2);
        vec3 shiningWhite = vec3(1.0, 0.98, 0.9);
        vec3 amberGlow = vec3(1.0, 0.4, 0.1);

        vec3 neonPink = vec3(1.0, 0.2, 0.7);      /* vibrant neon pink */
        vec3 pinkWhite = vec3(1.0, 0.9, 0.95);    /* pink-hot highlight */
        vec3 magentaGlow = vec3(0.8, 0.1, 0.5);   /* deep magenta glow */

        vec3 totalColor = vec3(0.0);

        /* ──── wave 1 — neon golden (top) ──── */
        float w1 = sin(p.x * 2.2 + t * 1.3) * 0.22 + 0.4;
        float d1 = abs(p.y - w1);
        totalColor += neonGold * exp(-d1 * 14.0) * 0.8;
        totalColor += shiningWhite * smoothstep(0.012, 0.0, d1) * 1.1;
        totalColor += amberGlow * exp(-d1 * 3.0) * 0.2;

        /* ──── wave 2 — neon pink (mid-top) ──── */
        float w2 = sin(p.x * 3.1 - t * 1.8) * 0.18 + 0.1;
        float d2 = abs(p.y - w2);
        totalColor += neonPink * exp(-d2 * 16.0) * 0.9;
        totalColor += pinkWhite * smoothstep(0.01, 0.0, d2) * 1.2;
        totalColor += magentaGlow * exp(-d2 * 3.5) * 0.3;

        /* ──── wave 3 — neon golden (mid-bottom) ──── */
        float w3 = cos(p.x * 2.8 + t * 1.1) * 0.20 - 0.2;
        float d3 = abs(p.y - w3);
        totalColor += neonGold * exp(-d3 * 15.0) * 0.7;
        totalColor += shiningWhite * smoothstep(0.012, 0.0, d3) * 1.0;
        totalColor += amberGlow * exp(-d3 * 3.0) * 0.2;

        /* ──── wave 4 — neon pink (bottom) ──── */
        float w4 = sin(p.x * 1.9 - t * 0.9) * 0.25 - 0.5;
        float d4 = abs(p.y - w4);
        totalColor += neonPink * exp(-d4 * 14.0) * 0.8;
        totalColor += pinkWhite * smoothstep(0.011, 0.0, d4) * 1.1;
        totalColor += magentaGlow * exp(-d4 * 3.0) * 0.2;

        /* ──── dual-color shimmering sparkles ──── */
        for (int i = 0; i < 16; i++) {
          float fi = float(i);
          float speed = 0.2 + hash(fi) * 0.5;
          vec2 spPos = vec2(
            sin(t * speed + fi * 2.3) * aspect * 0.9,
            cos(t * (speed * 0.7) + fi * 1.7) * 0.9
          );
          
          float spDist = length(p - spPos);
          float twinkle = sin(t * 4.0 + fi) * 0.5 + 0.5;
          
          // toggle color based on index
          vec3 pColor = (mod(fi, 2.0) == 0.0) ? neonGold : neonPink;
          vec3 pWhite = (mod(fi, 2.0) == 0.0) ? shiningWhite : pinkWhite;
          
          totalColor += pColor * smoothstep(0.025, 0.0, spDist) * 0.5 * twinkle;
          totalColor += pWhite * smoothstep(0.008, 0.0, spDist) * 1.2 * twinkle;
        }

        /* ── vignette ── */
        float vig = 1.0 - length(uv - 0.5) * 1.1;
        totalColor *= clamp(vig, 0.0, 1.0);

        /* final exposure mapping */
        vec3 finalColor = bg + totalColor;
        finalColor = 1.0 - exp(-finalColor * 1.6); 
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    /* ───── compile & link ───── */
    function compile(type: number, source: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.warn("Shader compile error:", gl!.getShaderInfoLog(shader));
      }
      return shader;
    }

    const vertexShader = compile(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Shader program link error:", gl.getProgramInfoLog(program));
    }

    /* ───── full-screen quad ───── */
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, "aVertexPosition");
    const resLoc = gl.getUniformLocation(program, "iResolution");
    const timeLoc = gl.getUniformLocation(program, "iTime");

    /* ───── resize handler ───── */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl!.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("resize", resize);
    resize();

    /* ───── render loop ───── */
    const start = performance.now();
    let animId: number;

    function render() {
      const time = (performance.now() - start) / 1000;

      gl!.clearColor(0, 0, 0, 1);
      gl!.clear(gl!.COLOR_BUFFER_BIT);

      gl!.useProgram(program);
      gl!.uniform2f(resLoc, canvas.width, canvas.height);
      gl!.uniform1f(timeLoc, time);

      gl!.bindBuffer(gl!.ARRAY_BUFFER, positionBuffer);
      gl!.vertexAttribPointer(posLoc, 2, gl!.FLOAT, false, 0, 0);
      gl!.enableVertexAttribArray(posLoc);

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      animId = requestAnimationFrame(render);
    }
    render();

    /* ───── cleanup ───── */
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      gl!.deleteProgram(program);
      gl!.deleteShader(vertexShader);
      gl!.deleteShader(fragmentShader);
      gl!.deleteBuffer(positionBuffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      aria-hidden="true"
    />
  );
}
