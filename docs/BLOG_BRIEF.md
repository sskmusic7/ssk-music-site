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

**3. Publish and verify** — one command, which lints, rebuilds, commits,
pushes, and polls the live URL:

```bash
bash scripts/blog-publish.sh <slug>
```

It exits non-zero if the voice lint fails, or if the post never returns 200.
If either happens, say so plainly in the report rather than claiming
success. The lint failure will name the exact problem — fix the post and
re-run the same command.

---

## Voice

SSK Music is a London producer with a 360-release catalogue, credits across
the Afroswing era (B Young, Tion Wayne, Mowgs, Alicai Harley, Ambush, SP
Montiz, Aden x Asme) and sync placements including Netflix. Write from inside
that experience.

- **Specific over general.** Name the record, the rhythm, the step number, the
  contract term. "Steps 1, 4, 9, 12" beats "a syncopated kick pattern".
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

### Sound like a person who did the thing, not a summary of the thing

`scripts/blog-voice-lint.mjs` enforces the hard rules below mechanically —
`blog-publish.sh` runs it and refuses to push on a FAIL. It isn't a
suggestion the model can talk itself out of; the post genuinely cannot go
live until it passes. Fix flagged sentences and run the same publish command
again.

**Hard rules (the linter blocks these):**

- **One em dash per post, maximum.** This is the single most-cited AI tell
  across every source on the subject. Use a period and start a new sentence,
  or a comma, or a colon. Almost every em dash in a first draft can become a
  full stop without losing anything.
- **No "That's not X. It's Y." / "It isn't just X, it's Y."** constructions.
  State the thing directly instead of setting up a straw version to knock
  down first.
- **None of:** delve, tapestry, realm, leverage, elevate, foster, navigate,
  unleash, unlock, embark, testament, robust, seamless, underscore,
  multifaceted, holistic, paradigm, synergy, game-changer, cutting-edge,
  landscape (as a metaphor), ever-evolving.
- **No stock openers:** "In today's...", "In the ever-evolving/fast-paced
  world of...", "When it comes to...", "It's no secret that...".
- **No stock transitions:** "But here's the thing", "At the end of the day",
  "In conclusion", "It's worth noting that", "plays a crucial/vital/key
  role".

**Soft rules (the linter warns, doesn't block — use judgement):**

- More than two "X, Y, or Z" three-item lists in one post. One or two reads
  as normal writing; a post that reaches for three-of-everything reads as
  generated. If a list is genuinely three real things, keep it — the warning
  is a prompt to check, not a ban.
- Average sentence length under 9 words. A whole post of short, punchy
  fragments is its own tell in the other direction. Vary sentence length the
  way someone talking through what they know actually does.

**Not mechanically checkable, so hold yourself to it:**

- Passive voice sneaks in easily ("the pattern is played by the shaker")
  when active is available ("the shaker plays the pattern"). Prefer active.
- Don't pad with adverbs and hedges ("quite", "fairly", "arguably",
  "essentially") that a person speaking plainly wouldn't reach for.
- If a sentence would fit unchanged on a generic music-production blog with
  no connection to SSK, it's too generic for this one. Ground it in the
  catalogue, a specific record, or a specific technique.

## Report back

Slug, the HTTP status from the verify step, the topic that was picked, and
anything that failed. If the publish script exited non-zero, lead with that.
