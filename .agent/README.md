Agent preferences and memory (MVP)

Files:
- `.agent/preferences.yaml`: base defaults for the workspace.
- `prefs/team.yaml` -> `prefs/ivan.yaml`: layered overrides.
- `.agent/accepted-decisions.yaml`: decisions that become sticky defaults.
- `.agent/resolved.yaml`: generated snapshot used by the agent.
- `.agent/risk-policy.json`: risk matrix and safeguards.

How it works:
1) Detect the stack from the repo (Node/TS, Prisma, Zod, etc.).
2) Apply accepted decisions as the highest-priority defaults.
3) Emit a single resolved view at `.agent/resolved.yaml`.

Commands:
- Resolve preferences now:
  - `scripts/resolve_prefs.sh`
- Record an accepted decision:
  - `scripts/accept_decision.sh "Use X for Y"`

Priority (highest -> lowest):
1) accepted decisions
2) `prefs/ivan.yaml`
3) `prefs/team.yaml`
4) `.agent/preferences.yaml`

Risk policy:
- Actions are classified as low/medium/high.
- Medium/high require plan+diff; high requires checks.
- Audit is append-only in `data/decision-audit.log`.
