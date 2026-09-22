# SSK Music — scheduled blog brief

The Monday/Wednesday/Friday cron job points here rather than carrying its own
prompt, so this brief can be changed with a commit instead of by rebuilding
the job.

**Repo on the droplet:** `/home/node/.openclaw/workspace/ssk-music-site`

---

## Critical difference from BigHeadz

BigHeadz publishes into Neon and its skill says *do not git push to deploy*.

**This site is the opposite.** `sskmusic.com` is static on Cloudflare Pages.
Publishing **is** the git push — there is no database and no separate
"published" state. What is in the repo is what is live. Do not look for an
API, and do not write to `data/blog/incoming/` — that folder does not exist
here.

---

## Workflow

```bash
cd /home/node/.openclaw/workspace/ssk-music-site
git pull origin main
```

**1. Pick the topic. Do not freestyle.**

```bash
node scripts/blog-topic-guard.mjs --pick        # the topic to write
node scripts/blog-topic-guard.mjs --forbidden   # what not to write, + every existing title
```

Obey `neverWrite` and `titleRules` in the forbidden output. If the picked
topic is too close to something in `existingTitles`, pick again.

**2. Write the post** to `data/blog/posts/<slug>.json`:

```json
{
  "slug": "kebab-case-matching-the-filename",
  "title": "...",
  "excerpt": "One or two sentences. This is the listing card and the meta description.",
  "date": "YYYY-MM-DD",
  "author": "SSK Music",
  "image": null,
  "published": true,
  "tags": ["Two", "To Four"],
  "content": "Markdown. Sections use ## — never # , the title is the page's h1."
}
```

`slug` must equal the filename stem. Leave `image` as `null` — this site has
no image pipeline, and the layout is designed to read fine without one.

**3. Publish and verify** — one command, which rebuilds, commits, pushes, and
polls the live URL:

```bash
bash scripts/blog-publish.sh <slug>
```

It exits non-zero if the post never returns 200. If that happens, say so
plainly in the report rather than claiming success — a Pages build can fail
while every local signal looks fine.

---

## Voice

SSK Music is a London producer with a 360-release catalogue, credits across
the Afroswing era (B Young, Tion Wayne, Mowgs, Alicai Harley, Ambush, SP
Montiz, Aden x Asme) and sync placements including Netflix. Write from inside
that experience.

- **Specific over general.** Name the record, the rhythm, the step number, the
  contract term. "Steps 1, 4, 9, 12" beats "a syncopated kick pattern".
- **No hype, no hustle-talk.** No "game-changing", no "in today's fast-moving
  industry", no motivational filler.
- **Assume competence.** The reader can open a DAW. Don't explain what a hi-hat
  is; explain why it's where it is.
- **British spelling.**
- **800–1,400 words.** Long enough to say something, short enough to finish.
- **Link internally where it's honestly useful** — `/funlab.html#drum-patterns`,
  `/discography.html`, `/index.html#afroswing`. Site-relative paths only.
- **Never invent credits, chart positions, streaming numbers or quotes.** If a
  fact isn't verifiable from the repo or a source you can cite, leave it out.
  The catalogue in `data/discography.json` is the authority for what SSK
  actually produced.

## Report back

Slug, the HTTP status from the verify step, the topic that was picked, and
anything that failed. If the publish script exited non-zero, lead with that.
