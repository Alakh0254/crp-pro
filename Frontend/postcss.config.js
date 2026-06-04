// PostCSS is the CSS build pipeline Vite runs automatically. We give it two
// plugins: Tailwind (turns our @tailwind directives + utility classes into real
// CSS) and Autoprefixer (adds vendor prefixes like -webkit- so styles work across
// browsers). This file uses ESM `export default` because package.json sets
// "type": "module".
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
