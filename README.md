# DriftLens 🔍

> **"Catch the documentation a code change just made wrong."**

DriftLens is an intelligent documentation drift detection system designed for GitHub Pull Requests. It analyzes source-code changes, extracts affected entities (constants, flags, parameters, defaults), pairs them with relevant documentation sentences via deterministic matching, and performs semantic consistency verification using an open-weight LLM (Qwen 2.5 7B).

---

## 1. Problem Statement
Documentation frequently becomes obsolete or factually incorrect when source code changes:
- Configuration flags are renamed (e.g., `--timeout` → `--deadline`).
- Default values change (e.g., `DEFAULT_TIMEOUT = 30` → `60`).
- API parameters or function signatures are modified or removed.
- Features are deprecated or deleted while documentation still references them.
- Behavioral semantics change while prose tutorials still explain old logic.

DriftLens answers the critical question:
**"What documentation became incorrect because of this code change?"**
rather than simply "Did this PR touch a markdown file?"

---

## 2. Why Documentation Drift Matters
Stale documentation causes developer confusion, production incidents, failed onboarding, and broken API integrations. Manual documentation audits during PR review are error-prone and frequently overlooked. DriftLens automates drift detection at PR time, catching inconsistencies before code is merged.

---

## 3. Features
- **Git & GitHub PR Analysis**: Inspects local Git diffs and GitHub Pull Requests.
- **Deterministic Code Entity Extraction**: Identifies changed constants, CLI flags, variables, functions, and defaults.
- **Sentence-Level Documentation Chunking**: Parses Markdown headings, paragraphs, and tables while preserving exact line numbers.
- **Signal-Based Candidate Matching**: Filters and scores candidate documentation before invoking AI to prevent hallucinations and reduce token usage.
- **Semantic LLM Verification**: Leverages open-weight models (Qwen 2.5 7B) to determine factual inconsistency.
- **Evidence-First Provenance**: Every finding points to exact source file/lines, documentation file/lines, rationale, confidence score, and suggested fix.
- **False-Positive Control**: Distinguishes internal refactors and concurrent documentation updates from true documentation drift.

---

## 4. Architecture
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

## 5. Tech Stack
- **Runtime**: Node.js (v20+)
- **Server**: Express
- **Testing**: Vitest
- **AI / LLM**: Open-weight Qwen 2.5 7B (via OpenAI-compatible endpoint / vLLM / Ollama)
- **CI / CD**: GitHub Actions
- **Version Control**: Git / GitHub REST API

---

## 6. AI Model Used
- **Model**: `Qwen 2.5 7B Instruct` (Open-Weight)
- **Allowed Family**: Compliant with Hacktoberfest 2026 Hack Day Sonipat open-weight model requirements.

---

## 7. Why That Model Was Selected
Qwen 2.5 7B exhibits state-of-the-art reasoning on structured JSON generation, code comprehension, and semantic contradiction analysis while remaining lightweight enough to run on standard hackathon model servers or local inference nodes without commercial API dependencies.

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
```

---

## 12. GitHub PR Usage
DriftLens can be invoked in GitHub Actions workflows to comment on or annotate Pull Requests with detected documentation drift.

---

## 13. Examples
See the `examples/` directory for verified scenarios:
- `examples/renamed-flag/`: Detects CLI flag `--timeout` renamed to `--deadline`.
- `examples/changed-default/`: Detects `DEFAULT_TIMEOUT` changed from 30 to 60.
- `examples/no-drift/`: Verifies internal refactors do not trigger false alarms.

---

## 14. Testing
Run the test suite with Vitest:
```bash
npm test
```
All unit and integration tests run deterministically using mocked LLM responses.

---

## 15. CI Pipeline
GitHub Actions automatically runs `npm ci` and `npm test` on every push and pull request to ensure zero regressions.

---

## 16. Limitations
- Primary support for JavaScript/TypeScript and Markdown.
- Semantic verification quality depends on model inference capabilities.
- Complex multi-file macro systems or non-Markdown documentation require custom parsers.

---

## 17. Future Improvements
- Tree-sitter parsers for Python, Go, and Rust.
- Automatic pull request fix suggestions via GitHub Suggestions (````suggestion```).
- Semantic vector indexing for large monorepo documentation bases.

---

## 18. Security Considerations
- DriftLens treats all analyzed source code as untrusted text.
- No arbitrary code execution or script evaluation (`eval`, `npm install`) is performed on analyzed repos.
- Secrets and tokens are filtered and never committed or leaked into LLM prompts.

---

## 19. License
[MIT License](LICENSE) © 2026 Yashvardhan Mundhra / DriftLens Contributors

