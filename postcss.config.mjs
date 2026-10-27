/**
 * Inline text links share `.link-underline` from `@camib0b/ui`.
 * `@apply` cannot see that class (it is not a utility) and cannot copy its
 * `::after` rules, so this pass adds the same selectors beside the shared
 * ones. Card rows, presses, flex and block links, and the team-home control
 * are excluded; the team-home control opts in with the class itself.
 *
 * Tailwind stays a string here. Importing `@tailwindcss/postcss` from this
 * file makes Turbopack bundle lightningcss and the build fails.
 */
const inlineTextLinkSelector =
  'a:where(:not(.group, .press, .inline-flex, .flex, .block, [data-team-library-home], [data-slot]))'

function extendLinkUnderlineSelectors() {
  const prefix = '.link-underline'
  return {
    postcssPlugin: 'inline-text-link-underline',
    Rule(rule) {
      if (!rule.selectors || rule.raws?.linkUnderlineExtended) return
      const nextSelectors = []
      let changed = false
      for (const selector of rule.selectors) {
        nextSelectors.push(selector)
        const isLinkUnderline =
          selector === prefix || selector.startsWith(`${prefix}:`)
        if (!isLinkUnderline) continue
        const extended = inlineTextLinkSelector + selector.slice(prefix.length)
        if (nextSelectors.includes(extended)) continue
        nextSelectors.push(extended)
        changed = true
      }
      if (changed) {
        rule.raws.linkUnderlineExtended = true
        rule.selectors = nextSelectors
      }
    },
  }
}

extendLinkUnderlineSelectors.postcss = true

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: ['@tailwindcss/postcss', extendLinkUnderlineSelectors()],
}

export default config
