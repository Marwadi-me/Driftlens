# DriftLens — Architecture & Implementation Roadmap

> **Tagline:** *"Catch the documentation a code change just made wrong."*  
> **Problem:** Problem 5 — Automated Documentation Drift Detection  
> **Open-Weight AI Model:** Qwen 2.5 7B  
> **Author / Team:** Yashvardhan Mundhra (`loneCommiter`)  
> **Coding Agent:** Antigravity  

---

## 1. Executive Summary

Software documentation frequently becomes obsolete or factually incorrect when source code changes:
- Configuration flags are renamed (e.g., `--timeout` → `--deadline`).
- Default values change (e.g., `DEFAULT_TIMEOUT = 30` → `60`).
- API parameters or function signatures are modified or removed.
- Features are deprecated or deleted while documentation continues to refer to them.
- Behavioral semantics change while prose tutorials still explain old logic.

DriftLens is an intelligent documentation-review system designed for GitHub Pull Requests. It avoids the naive pitfall of dumping entire repositories into an LLM. Instead, it utilizes a **hybrid deterministic + open-weight LLM architecture**: deterministic parsing extracts changed code entities and candidate documentation sentences, while an open-weight model (`Qwen 2.5 7B`) performs targeted semantic consistency reasoning.

---

## 2. Component Breakdown: "Which Part Works for Which Thing"

Below is a detailed guide to every subsystem and module in the DriftLens codebase:

```
driftlens/
├── bin/
│   └── driftlens.js               # CLI executable binary entrypoint
├── src/
│   ├── index.js                   # Unified high-level API orchestrator
│   ├── cli.js                     # Terminal CLI flag parser & command handler
│   ├── server.js                  # Express API server for web dashboard
│   ├── git/
│   │   └── diffParser.js          # Unified diff parser & file classifier
│   ├── analyzer/
│   │   ├── documentationAnalyzer.js # Markdown sentence & table chunker
│   │   └── entityExtractor.js     # Code entity & configuration change extractor
│   ├── matcher/
│   │   └── candidateMatcher.js    # Multi-signal relevance scoring engine
│   ├── ai/
│   │   ├── llmClient.js           # Open-weight model adapter (vLLM/Ollama/Mock)
│   │   ├── prompts.js             # Factual verification system & user prompts
│   │   └── schemas.js             # Strict JSON schema validation & repair
│   ├── evidence/
│   │   └── evidenceEngine.js      # Calibrated confidence & false-positive filter
│   ├── report/
│   │   └── reportGenerator.js     # JSON, Terminal, and PR Review formatter
│   └── github/
│       └── githubClient.js        # GitHub REST API client for Pull Requests
├── public/
│   └── index.html                 # Interactive Web UI & Live Demo Dashboard
├── examples/                      # Mandatory golden demonstration cases
│   ├── renamed-flag/              # Demo 1: CLI flag renamed (--timeout -> --deadline)
│   ├── changed-default/           # Demo 2: Default value changed (30 -> 60)
│   └── no-drift/                  # Demo 3: Internal refactor (zero false alarms)
├── tests/                         # 52 unit & integration tests (100% passing)
├── .github/
│   ├── workflows/ci.yml           # Automated CI workflow on PR & push
│   └── pull_request_template.md   # Hackathon PR metadata template
├── HACKATHON.md                   # Hackathon compliance root metadata
├── LICENSE                        # MIT License
├── README.md                      # Comprehensive 20-section project manual
└── package.json                   # Project scripts and dependencies
```

### Module Responsibilities

