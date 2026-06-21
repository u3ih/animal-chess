// Tailwind v4 ships as a PostCSS plugin (autoprefixer + import handling built in).
// Next applies PostCSS after its Sass step, so .scss component styles and the
// Tailwind entry (tailwind.css) are processed in separate files — see layout.tsx.
const config = {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};

export default config;
