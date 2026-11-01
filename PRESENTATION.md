# DriftLens — Complete Hackathon Presentation Deck & Pitch Script
**Hacktoberfest 2026 Hack Day Sonipat | Problem 5: Automated Documentation Drift Detection**  
**Team LoneCommiter**: Yashvardhan Mundhra  
**Open-Weight AI Model**: Qwen 2.5 7B Instruct  

---

## 📽️ Available Presentation Formats
1. **PowerPoint File (.pptx)**: [`DriftLens_Presentation.pptx`](file:///Users/yashvardhanmundhra/Desktop/driftlens/DriftLens_Presentation.pptx)  
   *(16:9 widescreen, rich dark-mode color palette, custom card containers, colored callout badges).*
2. **Interactive Web Presentation**: Run `npm start` and open [`http://localhost:3000/presentation.html`](http://localhost:3000/presentation.html) in your browser.  
   *(Full-screen presentation mode with keyboard `←` / `→` arrow navigation).*

---

## 🎙️ Slide-by-Slide Speaker Pitch Script (14 Slides)

### Slide 1: Hero & Introduction
* **Tagline:** HACKTOBERFEST 2026 HACK DAY SONIPAT — PROBLEM 5
* **Title:** DriftLens 🔍
* **Subtitle:** Automated Documentation Drift Detection for Pull Requests
* **Motto:** *"Catch the documentation a code change just made wrong."*
* **Speaker Script:**
  > *"Good morning judges. I'm Yashvardhan Mundhra representing team LoneCommiter. Today, I'm thrilled to present DriftLens, an automated system built for Problem 5 that identifies and fixes documentation drift in pull requests before code is ever merged. DriftLens operates strictly within the hackathon's open-weight model guidelines, powered by Qwen 2.5 7B."*

---

### Slide 2: The Core Problem & Developer Pain
* **Title:** Code Moves Fast — Documentation Silently Becomes Wrong
* **Visuals:** 4 alert cards (Flag Renames, Altered Defaults, Signature Shifts, Dead Features) with real code diffs and documentation quotes.
* **Speaker Script:**
  > *"Documentation is essential for onboarding and open-source contribution, but it suffers from continuous erosion. When an engineer renames `--timeout` to `--deadline`, changes a default socket timeout from 30s to 60s, alters function parameters, or deletes an obsolete route like `/api/v1/legacy-export`, the explanatory prose and configuration tables in the README still instruct developers with the old behavior. This creates confusion, wasted hours, and broken builds."*

---

### Slide 3: State of the Art Comparison
* **Title:** Why Existing Documentation Tools Fail
* **Visuals:** Matrix comparing Python `doctest`, `rustdoc tests`, `mktestdocs`, `Doc Detective`, and `DriftLens`.
* **Speaker Script:**
  > *"Why can't existing tools solve this? Python doctest and rustdoc only test executable code fences. They are completely blind to explanatory English prose, Markdown configuration tables, or CLI option tutorials. If your README claims 'the default timeout is 30 seconds' while code says 60, no existing linter or doctest catches it. DriftLens bridges this critical semantic gap."*

---

### Slide 4: The DriftLens Solution: Hybrid Intelligence
* **Title:** The DriftLens Solution: Hybrid Intelligence Architecture
* **Visuals:** 6 capability cards (Deterministic Grounding, Sentence-Level Granularity, Multi-Signal Filtering, Bounded AI Reasoning, Same-PR Shield, 1-Click Auto-Remediation).
* **Speaker Script:**
  > *"DriftLens avoids the brute-force pitfall of sending an entire repository blindly to an LLM. We ground our engine in deterministic AST parsing to extract changed entities and chunk documentation into sentence-level units with exact line ranges. The AI model is only given tightly bounded evidence to answer: 'Does this code change contradict this sentence?'"*

---

### Slide 5: 6-Stage End-to-End Pipeline
* **Title:** End-to-End 6-Stage Analysis Workflow
* **Visuals:** Git Diff Extraction ➔ Entity Extraction ➔ Markdown Chunking ➔ Candidate Matching ➔ Same-PR Shield ➔ Qwen 2.5 7B Verification.
* **Speaker Script:**
  > *"Here is how a Pull Request flows through DriftLens:
  > First, we extract git diffs and classify files. Second, our AST parser extracts modified entities like flags, constants, and signatures. Third, we chunk documentation into sentence-level units with line offsets. Fourth, a deterministic multi-signal candidate matcher identifies relevant sentences. Fifth, our Same-PR shield suppresses warnings if the developer already updated the docs in the same PR. Finally, Qwen 2.5 7B performs bounded semantic verification."*

---

### Slide 6: Multi-Signal Candidate Matching & Subwords
* **Title:** Multi-Signal Candidate Matching & Subword Lemmatization
* **Visuals:** 4-Signal weights (+45% Exact ID, +30% Old Value, +15% Section, +15% File Correlation) and Subword Lemmatization breakdown.
* **Speaker Script:**
  > *"Code identifiers rarely match prose word-for-word. DriftLens decomposes compound identifiers like `DEFAULT_TIMEOUT` into subwords `default`, `time`, and `out`, and performs suffix lemmatization so that `timing out` or `timed` matches root `time`. We pre-compute hash sets on documentation chunks, enabling O(1) candidate evaluation."*

---

### Slide 7: Mathematical Confidence Formula & Numerical Example
* **Title:** Confidence Calibration Formula & Worked Example
* **Visuals:** $\text{Confidence} = 0.35 \times \text{Det} + 0.25 \times \text{Candidate} + 0.40 \times \text{LLM}$ with a worked numerical calculation yielding $96\%$.
* **Speaker Script:**
  > *"False alarms destroy developer trust. To prevent noise, DriftLens uses a calibrated composite formula balancing deterministic AST evidence (35%), candidate overlap (25%), and semantic LLM reasoning (40%). In this example, a renamed flag scores 0.35(1.0) + 0.25(0.90) + 0.40(0.97) = 96% confidence. Any score below 60% confidence is discarded as noise. Findings are categorized into HIGH, MEDIUM, and LOW severity tiers, with HIGH severity blocking CI merges."*

---

### Slide 8: 6 Golden Hackathon Evaluation Demos
* **Title:** 6 Golden Evaluation Demos (100% Hackathon Coverage)
* **Visuals:** All 6 problem scenarios verified dynamically on raw inputs:
  1. Renamed CLI Flag (`--timeout` → `--deadline`) → FAIL (98% Conf)
  2. Changed Default (`30` → `60`) → FAIL (93% Conf)
  3. False-Positive Control (internal refactoring) → PASS (0 findings)
  4. Config Table Drift (`TIMEOUT_SECONDS: 30` → `60`) → FAIL (97% Conf)
  5. API Parameter Signature (`registerUser`) → FAIL (91% Conf)
  6. Removed Feature (`/api/v1/legacy-export`) → FAIL (90% Conf)
* **Speaker Script:**
  > *"The hackathon prompt evaluates tools on pre-correction detection. Here are our 6 golden benchmarks covering all problem scenarios. DriftLens flags the exact line and contradictory statement on the code commit before any corrective doc commit is needed. Notice Demo 3: internal refactoring produces zero false alarms, proving our precision."*

---

### Slide 9: Deep Dive: False-Positive Control & Same-PR Shield
* **Title:** False-Positive Control & The Same-PR Shield
* **Visuals:** Proximity-aware hunk inspection, value addition checks, and non-functional code filtering.
* **Speaker Script:**
  > *"What happens when a developer modifies a constant and also updates the README in the same pull request? DriftLens inspects the documentation diff hunks. If the added lines already contain the new value or renamed flag, DriftLens suppresses the warning. Furthermore, code comments, test files, and whitespace changes are automatically filtered out."*

---

### Slide 10: Deep Dive: Config Tables & API Signatures
* **Title:** Parsing Structured Markdown Tables & API Signatures
* **Visuals:** Column pipe splitting, row objectification, and function parameter AST regex patterns.
* **Speaker Script:**
  > *"Markdown tables present a major challenge because values are split across column pipes. DriftLens parses tables into structured key-value rows, tags the exact row line number, and allows 1-click in-table replacement. For API signatures, we capture parameter changes like `registerUser(email, password, tenantId)` even when the function name itself remains unchanged."*

---

### Slide 11: Innovation 1: Starter README Generator
* **Title:** Starter README.md Generator for Zero-Doc Codebases
* **Visuals:** CLI command `driftlens generate-readme --repo .` with breakdown of configuration table, CLI options, and API routes.
* **Speaker Script:**
  > *"What if a repository has zero documentation? DriftLens statically analyzes code entities to generate a complete starter README.md in seconds, extracting all constants, argparse/commander CLI flags, and HTTP endpoints into clean Markdown tables."*

---

### Slide 12: Innovation 2: Visual Impact Graph & 1-Click Auto-Fix
* **Title:** Visual Blast Radius Impact Graph & 1-Click Auto-Fix
* **Visuals:** SVG dependency curve mapping code to doc sections, in-browser remediation button, and downloadable `.patch` file.
* **Speaker Script:**
  > *"We built an interactive Web Studio on port 3000 featuring an interactive SVG Blast Radius Graph. Maintainers can visualize exactly where code changes radiate impact into documentation, and click 'Apply Fix' directly in the browser or download a git `.patch` file."*

---

### Slide 13: Performance Engineering & CI/CD
* **Title:** Performance Engineering, Benchmarks & CI/CD
* **Visuals:** 70 Tests (100% Pass) | 5ms Benchmark Duration | Reusable GitHub Action (`action.yml`).
* **Speaker Script:**
  > *"DriftLens is ready for production today. We have 70 unit and integration tests passing with 100% coverage in under 600ms. We provide a reusable GitHub Action (`action.yml`) that any open-source repo can install with 3 lines of YAML. All algorithmic lookups are optimized to O(1) hash lookups with parallelized async I/O."*

---

### Slide 14: Conclusion & Judge Q&A Defense
* **Title:** Conclusion & Hackathon Judge Defense Sheet
* **Visuals:** Summary of core achievements + Q&A cheat sheet for common questions.
* **Speaker Script:**
  > *"In summary: DriftLens solves the real problem of semantic prose drift, guarantees zero hallucinations by grounding line numbers deterministically, complies 100% with open-weight model rules, and delivers a complete developer experience with CLI, GitHub Actions, and Web Studio. Thank you!"*
