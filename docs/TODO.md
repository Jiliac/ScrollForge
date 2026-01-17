# TODO

- [x] Write tests
- [ ] Image handling (DB, agent)
- [ ] OPENAI_MODEL constant for gpt-5.2
- [ ] Display of sub agents call
  - Actually this could (should?) be done by using a vercel SDK stream and managing it manually
  - Otherwise, keep the streamText default handling and make the agentic status be pulled from the DB rather than relying on stream. (I think stream is better because enable ai-elements library to be used more easily)

How to improve coherence?

- [ ] Memory management. **Archivist**, compress conversation? (Or implicit restart)
- [ ] Criticizer at the end of narrator call. Can either adjust and regen/continue this narration. Or just "correct" in the next call/in the files.
- [ ] ~~Coherence agent, criticiser or orchestrator setting coherence? (Too much responsability on the orchestrator though.)~~

- [x] Zep memory management. Within thread, and overall
  - [x] Basic integration: sync game files, threads, messages
  - [x] Context injection before LLM calls
  - [ ] Track message sync status before trimming (avoid blind spot during async processing)
  - [ ] Re-sync game files when modified [NOTE: world_advance and faction_turn !! (Write/edit files hook?)]
  - [ ] Custom context templates for RPG-specific formatting
- [ ] ~~Faction within conversation~~
