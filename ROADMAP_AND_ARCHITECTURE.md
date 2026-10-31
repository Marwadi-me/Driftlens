# DriftLens — Architecture & Implementation Roadmap

> **Tagline:** *"Catch the documentation a code change just made wrong."*  
> **Problem:** Problem 5 — Automated Documentation Drift Detection  
> **Category:** Developer Experience | Documentation Engineering | Static Analysis  
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

## 2. Research Starting Points & Existing Tools Comparison

| Tool / Research Project | Target Scope | Mechanism | Limitation Addressed by DriftLens |
| :--- | :--- | :--- | :--- |
| **Python `doctest`** | Code block verification | Executes Python code blocks inside docstrings and asserts stdout. | Cannot evaluate prose explanations, configuration tables, markdown tutorials, or CLI flags described in text. |
| **`rustdoc` tests** | Rust example testing | Compiles and runs ````rust code blocks in documentation. | Limited strictly to executable Rust code. Cannot detect if prose statements contradict configuration. |
| **`mktestdocs`** | Markdown code runner | Runs pytest against markdown code fences. | Only tests executable code snippets; blind to outdated prose defaults or renamed parameters. |
| **`Doc Detective`** | UI & API doc testing | Tests executable actions against live apps. | Requires complex environment setup; cannot reason about semantic contradiction in PR diffs. |
| **DriftLens (Ours)** | **Prose & Semantic Drift Detection** | Hybrid: Deterministic AST entity extraction + sentence-level chunking + open-weight LLM reasoning. | **Detects factual contradictions in prose, tables, and instructions before code is merged.** |

---

## 3. Component Breakdown: "Which Part Works for Which Thing"

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
| **`src/git/diffParser.js`** | **Diff Parser & File Classifier:** Parses unified diffs (`git diff` and GitHub PR patches) into structured file objects with line-by-line hunks, exact line offsets, additions, deletions, and classifies files into `source`, `documentation`, `tests`, `configuration`, or `binary`. Gracefully handles shallow clones. |
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

## 4. Addressing the 5 Key Technical Considerations

### 1. Connecting Documentation Sentences to Source Code
DriftLens decomposes documentation down to sentence-level chunks with line numbers, file paths, and section headings. It pairs them with changed code entities using multi-signal scoring (tokenized identifiers, value matches, section semantics, file stem alignment).

### 2. Identifying Indirect Relationships
DriftLens breaks identifiers into subwords (e.g. `DEFAULT_TIMEOUT` -> `time`, `out`) and applies stemming (`timing out` -> `time`). The LLM then reasons about conceptual equivalence (e.g. "waits for 30 seconds" contradicting `DEFAULT_TIMEOUT = 60`).

### 3. Minimizing False Alarms
- Deterministic diff analysis ignores non-functional edits (whitespace, formatting, private internal variable renaming).
- The candidate matcher filters out >95% of unrelated documentation.
- The composite confidence formula requires strong agreement between deterministic evidence and LLM reasoning.

### 4. Distinguishing Maintenance Changes from Breaking Drift
When a PR updates both code and documentation (`isDocumentationUpdatedInSamePR`), DriftLens inspects the documentation hunk additions. If the new value or flag is already documented in the PR, DriftLens recognizes the proactive update and **suppresses the drift warning**.

### 5. Remaining Useful Without Generating Spam
DriftLens ranks findings by severity (`HIGH`, `MEDIUM`, `LOW`) and suppresses any finding below `0.60` confidence. It generates structured JSON, concise terminal summaries, or focused GitHub Suggestions.

---

## 5. End-to-End Architectural Pipeline

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

## 6. Evaluation Scenarios Walkthrough (Pre-Correction Detection)

Organizers evaluate tools on real project histories containing code changes followed shortly afterward by corrective documentation commits.

**Evaluation Execution:**
```bash
# Analyze PR/commit where code changed before documentation was updated
driftlens analyze --repo <repo-path> --base <before-code-change> --head <code-change-commit>
```

**Golden Demonstration Cases:**

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
- **Code Change:** Internal calculation refactor in `src/utils.js`
- **Doc Statement:** `"This package provides mathematical utilities for fast calculation."`
- **DriftLens Output:**
  - Status: `PASS` (0 findings)
  - Proves that DriftLens does not create false alarms on code changes that leave documentation valid.

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
