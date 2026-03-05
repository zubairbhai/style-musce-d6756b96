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

        /* ───── fragment shader — multi-layer neon golden waves ───── */
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

        float t = iTime * 0.18;

        /* ── base dark background ── */
        vec3 bg = vec3(0.02, 0.01, 0.04);

        /* ── neon golden wave layers ── */
        vec3 gold1 = vec3(1.0, 0.82, 0.30);   /* bright gold    */
        vec3 gold2 = vec3(1.0, 0.65, 0.12);   /* warm amber     */
        vec3 gold3 = vec3(0.95, 0.55, 0.85);  /* rose-gold hint */

        float totalGlow = 0.0;
        vec3  totalColor = vec3(0.0);

        /* layer 1 — slow sine */
        float wave1 = sin(p.x * 3.0 + t * 2.0) * 0.25
                     + sin(p.x * 5.5 - t * 1.3) * 0.12
                     + noise(vec2(p.x * 2.0, t)) * 0.08;
        float d1 = abs(p.y - wave1);
        float g1 = smoothstep(0.06, 0.0, d1) * 0.9;
        totalGlow  += g1;
        totalColor += gold1 * g1;

        /* layer 2 — faster counter-wave */
        float wave2 = sin(p.x * 4.5 - t * 2.8) * 0.18
                     + cos(p.x * 7.0 + t * 1.6) * 0.10
                     + noise(vec2(p.x * 3.0 + 10.0, t * 1.2)) * 0.06;
        float d2 = abs(p.y - wave2 + 0.15);
        float g2 = smoothstep(0.05, 0.0, d2) * 0.7;
        totalGlow  += g2;
        totalColor += gold2 * g2;

        /* layer 3 — gentle drift */
        float wave3 = sin(p.x * 2.2 + t * 1.1) * 0.30
                     + cos(p.x * 3.8 - t * 0.8) * 0.14
                     + noise(vec2(p.x * 1.5 + 20.0, t * 0.7)) * 0.10;
        float d3 = abs(p.y - wave3 - 0.25);
        float g3 = smoothstep(0.07, 0.0, d3) * 0.5;
        totalGlow  += g3;
        totalColor += gold3 * g3;

        /* ── broad ambient glow ── */
        float ambient = exp(-d1 * 4.0) * 0.12
                      + exp(-d2 * 4.0) * 0.08
                      + exp(-d3 * 4.0) * 0.06;
        totalColor += gold1 * ambient;

        /* ── floating sparkle particles ── */
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          vec2 sparkle = vec2(
            sin(t * 0.6 + fi * 1.7) * aspect * 0.8,
            cos(t * 0.4 + fi * 2.3) * 0.8
          );
          float sd = length(p - sparkle);
          float sg = smoothstep(0.04, 0.0, sd) * (0.4 + 0.3 * sin(t * 3.0 + fi));
          totalColor += gold1 * sg;
          totalGlow  += sg * 0.3;
        }

        /* ── subtle vignette ── */
        float vig = 1.0 - length(uv - 0.5) * 0.9;
        vig = clamp(vig, 0.0, 1.0);

        vec3 finalColor = bg + totalColor * vig;

        /* clamp to keep it rich but not blown-out */
        finalColor = min(finalColor, vec3(1.2));

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
