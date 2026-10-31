# DriftLens 🔍

> **"Catch the documentation a code change just made wrong."**  
> **Category:** Developer Experience | Documentation Engineering | Static Analysis  
> **Open-Weight AI Model:** Qwen 2.5 7B Instruct  
> **Problem:** Problem 5 — Automated Documentation Drift Detection (Hacktoberfest 2026 Hack Day Sonipat)  

DriftLens is an intelligent documentation drift detection system designed for GitHub Pull Requests. It analyzes source-code changes, extracts affected entities (constants, flags, parameters, defaults), pairs them with relevant documentation sentences via deterministic matching, and performs semantic consistency verification using an open-weight LLM (Qwen 2.5 7B).

---

## 1. Problem Statement & Motivation
Documentation plays a critical role in helping developers understand, configure, and contribute to open-source projects. However, documentation frequently becomes outdated when the underlying code changes:
- Configuration flags are renamed (e.g., `--timeout` → `--deadline`).
- Default values change (e.g., `DEFAULT_TIMEOUT = 30` → `60`).
- API parameters or function signatures are modified or removed.
- Features are deprecated or deleted while documentation still references them.
- Behavioral semantics change while prose tutorials still explain old logic.

DriftLens answers the critical question:
**"What documentation became incorrect because of this code change?"**
rather than simply "Did this PR touch a markdown file?"

---

## 2. Research Starting Points & Existing Tools Comparison

| Tool / Project | Primary Purpose | How It Works | Limitation Addressed by DriftLens |
| :--- | :--- | :--- | :--- |
| **Python `doctest`** | Code block verification | Executes Python code blocks inside docstrings and asserts output. | Cannot analyze prose, configuration tables, markdown tutorials, or CLI flags in text. |
| **`rustdoc` tests** | Rust example testing | Compiles and runs ````rust code blocks in documentation. | Limited strictly to executable Rust code. Cannot detect if prose statements contradict configuration. |
| **`mktestdocs`** | Markdown code block runner | Runs pytest against executable markdown code fences. | Only tests executable snippets; blind to outdated prose defaults or renamed parameters. |
| **`Doc Detective`** | UI & API doc testing | Tests executable actions against live apps. | Requires complex environment setup; cannot reason about semantic contradiction in PR diffs. |
| **DriftLens (Ours)** | **Prose & Semantic Drift Detection** | Hybrid: Deterministic AST entity extraction + sentence-level chunking + open-weight LLM reasoning. | **Detects factual contradictions in prose, tables, and instructions before code is merged.** |

---

## 3. Evaluation Scenario: Pre-Correction Drift Detection
Organizers evaluate systems on real project histories where a code commit introduced a change and a subsequent commit later corrected the documentation.

**How DriftLens handles this evaluation:**
1. Given base ref (prior to code change) and head ref (code change commit):
   ```bash
   driftlens analyze --base <commit-before> --head <code-change-commit>
   ```
2. DriftLens flags the exact drift **immediately on the code commit**, providing maintainers with the exact sentence that became wrong and a suggested fix **before** any corrective commit is required.

---

## 4. Key Technical Considerations & Solutions

### Q1: How can documentation sentences be connected to relevant source code?
DriftLens chunks Markdown files into sentence-level units with exact line ranges (`lineStart`, `lineEnd`) and section hierarchy (`Configuration`, `Options`). It extracts changed code entities from diff hunks and applies multi-signal candidate scoring (exact identifier match, old value mentions, section relevance, file stem correlation).

### Q2: How can the system identify indirect relationships between code and documentation?
DriftLens employs subtoken tokenization and root lemmatization (e.g. `DEFAULT_TIMEOUT` splits into `time`, `timeout`, and matches `timing out` or `wait duration`). The open-weight model (`Qwen 2.5 7B`) reasons over this bounded context to detect semantic equivalence that grep cannot catch.

### Q3: How can false alarms be minimized?
1. Deterministic AST/diff parsing filters out non-functional changes (whitespace, internal comments, unchanged entity values).
2. Multi-signal candidate matching excludes sentences with no conceptual overlap.
3. Calibrated composite confidence formula:
   $$\text{Confidence} = 0.35 \times \text{DeterministicScore} + 0.25 \times \text{CandidateScore} + 0.40 \times \text{LLMConfidence}$$
   Scores below `0.60` are never reported as confirmed findings.

### Q4: How can documentation changes be distinguished from changes that genuinely require documentation updates?
DriftLens inspects all documentation diffs in the same PR (`isDocumentationUpdatedInSamePR`). If a developer modified `timeout = 60` and simultaneously updated the documentation sentence to say `60 seconds`, DriftLens **suppresses the drift finding**, avoiding false alarms when documentation has already been updated.

### Q5: How can the tool remain useful without generating excessive warnings?
Findings are classified into actionable severity tiers:
- **HIGH**: Direct factual contradiction (e.g. renamed flag, altered default).
- **MEDIUM**: Deprecated or modified parameters requiring maintainer review.
- Overall status is distilled into `PASS`, `WARN`, or `FAIL`.

---

## 5. Architecture
```text
GitHub PR / Git Diff
        ↓
  PR Diff Parser (Changed files, added/removed lines)
        ↓
  Code Entity Analyzer (Variables, flags, defaults, functions)
        ↓
  Documentation Extractor (Markdown sentences, tables, line ranges)
        ↓
  Candidate Matcher (Signal ranking: identifiers, flags, sections)
        ↓
  Open-Weight LLM (Qwen 2.5 7B - Structured semantic verification)
        ↓
  Evidence Engine (Confidence calibration, severity rating, rationale)
        ↓
  Drift Report (CLI, GitHub PR comment, JSON)
```

