uniform float time;
uniform vec3 c1, c2, c3, c4, c5, c6, c7;
uniform float opacity;
uniform float glowIntensity;

varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;

vec3 getRainbowColor(float t) {
    // Normalize t to [0, 1]
    t = mod(t, 1.0);

    if (t < 0.142857) return mix(c1, c2, t * 7.0);
    else if (t < 0.285714) return mix(c2, c3, (t - 0.142857) * 7.0);
    else if (t < 0.428571) return mix(c3, c4, (t - 0.285714) * 7.0);
    else if (t < 0.571428) return mix(c4, c5, (t - 0.428571) * 7.0);
    else if (t < 0.714285) return mix(c5, c6, (t - 0.571428) * 7.0);
    else if (t < 0.857142) return mix(c6, c7, (t - 0.714285) * 7.0);
    else return mix(c7, c1, (t - 0.857142) * 7.0);
}

void main() {
    // Create animated gradient based on world position and time
    float gradient = sin(vWorldPosition.x * 2.0) * 0.4 + 0.5;
    gradient += sin(vWorldPosition.y * 2.5) * 0.3;
    gradient += sin(vWorldPosition.z * 2.2) * 0.3;

    // Add local position influence for edge variation
    gradient += sin(vPosition.x * 6.0) * 0.1;
    gradient += sin(vPosition.y * 6.0) * 0.1;
    gradient += sin(vPosition.z * 6.0) * 0.1;

    // Add time-based rainbow cycling
    gradient += time * 0.2;

    // Get rainbow color
    vec3 color = getRainbowColor(gradient);

    // Reduced pulsing effect - less brightening
    float pulse = sin(time * 2.0) * 0.1 + 0.9; // Reduced from 0.2 + 0.8
    float breathe = sin(time * 1.1) * 0.05 + 0.95; // Reduced from 0.15 + 0.85

    // Apply effects more subtly
    color = color * pulse * breathe;

    // Remove gamma correction to maintain color saturation
    gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), opacity);
}
