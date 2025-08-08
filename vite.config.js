import glsl from 'vite-plugin-glsl';

export default {
  build: {
    sourcemap: true,
  },
  plugins: [glsl()],
};
