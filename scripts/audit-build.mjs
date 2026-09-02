import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const client = join('dist', 'client')
const index = await readFile(join(client, 'index.html'), 'utf8')
const assetNames = await readdir(join(client, 'assets'))
const mainJs = assetNames.find((name) => /^index-.*\.js$/.test(name))
const mainCss = assetNames.find((name) => /^index-.*\.css$/.test(name))

assert.ok(mainJs, 'No se encontró el bundle principal de JavaScript')
assert.ok(mainCss, 'No se encontró la hoja principal de estilos')
assert.match(index, /rel="preload" as="image" href="\/images\/lumbre-hero\.webp"/)
assert.match(index, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com"/)

const css = await readFile(join(client, 'assets', mainCss), 'utf8')
assert.doesNotMatch(css, /@import\s+url\(['"]https:\/\/fonts\.googleapis\.com/)

const jsGzip = gzipSync(await readFile(join(client, 'assets', mainJs))).byteLength
const cssGzip = gzipSync(Buffer.from(css)).byteLength
const heroBytes = (await stat(join(client, 'images', 'lumbre-hero.webp'))).size

assert.ok(jsGzip <= 135 * 1024, `El JS inicial supera 135 KiB gzip: ${Math.ceil(jsGzip / 1024)} KiB`)
assert.ok(cssGzip <= 21 * 1024, `El CSS inicial supera 21 KiB gzip: ${Math.ceil(cssGzip / 1024)} KiB`)
assert.ok(heroBytes <= 80 * 1024, `La imagen principal supera 80 KiB: ${Math.ceil(heroBytes / 1024)} KiB`)

console.log(`Quality budget: JS ${Math.ceil(jsGzip / 1024)} KiB gzip · CSS ${Math.ceil(cssGzip / 1024)} KiB gzip · hero ${Math.ceil(heroBytes / 1024)} KiB`)
