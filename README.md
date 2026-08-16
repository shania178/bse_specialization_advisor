# BSE Specialisation Advisor

A fully client-side web application that helps incoming **Bachelor of Software
Engineering (BSE)** students reflect on their strengths, interests and goals —
and discover which of four specialisations fits them best:

| Category | Focus |
|---|---|
| **Low-Level Programming** | Systems, memory, performance, close-to-hardware |
| **AR / VR** | Immersive 3D experiences, spatial computing, real-time rendering |
| **Full-Stack Web** | Front-end, back-end, APIs, cloud, shipping products |
| **Machine Learning** | Models, data pipelines, prediction, intelligent systems |

Built with **pure HTML5, CSS3 and ES6+ JavaScript** — no frameworks and no
external libraries (not even for the Canvas chart).

---

## Features

- **Four-page structure** — Landing, Quiz, Results, Contact.
- **Real-time inline validation** — custom regex patterns for names, student
  IDs, institutional emails (`@alustudent.com`) and Mauritian phone numbers,
  with `.is-valid` / `.is-invalid` visual states and `.error-message` elements
  below each field. No `alert()` popups anywhere.
- **Interactive media (all three types):**
  - **Image hotspots** — Q5 uses an SVG "tech hub" scene with clickable regions.
  - **Audio question** — Q6 uses an HTML5 `<audio>` prompt with custom
    play / pause / replay controls.
  - **Video scenario** — Q7 embeds an HTML5 `<video>` that auto-pauses at a
    pre-programmed timestamp via a `timeupdate` listener, prompting a decision
    before the student may continue.
- **Countdown timer** — `setInterval` / `clearInterval` with a 5-minute limit,
  a red pulsing warning under 30 seconds, a lock screen and auto-submit on
  timeout.
- **Dynamic scoring engine** — multi-category scores with **speed bonuses**
  (faster answers earn more) and **streak multipliers** (consistent category
  preferences grow up to 1.5×).
- **HTML5 Canvas radar chart** — a pure Canvas 2D radar/spider chart with a
  `requestAnimationFrame` reveal animation and a particle confetti burst,
  rendered from the quiz results (no libraries).

---

## Pages

| Page | File | Purpose |
|---|---|---|
| Landing | `index.html` | Intro + student details form (live validation) |
| Quiz | `quiz.html` | 10 questions, timer, media, scoring engine |
| Results | `results.html` | Profile outcome, score bars, Canvas radar chart, recommendations |
| Contact | `contact.html` | Author details, project links, feedback form |

---

## Project structure

```
.
├── index.html              # Landing page
├── quiz.html               # Interactive quiz
├── results.html            # Results + Canvas radar
├── contact.html            # Contact & feedback
├── css/
│   └── style.css           # Design system, validation states, animations
├── js/
│   ├── shared.js           # Regex validation engine + nav + storage helpers
│   ├── landing.js          # Landing page submit flow
│   ├── quiz.js             # Timer, scoring, media, question renderer
│   ├── results.js          # Canvas radar chart + narrative + confetti
│   └── contact.js          # Contact form + star rating
├── assets/
│   ├── audio-prompt.wav    # Generated retro-tech audio clip
│   └── video-scenario.webm # Generated scenario clip (VP8/Opus)
└── README.md
```

---

## Running locally

No build step or dependencies. Serve the folder with any static server, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Deploying to GitHub Pages

The project is pure static HTML/CSS/JS, so it deploys directly from the
repository `main` branch:

1. Make sure the repository
   `github.com/shania178/bse_specialization_advisor` is set to **Public**
   (Repository → Settings → General → Danger Zone → Change visibility).
2. Repository → **Settings** → **Pages** → Source: **Deploy from a branch** →
   branch `main` / `(root)` → **Save**.
3. The site is published at:
   `https://shania178.github.io/bse_specialization_advisor/`

---

## Asset generation notes

- `assets/audio-prompt.wav` — generated with a small Python script using only
  the standard library `wave` module (sine/square tone synthesis).
- `assets/video-scenario.webm` — generated with `gst-launch-1.0` (GStreamer):
  `videotestsrc pattern=ball` + `textoverlay` + `vp8enc` + `opusenc`, muxed
  into WebM.

The scripts are included below so the media can be reproduced:

<details>
<summary>Audio generation script (Python)</summary>

```python
import wave, struct, math
SR = 44100
def tone(f, d, vol=.35, square=True):
    out = []
    for i in range(int(SR*d)):
        t = i/SR
        env = min(1.0, t/.02) * min(1.0, (d-t)/.05)
        v = (1.0 if math.sin(2*math.pi*f*t) >= 0 else -1.0) if square else math.sin(2*math.pi*f*t)
        out.append(max(env,0)*vol*v)
    return out
def silence(d): return [0.0]*int(SR*d)
clip = []
for f, d in [(523.25,.16),(659.25,.16),(783.99,.16),(1046.5,.3),(392,.14),(523.25,.14),(659.25,.4)]:
    clip += tone(f, d); clip += silence(.07)
clip += [.30*math.sin(2*math.pi*(550+1500*(i/SR/.9))*i/SR) for i in range(int(SR*.9))]
clip += tone(1046.5,.12,square=False) + silence(.1) + tone(1318.5,.18,square=False) + silence(.2)
peak = max(abs(x) for x in clip)
with wave.open('assets/audio-prompt.wav','w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<h', int(x/peak*.8*32767)) for x in clip))
```

</details>

<details>
<summary>Video generation command (GStreamer)</summary>

```bash
set +H
gst-launch-1.0 -e videotestsrc pattern=ball num-buffers=360 ! videoconvert ! videoscale ! \
  video/x-raw,width=960,height=540,framerate=30/1 ! \
  textoverlay text="ALINGA FITNESS APP - LIVE PROTOTYPE FEED" font-desc="Sans 34" valignment=top halignment=center ! \
  textoverlay text="Q4 SCENARIO - watch the demo, then decide" font-desc="Sans 22" valignment=bottom halignment=center ! \
  vp8enc target-bitrate=700000 ! webmmux name=mux ! \
  filesink location=assets/video-scenario.webm \
  audiotestsrc wave=sine freq=196 num-buffers=517 ! volume volume=0.10 ! audioconvert ! opusenc ! mux.
```

</details>

---

## Author

**Bibi Shania Tinkouree** — BSc (Hons) Software Engineering, Year 1
(b.tinkouree@alustudent.com)

Project repository: [github.com/shania178/bse_specialization_advisor](https://github.com/shania178/bse_specialization_advisor)
