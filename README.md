# Assessment practice

Five timed drills for pre-employment cognitive assessments. Static site, no build
step, no backend, no dependencies beyond one webfont.

| Game | Skill | Clock |
|---|---|---|
| Numerosity | Mental arithmetic | 3 min + per-level timeout |
| ShapeDance | Mental rotation | 3.3 min + per-level timeout |
| Pathfinder | Spatial reasoning (sliding puzzle) | 5 min + ~60s per-level timeout |
| Digitspan | Short-term memory | 3 min + per-level timeout |
| Zetamac | Arithmetic speed | 2 min |

Every round is generated fresh, so there is nothing to memorise. All five adapt:
solving raises the level, missing or timing out lowers it. Scores are stored in
`localStorage` and shown on the Stats page as best, last-5 average, and a trend bar.

## Running locally

Open `index.html` in a browser. That is the whole setup.

For live reload, VS Code's Live Server extension works, or:

```bash
python3 -m http.server 8000
```

## Deploying to GitHub Pages

Create an empty public repo on GitHub, then from this folder:

```bash
git init
git add .
git commit -m "Assessment practice games"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch →
Branch `main`, folder `/ (root)` → Save**.

Live in a minute or two at `https://USERNAME.github.io/REPO/`.

`index.html` at the repo root is what makes this work — Pages serves it as the
landing page with no configuration.

## Structure

```
index.html          shell; script load order matters
css/style.css       all styling
js/core.js          shared utils, storage, chrome, clocks, results
js/games/           one file per game
js/app.js           menu, stats, nav, boot
CLAUDE.md           conventions and constraints
```

Adding a game: new file in `js/games/`, an entry in `AP.GAMES` in `core.js`, and a
`<script>` tag in `index.html` before `app.js`. See `CLAUDE.md` for the module shape.

## Caveats

Mechanics are reconstructed from published descriptions, prep-vendor guides, and (for
ShapeDance) HireVue's own screenshot reproduced in a peer-reviewed paper — not from
the real assessments directly. Pathfinder was originally built as a rotate-the-pipe
puzzle before research turned up that the real game is a sliding puzzle instead;
ShapeDance was originally built as a 5-card, 2x2-pattern "Compare" game before
research found the real one uses 4 cards with 3x3 patterns and a decoy background
tint. Both were rebuilt to match. Remaining known uncertainty: whether ShapeDance's
real matching rule is always exactly two cards or sometimes more, and the exact
per-level grid-size increment for Pathfinder beyond "starts at 3x3, grows on
success." Zetamac's mechanics were checked directly against its own public source
and are the most confident of the five.

Personality and emotional-intelligence formats are deliberately excluded.

## Licence

MIT.