---

## 6. Tech Stack
- **Runtime**: Node.js (v20+)
- **Server**: Express
- **Testing**: Vitest (68 unit & integration tests)
- **AI / LLM**: Open-weight Qwen 2.5 7B (via OpenAI-compatible endpoint / vLLM / Ollama)
- **UI Dashboard**: Interactive Web Studio with SVG Visual Impact Graph & 1-Click Remediation
- **CI / CD**: GitHub Actions CI + Reusable `action.yml`
- **Version Control**: Git / GitHub REST API

---

## 7. AI Model Used & Why
- **Model**: `Qwen 2.5 7B Instruct` (Open-Weight)
- **Allowed Family**: Compliant with Hacktoberfest 2026 Hack Day Sonipat open-weight model requirements.
- **Why Selected**: Qwen 2.5 7B delivers exceptional code comprehension, strict JSON schema compliance, and nuanced semantic reasoning without dependency on proprietary paid cloud APIs.

---

## 8. How the LLM Is Used
DriftLens employs a **hybrid architecture**:
1. **Deterministic layer**: Locates changed code, extracts entities, and narrows candidate documentation sentences. The LLM never reads entire repositories blindly.
2. **LLM layer**: Analyzes only the matched pair (code change + candidate sentence) to answer: *"Does this code change contradict this sentence?"*
3. **Structured schema**: Enforces strict JSON output with confidence scores and reasoning.

---

## 9. Installation
```bash
git clone https://github.com/Marwadi-me/Driftlens.git
cd Driftlens
npm install
```

---

## 10. Environment Variables
Copy `.env.example` to `.env`:
```env
GITHUB_TOKEN=your_github_token_here
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.together.xyz/v1
LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
LLM_API_KEY=your_key_here
PORT=3000
```

---

## 11. CLI Usage
```bash
# Analyze local git diff between branches
node bin/driftlens.js analyze --base main --head feature

# Analyze GitHub Pull Request
node bin/driftlens.js analyze --repo owner/repo --pr 123

# Output structured findings as JSON
node bin/driftlens.js analyze --json

# Generate a starter README.md from codebase analysis (for zero-doc repos)
node bin/driftlens.js generate-readme --repo ./my-project
```

---

## 12. Interactive Web Dashboard
DriftLens includes a real-time web dashboard featuring an SVG Visual Impact Graph, live diff analysis, 1-click remediation, and automatic README generation.

Start the dashboard:
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
- **SVG Impact Graph**: Visualizes connections between changed code files and affected markdown documentation sections.
- **6 Golden Demo Buttons**: 1-click presets for all hackathon evaluation scenarios.
- **1-Click Auto-Fix**: Automatically updates documentation with suggested fixes.
- **✨ Generate README**: Synthesizes a structured starter `README.md` directly from source code entities and package configurations.

---

## 13. GitHub PR Usage & GitHub Action
DriftLens can be invoked in GitHub Actions workflows to comment on or annotate Pull Requests with detected documentation drift. A reusable GitHub Action is provided via `action.yml`:

```yaml
- name: DriftLens Documentation Drift Check
  uses: Marwadi-me/Driftlens@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 14. Golden Evaluation Scenarios
See the `examples/` directory for verified scenarios covering the hackathon requirements:
- `examples/renamed-flag/`: Detects CLI flag `--timeout` renamed to `--deadline` (FAIL, 90% confidence).
- `examples/changed-default/`: Detects `DEFAULT_TIMEOUT` changed from 30 to 60 (FAIL, 93% confidence).
- `examples/no-drift/`: Verifies internal refactors do not trigger false alarms (PASS, 0 findings, false-positive control).
- `examples/config-table/`: Detects outdated table row `TIMEOUT_SECONDS: 30` → 60 (FAIL, 97% confidence).
- `examples/api-parameter/`: Detects function signature update `registerUser(email, password, tenantId)` (FAIL, 91% confidence).
- `examples/removed-feature/`: Detects deleted route `/api/v1/legacy-export` still documented (FAIL, 95% confidence).

---

## 15. Testing
Run the test suite with Vitest:
```bash
npm test
```
All 68 unit, integration, and regression tests run deterministically in < 600ms using mocked LLM responses.

---

## 15. CI Pipeline
GitHub Actions automatically runs `npm ci` and `npm test` on every push and pull request to ensure zero regressions.

---

## 16. Limitations
- Primary support for JavaScript/TypeScript, Python CLI flags, and Markdown.
- Semantic verification quality depends on model inference capabilities.
- Complex multi-file macro systems or non-Markdown documentation require custom parsers.

---

## 17. Future Improvements
- Tree-sitter AST parsers for Go, Rust, and Java.
- One-click GitHub PR Suggestions (`suggestion`).
- Semantic vector indexing for massive documentation monorepos.

---

## 18. Security Considerations
- DriftLens treats all analyzed source code as untrusted text.
- No arbitrary code execution or script evaluation (`eval`, `npm install`) is performed on analyzed repos.
- Secrets and tokens are filtered and never committed or leaked into LLM prompts.

---

## 19. License
[MIT License](LICENSE) © 2026 Yashvardhan Mundhra / DriftLens Contributors
