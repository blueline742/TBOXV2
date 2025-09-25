export const fireVertexShader = `
  uniform float time;
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Fire rising motion with turbulence
    pos.y += time * 1.5;
    float turbulence = sin(time * 5.0 + position.x * 10.0) * 0.1;
    pos.x += turbulence;
    pos.z += cos(time * 5.0 + position.z * 10.0) * 0.1;

    vAlpha = 1.0 - (pos.y / 3.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 15.0 * (1.0 - pos.y / 3.0);
  }
`

export const fireFragmentShader = `
  uniform float time;
  uniform float opacity;
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(gl_PointCoord, center);

    if (dist > 0.5) discard;

    float alpha = (1.0 - dist * 2.0) * vAlpha * opacity;

    // Fire gradient from white-yellow to orange-red
    float heat = 1.0 - vAlpha;
    vec3 color;

    if (heat < 0.3) {
      // White-yellow core
      color = mix(vec3(1.0, 1.0, 0.8), vec3(1.0, 0.9, 0.0), heat / 0.3);
    } else if (heat < 0.6) {
      // Yellow to orange
      color = mix(vec3(1.0, 0.9, 0.0), vec3(1.0, 0.5, 0.0), (heat - 0.3) / 0.3);
    } else {
      // Orange to red
      color = mix(vec3(1.0, 0.5, 0.0), vec3(0.8, 0.1, 0.0), (heat - 0.6) / 0.4);
    }

    // Add flicker
    float flicker = sin(time * 20.0 + vUv.x * 50.0) * 0.1 + 0.9;
    color *= flicker;

    gl_FragColor = vec4(color, alpha);
  }
`