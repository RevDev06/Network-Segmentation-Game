import { readFile, writeFile, readdir } from "node:fs/promises"

const assets = await readdir("dist/assets")
const stylesheets = assets.filter((name) => name.endsWith(".css"))
const css = (
  await Promise.all(
    stylesheets.map((name) => readFile(`dist/assets/${name}`, "utf8")),
  )
)
  .join("\n")
  .replace(/@import\s+(?:"[^"]*"|'[^']*'|url\([^)]*\))\s*;/g, "")
const source = (await readFile("src/app/game.js", "utf8")).replace(
  "export function mountGame",
  "function mountGame",
)
const html = `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101413"><meta name="description" content="Aprende segmentación de redes con cinco niveles interactivos de broadcast, máscaras e IP."><title>Segmenta · Módulo 11.4</title><style>${css}</style></head><body><div id="root"></div><script>${source}\nmountGame(document.getElementById('root'));</script></body></html>`
await writeFile("dist/index.html", html)
console.log(
  "Exportado dist/index.html: HTML, CSS y JavaScript nativo en un único archivo autónomo.",
)
