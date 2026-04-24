/**
 * SVGO config for static assets in /public (Next.js serves these as-is).
 * - preset-default: removes comments, metadata, editor cruft, minifies paths, etc.
 * - viewBox: never use removeViewBox (not in preset-default v4; viewBox stays).
 * - removeDimensions: strip width/height when viewBox exists (or derive viewBox) for CSS-sized SVGs.
 * - A11y: keep aria-* (default), keep role, keep meaningful <title>/<desc> (removeDesc only strips empty/editor boilerplate).
 *
 * @type {import('svgo').Config}
 */
module.exports = {
  multipass: true,
  js2svg: {
    eol: 'lf',
    indent: 0,
    pretty: false,
  },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeUnknownsAndDefaults: {
            keepAriaAttrs: true,
            keepDataAttrs: true,
            keepRoleAttr: true,
          },
          removeDesc: {
            removeAny: false,
          },
        },
      },
    },
    'removeDimensions',
  ],
}
