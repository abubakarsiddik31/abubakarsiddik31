// Rewrites the "Latest writing" list in README.md from the site's RSS feed.
// No dependencies; runs on Node 20 (GitHub Actions) or locally: node scripts/update-writing.mjs
import { readFile, writeFile } from "node:fs/promises"

const FEED = "https://abubakar-siddik.com/feed.xml"
const COUNT = 5
const START = "<!-- WRITING:START -->"
const END = "<!-- WRITING:END -->"

const decode = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")

const res = await fetch(FEED)
if (!res.ok) throw new Error(`Feed returned ${res.status}`)
const xml = await res.text()

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map(([, body]) => ({
    title: decode(body.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
    link: body.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "",
    date: new Date(body.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? 0),
    category: body.match(/<category>([\s\S]*?)<\/category>/)?.[1] ?? "",
  }))
  .filter((i) => i.title && i.link && !/\/newsletter\//.test(i.link))
  .sort((a, b) => b.date - a.date)
  .slice(0, COUNT)

if (items.length === 0) throw new Error("No posts found in feed; leaving README unchanged")

const list = items.map((i) => `- [${i.title}](${i.link})`).join("\n")
const readme = await readFile("README.md", "utf8")
const next = readme.replace(new RegExp(`${START}[\s\S]*?${END}`), `${START}\n${list}\n${END}`)
if (next !== readme) await writeFile("README.md", next)
console.log(next === readme ? "README already up to date" : `Updated with ${items.length} posts`)
