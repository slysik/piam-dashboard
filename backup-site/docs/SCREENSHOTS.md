# Adding Screenshots to README

To add screenshots to the README:

## Option 1: GitHub-hosted images

1. Take screenshots of each view
2. Create an `assets` or `images` folder in the repo
3. Add images with descriptive names like:
   - `executive-overview.png`
   - `real-time-risk.png`
   - `command-center.png`
   - `access-hygiene.png`
   - `compliance-audit.png`
   - `dashboard-builder.png`

4. Reference in README:
```markdown
![Executive Overview](./assets/executive-overview.png)
```

## Option 2: External hosting (recommended for large images)

Upload to:
- imgur.com
- cloudinary.com
- Your own CDN

Then reference:
```markdown
![Executive Overview](https://your-cdn.com/executive-overview.png)
```

## Recommended Screenshots

| View | What to Capture |
|------|-----------------|
| Executive Overview | Full dashboard with KPIs and charts |
| Real-Time Risk | Live event stream with anomalies |
| Command Center | Map view with connector health |
| Access Hygiene | Lifecycle tiles showing exceptions |
| Compliance & Audit | Audit mode enabled with evidence table |
| Dashboard Builder | Widget library and custom dashboard |
| Mustering | Emergency mode with missing personnel |

## GIF Recordings

For demos, consider recording GIFs of:
- Time range toggle changing data
- Persona switching and tab visibility
- Drag-and-drop in Dashboard Builder
- Live event streaming

Tools: LICEcap (Mac/Windows), Peek (Linux), or Kap (Mac)
