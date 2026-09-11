# Elvin Lucero | Software Engineer

Personal portfolio site showcasing my web development projects.

🌐 Live site: https://elvincodes.com

## Projects

- **Raysol Drugs** - Client website for an NYC pharmacy ([case study](https://elvincodes.com/case-study-raysol.html))
- **Spots** - Social media app built with HTML, CSS, and JavaScript
- **Coffee Shop** - Responsive website with reservation form
- **Triple Peaks Library** - Multi-section library website

## Technologies

HTML | CSS | JavaScript | Git | GitHub

## Structure

Styles are written as one file per block in `blocks/`. The manifests in
`styles/` list which blocks each page type needs, in order — add a block by
adding one `@import` line there.

## Build

`npm run build:css` concatenates the blocks listed in each manifest into a
single stylesheet in `assets/`.

Netlify runs `npm run build` on deploy, which does the same and then embeds
each bundle directly into the pages that use it, leaving the deployed HTML
with no render-blocking stylesheet request. Firefox paints its first frame
within a few milliseconds whether or not stylesheets have arrived, so any
external stylesheet can flash unstyled however fast it loads.

The committed HTML keeps its `<link>`, so the pages work opened straight from
disk. Only the deployed copy is rewritten.

## Hosting

Deployed on **Netlify** from `main`. The contact form uses Netlify Forms.

## Connect

- [LinkedIn](https://www.linkedin.com/in/elvin-lucero/)
- [GitHub](https://github.com/elvin-lucero)