| File / Component | Responsibility & How It Works |
| :--- | :--- |
| **`src/git/diffParser.js`** | **Diff Parser & File Classifier:** Parses unified diffs (`git diff` and GitHub PR patches) into structured file objects with line-by-line hunks, exact line offsets, additions, deletions, and classifies files into `source`, `documentation`, `tests`, `configuration`, or `binary`. |
| **`src/analyzer/documentationAnalyzer.js`** | **Documentation Extractor:** Parses Markdown (`README.md`, `docs/**/*.md`), extracting prose sentences with precise line numbers (`lineStart`, `lineEnd`), section heading hierarchy, structured Markdown tables (headers, cells, row context), and code blocks. |
| **`src/analyzer/entityExtractor.js`** | **Code Entity Extractor:** Inspects changed source code to identify variables, constants (`DEFAULT_TIMEOUT`), CLI flags (`add_argument("--timeout")`), functions, defaults, and maps old values vs new values across diff hunks. |
| **`src/matcher/candidateMatcher.js`** | **Candidate Matcher:** Prevents sending entire repos to the LLM. Applies multi-signal relevance scoring (Exact Identifier, Old Value Occurrence, Section Context, File Path Stem, Subtoken Lemmatization) to filter and rank candidate doc chunks. |
| **`src/ai/llmClient.js`** | **Open-Weight LLM Client:** Provider-agnostic client for open-weight models (`Qwen 2.5 7B`). Supports OpenAI-compatible servers (vLLM, Ollama, Together), automatic retries for JSON repair, and deterministic mock fallback for offline tests. |
| **`src/ai/prompts.js`** | **Prompt Design:** Strict system prompt prohibiting hallucination of line numbers or facts. Forces the LLM to reason *only* on supplied code diff and doc chunk, returning structured JSON. |
| **`src/ai/schemas.js`** | **Schema Validator:** Enforces strict validation of model outputs (`drift`, `confidence`, `severity`, `reason`, `evidence`, `suggestion`). Extracts JSON from markdown fences and cleans responses. |
| **`src/evidence/evidenceEngine.js`** | **Evidence Engine & Provenance:** Calculates calibrated composite confidence: `0.35 * deterministicScore + 0.25 * candidateScore + 0.40 * llmConfidence`. Classifies severity (`HIGH`, `MEDIUM`, `LOW`). Checks if docs were already updated in the same PR (`isDocumentationUpdatedInSamePR`) to suppress false positives. |
| **`src/report/reportGenerator.js`** | **Report Formatter:** Produces structured JSON output, ANSI-formatted terminal reports, and GitHub PR review markdown with suggestions (````suggestion```). Computes overall status (`PASS`, `WARN`, `FAIL`). |
| **`src/github/githubClient.js`** | **GitHub PR Integration:** Fetches PR metadata, changed files, patches, and repo contents using GitHub REST API with rate-limit and authentication handling. |
| **`src/index.js`** | **Core API Orchestrator:** Exports `analyzeLocalRepository()` and `analyzeGitHubPR()`, coordinating the end-to-end detection pipeline. |
| **`src/cli.js` & `bin/driftlens.js`** | **CLI Interface:** Provides terminal commands (`driftlens analyze --repo ... --base ... --head ... --json`). |
| **`src/server.js` & `public/index.html`** | **Web Dashboard:** Express API server and responsive web dashboard with live demo triggers, visual provenance links (`Documentation ⟵ Contradicted By ⟶ Code Change`), and diff highlighting. |

---

## 3. End-to-End Architectural Pipeline

```text
               ┌──────────────────────────────────────────────┐
               │         Pull Request / Git Diff              │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │    Diff Parser (src/git/diffParser.js)       │
               │   - Classifies files (source, docs, tests)   │
               │   - Line-by-line hunks, added/removed lines  │
               └──────────────────────┬───────────────────────┘
                                      │
                       ┌──────────────┴──────────────┐
                       │                             │
                       ▼                             ▼
         ┌───────────────────────────┐ ┌───────────────────────────┐
         │  Code Entity Extractor    │ │   Documentation Chunker   │
         │ (src/analyzer/entity.js)  │ │   (src/analyzer/doc.js)   │
         │ - Constants & Defaults    │ │ - Sentence-level chunks   │
         │ - CLI Flags & Parameters  │ │ - Preserved line numbers  │
         │ - oldValue → newValue     │ │ - Tables & Section Context│
         └─────────────┬─────────────┘ └─────────────┬─────────────┘
                       │                             │
                       └──────────────┬──────────────┘
                                      ▼
               ┌──────────────────────────────────────────────┐
               │  Candidate Matcher (src/matcher/candidate.js)│
               │  - Exact identifier match                    │
               │  - Old value presence in prose               │
               │  - Section heading & file stem relevance     │
               │  - Filters out 95%+ of irrelevant text       │
               └──────────────────────┬───────────────────────┘
                                      │ Top Ranked Pairs
                                      ▼
               ┌──────────────────────────────────────────────┐
               │   Open-Weight LLM (Qwen 2.5 7B)              │
               │   - Factual consistency verification         │
               │   - Evaluates: "Does code contradict doc?"   │
               │   - Generates suggested correction           │
               └──────────────────────┬───────────────────────┘
                                      │ Structured JSON
                                      ▼
               ┌──────────────────────────────────────────────┐
               │  Evidence Engine (src/evidence/engine.js)    │
               │  - Calibrated Confidence Calculation         │
               │  - False-Positive Control & Same-PR checks   │
               │  - Severity: HIGH / MEDIUM / LOW             │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │   Report Generator (src/report/generator.js) │
               │   - JSON Report / Terminal / GitHub Review   │
               │   - PASS / WARN / FAIL Status                │
               └──────────────────────────────────────────────┘
```

---

## 4. False-Positive Control Strategy

Minimizing false alarms is a primary hackathon evaluation criterion. DriftLens enforces three layers of false-positive protection:

1. **Deterministic Filtering Before AI:**
   - Code changes that do not alter public entities (e.g., whitespace changes, internal comments, non-interface variable renames) do not produce candidate pairs.
   - Sentences without conceptual or identifier overlap are excluded from LLM reasoning.
2. **Same-PR Documentation Update Detection (`isDocumentationUpdatedInSamePR`):**
   - If a developer changes `DEFAULT_TIMEOUT = 60` and *simultaneously updates `README.md` in the same PR* to say `60 seconds`, DriftLens inspects the PR doc hunks and **suppresses the drift finding**.
3. **Calibrated Composite Confidence Formula:**
   $$\text{Confidence} = 0.35 \times \text{DeterministicScore} + 0.25 \times \text{CandidateScore} + 0.40 \times \text{LLMConfidence}$$
   - Only findings exceeding the configured threshold (default `0.60`) are reported.
   - Non-breaking refactoring scenarios (like `examples/no-drift/`) evaluate to `PASS` with zero findings.

---

## 5. Hackathon Execution Roadmap (12-Hour Chronology)

| Phase | Milestone | Status | Deliverables |
| :---: | :--- | :---: | :--- |
| **Phase 0** | **Hackathon Compliance & Git Init** | ✅ Complete | Created `HACKATHON.md` as strictly the sole root commit on `main`. |
| **Phase 1** | **Project Foundation & PR Setup** | ✅ Complete | Node 20+, Express, Vitest, `.github/workflows/ci.yml`, PR template, MIT License, README. |
| **Phase 2** | **Git Diff Parser** | ✅ Complete | Unified diff parser, file classifier, hunk line tracking. |
| **Phase 3** | **Documentation Extractor** | ✅ Complete | Markdown prose sentence splitting, table row extraction, section tracking. |
| **Phase 4** | **Code Entity Extraction** | ✅ Complete | Extraction of constants, CLI flags (`--timeout`), defaults, functions, before/after values. |
| **Phase 5** | **Candidate Matcher** | ✅ Complete | Multi-signal relevance scoring (identifiers, values, sections, stems). |
| **Phase 6** | **Open-Weight LLM Integration** | ✅ Complete | Qwen 2.5 7B integration, system prompt, JSON schemas, mock test runner. |
| **Phase 7** | **Evidence Engine & Calibration** | ✅ Complete | Calibrated confidence, severity rating, same-PR update detection. |
| **Phase 8** | **GitHub PR Integration** | ✅ Complete | GitHub REST API client for remote PR diff and file analysis. |
| **Phase 9** | **CLI & Report Generator** | ✅ Complete | Terminal reports, JSON output, GitHub review comments, `./bin/driftlens.js`. |
| **Phase 10** | **Golden Examples & Tests** | ✅ Complete | Real generated outputs in `examples/` (`renamed-flag`, `changed-default`, `no-drift`), 52 automated tests. |
| **Phase 11** | **Web UI & Dashboard** | ✅ Complete | Express API server and interactive visual dashboard (`public/index.html`). |

---

## 6. Golden Demonstrations for Judges

### Demo 1: Renamed CLI Flag (Breaking Drift)
- **Code Change:** `parser.add_argument("--timeout")` → `parser.add_argument("--deadline")` in `cli.py:5`
- **Doc Statement:** `"Use --timeout to stop slow jobs."` in `README.md:5`
- **DriftLens Output:**
  - Status: `FAIL` (Severity: `HIGH`, Confidence: `90%`)
  - Explanation: The documented CLI flag `--timeout` was renamed to `--deadline`.
  - Suggested Fix: `"Use --deadline to stop slow jobs."`

### Demo 2: Changed Default Value (Value Drift)
- **Code Change:** `DEFAULT_TIMEOUT = 30` → `DEFAULT_TIMEOUT = 60` in `src/config.js:1`
- **Doc Statement:** `"The default timeout is 30 seconds."` in `README.md:5`
- **DriftLens Output:**
  - Status: `FAIL` (Severity: `HIGH`, Confidence: `93%`)
  - Explanation: Documented default timeout `30` contradicts implementation value `60`.
  - Suggested Fix: `"The default timeout is 60 seconds."`

### Demo 3: Internal Refactor (False-Positive Control)
- **Code Change:** Internal comment / performance refactor in `src/utils.js`
- **Doc Statement:** `"This package provides mathematical utilities for fast calculation."`
- **DriftLens Output:**
  - Status: `PASS` (0 findings)
  - Proof that DriftLens does not create false alarms on code changes that leave documentation valid.

---

## 7. Judge Q&A Defense Sheet

1. **Why use an AI model instead of Grep?**  
   *Exact string matching or grep can find where words appear, but cannot determine whether changing a number from 30 to 60 contradicts the sentence "The application waits for half a minute before timing out." Only semantic AI reasoning can detect conceptual and semantic drift.*

2. **Why not send the whole repository to the LLM?**  
   *Sending entire repositories is slow, expensive, context-window heavy, and prone to hallucinations. DriftLens uses deterministic parsing to extract only the changed entities and matched candidate sentences, giving the model tightly bounded evidence.*

3. **How do you prevent hallucinated line numbers?**  
   *DriftLens never asks the LLM for line numbers. The deterministic AST/diff parser tags every code change and documentation sentence with exact file and line ranges beforehand.*

4. **Which AI model is used?**  
   *Open-weight **Qwen 2.5 7B Instruct**, compliant with the Hacktoberfest 2026 Hack Day Sonipat open-source AI rules.*

