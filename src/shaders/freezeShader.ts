export const freezeVertexShader = `
  uniform float time;
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Add swirling motion
    float angle = time * 2.0 + position.y * 3.0;
    pos.x += sin(angle) * 0.1;
    pos.z += cos(angle) * 0.1;
    pos.y += time * 0.5;

    vAlpha = 1.0 - (pos.y / 3.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 10.0 * (1.0 - pos.y / 3.0);
  }
`

export const freezeFragmentShader = `
  uniform float time;
  uniform float opacity;
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(gl_PointCoord, center);

    if (dist > 0.5) discard;

    float alpha = (1.0 - dist * 2.0) * vAlpha * opacity;

    // Ice blue color with sparkles
    vec3 color = vec3(0.4, 0.8, 1.0);
    float sparkle = sin(time * 10.0 + vUv.x * 100.0) * 0.5 + 0.5;
    color += vec3(sparkle * 0.3);

    gl_FragColor = vec4(color, alpha);
  }
`