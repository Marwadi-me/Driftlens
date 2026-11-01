import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Initialize 16:9 Presentation
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

# Vibrant Modern Tech Color Palette
BG_DARK       = RGBColor(11, 15, 25)     # Deep space dark #0B0F19
BG_GRAD_END   = RGBColor(17, 24, 39)     # Dark slate #111827
CARD_BG_NAVY  = RGBColor(18, 26, 44)     # Deep navy card #121A2C
CARD_BG_BLUE  = RGBColor(15, 29, 56)     # Blue tint card
CARD_BG_PURPLE= RGBColor(26, 20, 51)     # Purple tint card
CARD_BG_GREEN = RGBColor(13, 38, 32)     # Emerald tint card
CARD_BG_AMBER = RGBColor(38, 30, 15)     # Amber tint card
CARD_BG_ROSE  = RGBColor(40, 18, 28)     # Rose tint card

BORDER_DEFAULT= RGBColor(36, 48, 74)     # Default card border
CYAN          = RGBColor(56, 189, 248)   # Electric Cyan #38BDF8
PURPLE        = RGBColor(168, 85, 247)   # Electric Purple #A855F7
INDIGO        = RGBColor(129, 140, 248)  # Indigo #818CF8
EMERALD       = RGBColor(16, 185, 129)   # Emerald Green #10B981
AMBER         = RGBColor(245, 158, 11)   # Sunset Amber #F59E0B
ROSE          = RGBColor(244, 63, 94)    # Hot Coral / Rose #F43F5E
WHITE         = RGBColor(248, 250, 252)  # White #F8FAFC
SLATE_LIGHT   = RGBColor(203, 213, 225)  # Light slate #CBD5E1
SLATE_MUTED   = RGBColor(148, 163, 184)  # Muted slate #94A3B8

def add_slide_background(slide):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_DARK
    bg.line.fill.background()

    # Top accent bar (gradient illusion with cyan & purple)
    bar1 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(6.666), Inches(0.06))
    bar1.fill.solid()
    bar1.fill.fore_color.rgb = CYAN
    bar1.line.fill.background()

    bar2 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.666), 0, Inches(6.667), Inches(0.06))
    bar2.fill.solid()
    bar2.fill.fore_color.rgb = PURPLE
    bar2.line.fill.background()
    return slide

def create_header(slide, tag_text, title_text, subtitle_text=None):
    add_slide_background(slide)

    # Category Pill Tag
    tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.42), Inches(11.5), Inches(0.35))
    tf_tag = tag_box.text_frame
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = tag_text.upper()
    p_tag.font.name = "Arial"
    p_tag.font.size = Pt(10.5)
    p_tag.font.bold = True
    p_tag.font.color.rgb = CYAN

    # Main Title
    t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.72), Inches(11.7), Inches(0.75))
    tf_t = t_box.text_frame
    tf_t.word_wrap = True
    p_t = tf_t.paragraphs[0]
    p_t.text = title_text
    p_t.font.name = "Arial"
    p_t.font.size = Pt(26)
    p_t.font.bold = True
    p_t.font.color.rgb = WHITE

    if subtitle_text:
        p_sub = tf_t.add_paragraph()
        p_sub.text = subtitle_text
        p_sub.font.name = "Arial"
        p_sub.font.size = Pt(13)
        p_sub.font.color.rgb = SLATE_MUTED
        p_sub.space_before = Pt(3)

def add_card(slide, left, top, width, height, bg_color=CARD_BG_NAVY, border_color=BORDER_DEFAULT, border_width=1.2):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    card.line.color.rgb = border_color
    card.line.width = Pt(border_width)
    return card

# ==============================================================================
# SLIDE 1: Title / Hero Slide
# ==============================================================================
s1 = prs.slides.add_slide(blank_layout)
add_slide_background(s1)

# Badge Pill
pill = add_card(s1, 0.8, 0.8, 6.0, 0.42, CARD_BG_BLUE, CYAN, 1.5)
pt = pill.text_frame.paragraphs[0]
pt.text = "⚡ HACKTOBERFEST 2026 HACK DAY SONIPAT — PROBLEM 5"
pt.font.name = "Arial"
pt.font.size = Pt(11)
pt.font.bold = True
pt.font.color.rgb = CYAN
pt.alignment = PP_ALIGN.CENTER

# Main Title & Subtitle
t_box = s1.shapes.add_textbox(Inches(0.8), Inches(1.4), Inches(11.7), Inches(2.2))
tf = t_box.text_frame
p1 = tf.paragraphs[0]
p1.text = "DriftLens 🔍"
p1.font.name = "Arial"
p1.font.size = Pt(46)
p1.font.bold = True
p1.font.color.rgb = WHITE

p2 = tf.add_paragraph()
p2.text = "Automated Documentation Drift Detection for Pull Requests"
p2.font.name = "Arial"
p2.font.size = Pt(23)
p2.font.bold = True
p2.font.color.rgb = CYAN
p2.space_before = Pt(6)

p3 = tf.add_paragraph()
p3.text = '"Catch the documentation a code change just made wrong."'
p3.font.name = "Arial"
p3.font.size = Pt(16)
p3.font.italic = True
p3.font.color.rgb = SLATE_LIGHT
p3.space_before = Pt(8)

# 3 Feature / Team Cards
# Card 1: Team Info
c1 = add_card(s1, 0.8, 4.0, 3.7, 2.7, CARD_BG_GREEN, EMERALD, 1.5)
ctf1 = c1.text_frame
ctf1.word_wrap = True
p = ctf1.paragraphs[0]
p.text = "👤 TEAM LONECOMMITER"
p.font.bold = True
p.font.size = Pt(14)
p.font.color.rgb = EMERALD
p = ctf1.add_paragraph()
p.text = "• Solo Developer: Yashvardhan Mundhra\n• Track: Developer Experience / Static Analysis\n• Repository: github.com/Marwadi-me/Driftlens\n• Focus: Factual Pre-Correction Detection"
p.font.size = Pt(12)
p.font.color.rgb = WHITE
p.space_before = Pt(8)

# Card 2: AI Model
c2 = add_card(s1, 4.8, 4.0, 3.7, 2.7, CARD_BG_PURPLE, PURPLE, 1.5)
ctf2 = c2.text_frame
ctf2.word_wrap = True
p = ctf2.paragraphs[0]
p.text = "🤖 OPEN-WEIGHT AI ENGINE"
p.font.bold = True
p.font.size = Pt(14)
p.font.color.rgb = PURPLE
p = ctf2.add_paragraph()
p.text = "• Model: Qwen 2.5 7B Instruct\n• 100% Hackathon Rule Compliant\n• Zero proprietary closed APIs (No GPT/Claude)\n• OpenAI-compatible vLLM/Ollama local runner\n• Bounded reasoning over deterministic AST"
p.font.size = Pt(12)
p.font.color.rgb = WHITE
p.space_before = Pt(8)

# Card 3: Metrics & Deliverables
c3 = add_card(s1, 8.8, 4.0, 3.7, 2.7, CARD_BG_AMBER, AMBER, 1.5)
ctf3 = c3.text_frame
ctf3.word_wrap = True
p = ctf3.paragraphs[0]
p.text = "🚀 PRODUCTION DELIVERABLES"
p.font.bold = True
p.font.size = Pt(14)
p.font.color.rgb = AMBER
p = ctf3.add_paragraph()
p.text = "• CLI Tool & Reusable GitHub Action\n• Interactive Studio with SVG Impact Graph\n• 1-Click Auto-Fix & .patch Downloader\n• Starter README Generator for Zero-Doc repos\n• 70 Unit & Integration Tests (100% Passing)"
p.font.size = Pt(12)
p.font.color.rgb = WHITE
p.space_before = Pt(8)


# ==============================================================================
# SLIDE 2: The Core Problem & Developer Pain
# ==============================================================================
s2 = prs.slides.add_slide(blank_layout)
create_header(s2, "The Real-World Dilemma", "Code Moves Fast — Documentation Silently Becomes Wrong", 
              "Every day, pull requests introduce code changes that invalidate explanatory prose, configuration tables, and API tutorials.")

issues = [
    ("Flag Renames & Obsolete CLI Guides", "A CLI flag is renamed (--timeout -> --deadline), but documentation still instructs developers to invoke the obsolete flag.", "CLI argument parsing: parser.add_argument('--deadline')\nREADME.md: Use --timeout to terminate slow jobs.", ROSE, CARD_BG_ROSE),
    ("Altered Defaults & Outdated Config Tables", "A default timeout increases from 30s to 60s in code, but configuration tables in Markdown continue displaying 30s.", "src/config.js: export const DEFAULT_TIMEOUT = 60;\ndocs/config.md: | DEFAULT_TIMEOUT | 30 | Seconds |", AMBER, CARD_BG_AMBER),
    ("Modified Signatures & Broken Tutorials", "An API function parameter is added or reordered, yet tutorial code blocks and integration prose explain the legacy signature.", "src/api.js: registerUser(email, password, tenantId)\nREADME: call registerUser(email, password) to sign up.", PURPLE, CARD_BG_PURPLE),
    ("Deleted Features & Zombie Documentation", "An obsolete HTTP endpoint (/api/v1/legacy-export) is removed from the codebase, but remains documented as active.", "src/routes.js: Route deleted in PR\nREADME.md: Use /api/v1/legacy-export to export data.", CYAN, CARD_BG_BLUE)
]

for idx, (head, desc, code, col, bg_col) in enumerate(issues):
    row = idx // 2
    col_idx = idx % 2
    x = 0.8 + col_idx * 5.9
    y = 1.7 + row * 2.6
    card = add_card(s2, x, y, 5.7, 2.4, bg_col, col, 1.2)
    ctf = card.text_frame
    ctf.word_wrap = True
    p = ctf.paragraphs[0]
    p.text = f"⚠️ {head}"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = col
    p = ctf.add_paragraph()
    p.text = desc
    p.font.size = Pt(12)
    p.font.color.rgb = WHITE
    p.space_before = Pt(4)
    p = ctf.add_paragraph()
    p.text = code
    p.font.name = "Consolas"
    p.font.size = Pt(10)
    p.font.color.rgb = SLATE_LIGHT
    p.space_before = Pt(6)


# ==============================================================================
# SLIDE 3: Competitive Matrix: Why Existing Tools Fail
# ==============================================================================
s3 = prs.slides.add_slide(blank_layout)
create_header(s3, "State of the Art Comparison", "Why Existing Documentation Testing Tools Fail",
              "Existing solutions only validate executable snippets. DriftLens bridges the semantic prose divide.")

table_shape = s3.shapes.add_table(6, 4, Inches(0.8), Inches(1.8), Inches(11.7), Inches(5.0))
t = table_shape.table
t.columns[0].width = Inches(2.2)
t.columns[1].width = Inches(2.3)
t.columns[2].width = Inches(4.2)
t.columns[3].width = Inches(3.0)

headers = ["Tool / Technology", "Primary Scope", "How It Operates", "Why It Fails on Problem 5"]
for idx, h in enumerate(headers):
    cell = t.cell(0, idx)
    cell.fill.solid()
    cell.fill.fore_color.rgb = RGBColor(26, 38, 64)
    p = cell.text_frame.paragraphs[0]
    p.text = h
    p.font.bold = True
    p.font.size = Pt(13)
    p.font.color.rgb = CYAN

matrix = [
    ("Python doctest", "Docstring snippets", "Executes interactive Python code blocks inside docstrings.", "Cannot test Markdown prose, config tables, CLI flags, or external tutorials."),
    ("rustdoc tests", "Rust code fences", "Compiles and executes ```rust code blocks embedded in doc comments.", "Strictly limited to executable Rust code. Completely blind to explanatory English prose."),
    ("mktestdocs", "Markdown runner", "Executes code fences inside Markdown via pytest runner.", "Only tests executable code snippets; blind to outdated prose defaults or renamed parameters."),
    ("Doc Detective", "End-to-end UI tests", "Executes recorded browser actions and REST queries against live apps.", "Requires live deployed infrastructure; unable to reason about PR diff contradictions."),
    ("DriftLens (Ours) 🏆", "Semantic Prose & Table Drift", "Deterministic AST entity extraction + Markdown chunking + Qwen 2.5 7B reasoning.", "Directly links PR code diffs to prose sentences and flags factual drift before merge.")
]

for row_idx, r in enumerate(matrix, start=1):
    is_driftlens = (row_idx == 5)
    for col_idx, text in enumerate(r):
        cell = t.cell(row_idx, col_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = RGBColor(18, 48, 42) if is_driftlens else (CARD_BG_NAVY if row_idx % 2 == 1 else RGBColor(14, 20, 34))
        p = cell.text_frame.paragraphs[0]
        p.text = text
        p.font.size = Pt(11.5)
        p.font.color.rgb = EMERALD if is_driftlens else WHITE
        if col_idx == 0:
            p.font.bold = True


# ==============================================================================
# SLIDE 4: The DriftLens Solution: Hybrid Intelligence
# ==============================================================================
s4 = prs.slides.add_slide(blank_layout)
create_header(s4, "System Philosophy", "The DriftLens Solution: Hybrid Intelligence Architecture",
              "Never send the entire repository to an LLM. Combine deterministic AST parsing with bounded semantic AI.")

sol_cards = [
    ("1. Deterministic Grounding", "AST/diff parser locates changed code hunks and tags every entity with exact file paths and line ranges. The AI never guesses line numbers.", CYAN, CARD_BG_BLUE),
    ("2. Sentence-Level Granularity", "Documentation is chunked into individual sentence units and table rows with exact line ranges and section hierarchies (## Configuration).", INDIGO, CARD_BG_PURPLE),
    ("3. Multi-Signal Filtering", "Candidate matcher pairs changed entities with sentences using 4 distinct signals (exact names, old values, section keywords, file stems).", EMERALD, CARD_BG_GREEN),
    ("4. Bounded AI Reasoning", "Qwen 2.5 7B evaluates only the tightly bounded pair: 'Does this code change contradict this sentence?' Strict JSON schema enforcement.", PURPLE, CARD_BG_PURPLE),
    ("5. Same-PR Shield", "Detects if the developer already updated the documentation in the same PR. If so, drift is suppressed, achieving zero false alarms.", AMBER, CARD_BG_AMBER),
    ("6. 1-Click Auto-Remediation", "Generates exact replacement suggestions, ready for 1-click in-browser patching or downloadable unified git .patch files.", ROSE, CARD_BG_ROSE)
]

for idx, (title, desc, col, bg_col) in enumerate(sol_cards):
    row = idx // 3
    col_idx = idx % 3
    x = 0.8 + col_idx * 3.9
    y = 1.7 + row * 2.6
    card = add_card(s4, x, y, 3.8, 2.4, bg_col, col, 1.2)
    ctf = card.text_frame
    ctf.word_wrap = True
    p = ctf.paragraphs[0]
    p.text = title
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = col
    p = ctf.add_paragraph()
    p.text = desc
    p.font.size = Pt(12)
    p.font.color.rgb = WHITE
    p.space_before = Pt(8)


# ==============================================================================
# SLIDE 5: 6-Stage End-to-End Pipeline
# ==============================================================================
s5 = prs.slides.add_slide(blank_layout)
create_header(s5, "Architecture Pipeline", "End-to-End 6-Stage Analysis Workflow",
              "How a Pull Request diff flows from raw Git commits into precise, verified documentation drift findings.")

stages = [
    ("Stage 1: Git Diff Extraction", "Runs git diff -U3 base...head or calls GitHub REST API. Classifies files into source, docs, tests, configs. Shallow clone resilient.", CYAN),
    ("Stage 2: Entity Extraction", "Statically extracts changed CLI flags (--timeout -> --deadline), constants, defaults, and API function signatures from diff hunks.", CYAN),
    ("Stage 3: Documentation Chunking", "Indexes all Markdown files in repo. Chunks text into sentence-level units with line offsets, sections, and table rows.", INDIGO),
    ("Stage 4: Multi-Signal Matching", "Scores candidate pairs: Exact Identifier (+45%), Old Value Mention (+30%), Section Relevance (+15%), File Correlation (+15%).", EMERALD),
    ("Stage 5: Same-PR Suppression", "Edge-case shield: If documentation was updated within the same PR hunk, drift is suppressed to prevent false alarms.", AMBER),
    ("Stage 6: Qwen 2.5 7B Verification", "Open-weight model evaluates semantic contradiction. Computes calibrated composite confidence and produces suggested fix.", PURPLE)
]

for idx, (title, desc, col) in enumerate(stages):
    row = idx // 2
    col_idx = idx % 2
    x = 0.8 + col_idx * 5.9
    y = 1.7 + row * 1.75
    card = add_card(s5, x, y, 5.7, 1.6, CARD_BG_NAVY, col, 1.2)
    ctf = card.text_frame
    ctf.word_wrap = True
    p = ctf.paragraphs[0]
    p.text = title
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = col
    p = ctf.add_paragraph()
    p.text = desc
    p.font.size = Pt(11.5)
    p.font.color.rgb = WHITE
    p.space_before = Pt(4)


# ==============================================================================
# SLIDE 6: Multi-Signal Candidate Matching Algorithm
# ==============================================================================
s6 = prs.slides.add_slide(blank_layout)
create_header(s6, "Deterministic Matching", "Multi-Signal Candidate Matching & Subword Lemmatization",
              "Eliminating the need for brute-force LLM evaluation by ranking top relevant sentences deterministically.")

# Left Card: The 4 Signals
c_left = add_card(s6, 0.8, 1.7, 5.7, 5.2, CARD_BG_NAVY, CYAN, 1.5)
ltf = c_left.text_frame
ltf.word_wrap = True
p = ltf.paragraphs[0]
p.text = "🎯 4-Signal Candidate Scoring Model"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = CYAN

signals_data = [
    ("Signal A: Exact Identifier Match (+45%)", "Matches exact flag or constant name (e.g., --timeout, DEFAULT_TIMEOUT) in documentation text."),
    ("Signal B: Old Value Mention (+30%)", "Detects mentions of the previous implementation value (e.g., '30 seconds', '/api/v1/export') using boundary-aware regex."),
    ("Signal C: Section Context (+15%)", "Awards score if sentence appears under relevant headings like 'Configuration', 'CLI Options', 'API Reference'."),
    ("Signal D: File Path Correlation (+15%)", "Matches source file base name (src/config.js) to doc file base name (docs/config.md) or primary README.")
]
for title, desc in signals_data:
    p = ltf.add_paragraph()
    p.text = f"\n{title}"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p = ltf.add_paragraph()
    p.text = desc
    p.font.size = Pt(11.5)
    p.font.color.rgb = SLATE_LIGHT

# Right Card: Subword Tokenization & Lemmatization
c_right = add_card(s6, 6.8, 1.7, 5.7, 5.2, CARD_BG_NAVY, PURPLE, 1.5)
rtf = c_right.text_frame
rtf.word_wrap = True
p = rtf.paragraphs[0]
p.text = "🧩 Subword Tokenization & Root Lemmatization"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = PURPLE

p = rtf.add_paragraph()
p.text = "Code identifiers rarely match prose word-for-word. DriftLens bridges this gap:\n"
p.font.size = Pt(12)
p.font.color.rgb = WHITE

steps = [
    ("Identifier Splitting", "DEFAULT_TIMEOUT -> ['default', 'timeout']"),
    ("Compound Word Decomposition", "'timeout' -> ['time', 'out']\n'filepath' -> ['file', 'path']\n'endpoint' -> ['end', 'point']"),
    ("Suffix Stripping / Stemming", "'timing out', 'times', 'timed' -> root 'time'"),
    ("O(1) Hash Set Lookups", "Pre-computes _wordsSet and _stemsSet on documentation chunks for instantaneous O(1) membership checks.")
]
for title, desc in steps:
    p = rtf.add_paragraph()
    p.text = f"• {title}:"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p = rtf.add_paragraph()
    p.text = desc
    p.font.name = "Consolas"
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_LIGHT
    p.space_before = Pt(1)


# ==============================================================================
# SLIDE 7: Mathematical Confidence Formula & Numerical Example
# ==============================================================================
s7 = prs.slides.add_slide(blank_layout)
create_header(s7, "Mathematical Calibration", "Confidence Calibration Formula & Worked Example",
              "A weighted composite formula balancing deterministic AST facts, candidate overlap, and LLM reasoning.")

# Left Card: Formula & Worked Example
c1 = add_card(s7, 0.8, 1.7, 6.8, 5.2, CARD_BG_BLUE, CYAN, 1.5)
ctf1 = c1.text_frame
ctf1.word_wrap = True
p = ctf1.paragraphs[0]
p.text = "📐 The Composite Confidence Formula"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = CYAN

p = ctf1.add_paragraph()
p.text = "\nConfidence = 0.35 × S_det + 0.25 × S_cand + 0.40 × S_llm\n"
p.font.name = "Consolas"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = EMERALD

p = ctf1.add_paragraph()
p.text = "Worked Numerical Calculation (Renamed Flag Example):\n"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = WHITE

calc_steps = [
    ("S_det = 1.0", "Hard AST shift: CLI flag renamed from '--timeout' to '--deadline'"),
    ("S_cand = 0.90", "Candidate chunk explicitly matches old flag '--timeout' in 'CLI Options'"),
    ("S_llm = 0.97", "Qwen 2.5 7B semantic reasoning confirms direct factual contradiction"),
    ("Result: 0.938 -> 94%", "0.35(1.0) + 0.25(0.90) + 0.40(0.97) = 0.35 + 0.225 + 0.388 = 0.963 -> 96%")
]
for title, desc in calc_steps:
    p = ctf1.add_paragraph()
    p.text = f"• {title}: {desc}"
    p.font.size = Pt(11.5)
    p.font.color.rgb = SLATE_LIGHT
    p.space_before = Pt(3)

p = ctf1.add_paragraph()
p.text = "\n🛡️ Strict 0.60 Confidence Threshold: Scores below 60% are discarded as noise."
p.font.size = Pt(11.5)
p.font.bold = True
p.font.color.rgb = AMBER

# Right Card: Severity Tiers
c2 = add_card(s7, 7.8, 1.7, 4.7, 5.2, CARD_BG_NAVY, AMBER, 1.5)
ctf2 = c2.text_frame
ctf2.word_wrap = True
p = ctf2.paragraphs[0]
p.text = "🚦 Actionable Severity Tiers"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = AMBER

tiers = [
    ("🔴 HIGH SEVERITY (Blocks CI)", "Direct factual contradiction: renamed flag, altered default, or deleted route. Exits with code 1, blocking PR merge.", ROSE),
    ("🟡 MEDIUM SEVERITY (Warning)", "Indirect semantic shift or parameter nuance. Flags PR with non-blocking warning annotation.", AMBER),
    ("⚪ LOW SEVERITY (Info)", "Minor stylistic or contextual documentation suggestions.", CYAN),
    ("🛡️ Zero False Alarm Shield", "If the developer updated the documentation sentence in the same PR, DriftLens detects it and suppresses the finding.", EMERALD)
]
for title, desc, col in tiers:
    p = ctf2.add_paragraph()
    p.text = f"\n{title}"
    p.font.size = Pt(12.5)
    p.font.bold = True
    p.font.color.rgb = col
    p = ctf2.add_paragraph()
    p.text = desc
    p.font.size = Pt(11)
    p.font.color.rgb = WHITE
    p.space_before = Pt(2)


# ==============================================================================
# SLIDE 8: 6 Golden Hackathon Evaluation Demos
# ==============================================================================
s8 = prs.slides.add_slide(blank_layout)
create_header(s8, "Benchmark Verification", "6 Golden Evaluation Demos (100% Hackathon Coverage)",
              "Live dynamic execution against all Problem 5 evaluation categories in < 5ms.")

demos = [
    ("1. Renamed CLI Flag", "cli.py: --timeout -> --deadline\nDoc: 'Use --timeout to stop slow jobs.'\nStatus: FAIL (High, 98% Conf)\nSuggested: 'Use --deadline to stop slow jobs.'", ROSE, CARD_BG_ROSE),
    ("2. Changed Default Value", "config.js: DEFAULT_TIMEOUT = 30 -> 60\nDoc: 'The default timeout is 30 seconds.'\nStatus: FAIL (High, 93% Conf)\nSuggested: 'The default timeout is 60 seconds.'", AMBER, CARD_BG_AMBER),
    ("3. False-Positive Control", "utils.js: Internal math refactor\nDoc: 'Fast calculation utilities'\nStatus: PASS (0 Findings)\nProves: Zero false alarms on refactors!", EMERALD, CARD_BG_GREEN),
    ("4. Config Table Drift", "config.js: TIMEOUT_SECONDS = 30 -> 60\nDoc: | TIMEOUT_SECONDS | 30 | Seconds |\nStatus: FAIL (High, 97% Conf)\nSuggested: Updates table row to 60", CYAN, CARD_BG_BLUE),
    ("5. API Parameter Signature", "api.js: registerUser(email, pass, tenantId)\nDoc: 'call registerUser(email, password)'\nStatus: FAIL (High, 91% Conf)\nSuggested: Updates parameter list", PURPLE, CARD_BG_PURPLE),
    ("6. Deleted Feature / Route", "routes.js: Deleted /api/v1/legacy-export\nDoc: 'Use /api/v1/legacy-export for CSV'\nStatus: FAIL (High, 90% Conf)\nSuggested: Flags obsolete route references", ROSE, CARD_BG_ROSE)
]

for idx, (title, desc, col, bg_col) in enumerate(demos):
    row = idx // 3
    col_idx = idx % 3
    x = 0.8 + col_idx * 3.9
    y = 1.7 + row * 2.6
    card = add_card(s8, x, y, 3.8, 2.4, bg_col, col, 1.2)
    ctf = card.text_frame
    ctf.word_wrap = True
    p = ctf.paragraphs[0]
    p.text = title
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = col
    p = ctf.add_paragraph()
    p.text = desc
    p.font.name = "Consolas"
    p.font.size = Pt(10)
    p.font.color.rgb = WHITE
    p.space_before = Pt(6)


# ==============================================================================
# SLIDE 9: Deep Dive: False-Positive Control & Same-PR Shield
# ==============================================================================
s9 = prs.slides.add_slide(blank_layout)
create_header(s9, "Precision Engineering", "False-Positive Control & The Same-PR Shield",
              "Distinguishing between changes that need documentation updates vs those that are already handled.")

c1 = add_card(s9, 0.8, 1.7, 5.7, 5.2, CARD_BG_GREEN, EMERALD, 1.5)
ctf1 = c1.text_frame
ctf1.word_wrap = True
p = ctf1.paragraphs[0]
p.text = "🛡️ The Same-PR Update Shield"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = EMERALD

p = ctf1.add_paragraph()
p.text = "\nScenario: A conscientious developer bumps DEFAULT_TIMEOUT = 60 and updates README.md to '60 seconds' in the same commit."
p.font.size = Pt(12)
p.font.color.rgb = WHITE

points_shield = [
    ("Hunk-Aware Proximity Inspection", "DriftLens checks whether documentation changes in the PR overlap with the affected sentence lines."),
    ("New Value Verification", "If the added lines in the doc hunk already contain the new value ('60') or renamed flag ('--deadline'), drift is suppressed."),
    ("Sentence Deletion Verification", "If the obsolete statement was removed in the documentation diff, DriftLens acknowledges the fix."),
    ("The Result", "Zero duplicate warnings when developers do their job correctly!")
]
for title, desc in points_shield:
    p = ctf1.add_paragraph()
    p.text = f"\n• {title}:"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p = ctf1.add_paragraph()
    p.text = desc
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_LIGHT

c2 = add_card(s9, 6.8, 1.7, 5.7, 5.2, CARD_BG_NAVY, CYAN, 1.5)
ctf2 = c2.text_frame
ctf2.word_wrap = True
p = ctf2.paragraphs[0]
p.text = "⚡ Non-Functional Code Change Filtering"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = CYAN

points_filter = [
    ("Comments Are Not Entities", "Code comments like '// TODO: change --timeout' are ignored so comments never trigger false drift."),
    ("Whitespace & Formatting Immunity", "Internal code refactorings that preserve entity values (indentation, code cleanups) produce 0 findings."),
    ("Test File Isolation", "Changes inside tests/, *.spec.js, or __tests__/ are automatically categorized as 'tests' and ignored for public documentation drift."),
    ("Strict Value Equality Check", "If removed.value === added.value, the entity is recognized as unchanged and skipped immediately.")
]
for title, desc in points_filter:
    p = ctf2.add_paragraph()
    p.text = f"\n• {title}:"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p = ctf2.add_paragraph()
    p.text = desc
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_LIGHT


# ==============================================================================
# SLIDE 10: Deep Dive: Config Tables & API Signatures
# ==============================================================================
s10 = prs.slides.add_slide(blank_layout)
create_header(s10, "Complex Parsing", "Parsing Structured Markdown Tables & API Signatures",
              "Moving beyond plain paragraph text: How DriftLens parses tabular data and function signatures.")

c1 = add_card(s10, 0.8, 1.7, 5.7, 5.2, CARD_BG_NAVY, CYAN, 1.5)
ctf1 = c1.text_frame
ctf1.word_wrap = True
p = ctf1.paragraphs[0]
p.text = "📊 Markdown Table Row Parser"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = CYAN

p = ctf1.add_paragraph()
p.text = "\nMarkdown tables present a major challenge for standard linters because values are split across column pipes (|):\n"
p.font.size = Pt(12)
p.font.color.rgb = WHITE

t_steps = [
    ("Header & Delimiter Detection", "Parses | Setting | Default | Description | and skips delimiter rows (|---|---|)."),
    ("Row Data Objectification", "Transforms each row into key-value pairs: { Setting: 'TIMEOUT_SECONDS', Default: '30' }"),
    ("Precise Line Number Attribution", "Tags the exact row line number in the source file, allowing 1-click in-table replacement.")
]
for title, desc in t_steps:
    p = ctf1.add_paragraph()
    p.text = f"• {title}: {desc}"
    p.font.size = Pt(11.5)
    p.font.color.rgb = SLATE_LIGHT
    p.space_before = Pt(4)

c2 = add_card(s10, 6.8, 1.7, 5.7, 5.2, CARD_BG_NAVY, PURPLE, 1.5)
ctf2 = c2.text_frame
ctf2.word_wrap = True
p = ctf2.paragraphs[0]
p.text = "🧩 Function Parameter Signature AST"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = PURPLE

p = ctf2.add_paragraph()
p.text = "\nDetecting when a function signature changes parameters without renaming the function:\n"
p.font.size = Pt(12)
p.font.color.rgb = WHITE

f_steps = [
    ("Regex AST Pattern", "function fnName(params) | def fnName(params) | const fnName = (params) =>"),
    ("Parameter Signature Capture", "Stores value as 'registerUser(email, password)' vs 'registerUser(email, password, tenantId)'"),
    ("Signature Comparison", "Detects parameter addition or deletion even when the function name itself remains unchanged."),
    ("Accurate Remediation", "Replaces the obsolete parameter list in prose tutorials while preserving contextual wording.")
]
for title, desc in f_steps:
    p = ctf2.add_paragraph()
    p.text = f"• {title}: {desc}"
    p.font.size = Pt(11.5)
    p.font.color.rgb = SLATE_LIGHT
    p.space_before = Pt(4)


# ==============================================================================
# SLIDE 11: Innovation 1: Starter README Generator
# ==============================================================================
s11 = prs.slides.add_slide(blank_layout)
create_header(s11, "Standout Innovation", "Starter README.md Generator for Zero-Doc Codebases",
              "What happens if a project has no documentation at all? DriftLens synthesizes one from verified code implementation.")

c_hero = add_card(s11, 0.8, 1.7, 11.7, 2.0, CARD_BG_BLUE, CYAN, 1.5)
htf = c_hero.text_frame
htf.word_wrap = True
p = htf.paragraphs[0]
p.text = "✨ Instant Codebase Documentation Synthesis"
p.font.size = Pt(18)
p.font.bold = True
p.font.color.rgb = CYAN

p = htf.add_paragraph()
p.text = "driftlens generate-readme --repo ./my-project > README.md"
p.font.name = "Consolas"
p.font.size = Pt(14)
p.font.color.rgb = EMERALD
p.space_before = Pt(6)

p = htf.add_paragraph()
p.text = "Instead of leaving repositories with missing documentation, DriftLens inspects the codebase, extracts runtime configurations, CLI flags, and routes, and automatically generates a structured starter README.md."
p.font.size = Pt(12)
p.font.color.rgb = WHITE
p.space_before = Pt(6)

# 3 Detail Cards Below
parts = [
    ("⚙️ Configuration Table", "Extracts DEFAULT_TIMEOUT, MAX_RETRIES, PORT from code and formats them into a clean Markdown table with source file provenance.", CYAN),
    ("💻 CLI Arguments Table", "Discovers all argparse and commander flags (--timeout, --verbose) and generates an accurate options reference table.", PURPLE),
    ("🔌 API Endpoints & Functions", "Extracts Express/Flask endpoints (/api/v1/...) and public exported functions with quickstart instructions.", EMERALD)
]
for idx, (title, desc, col) in enumerate(parts):
    x = 0.8 + idx * 3.9
    card = add_card(s11, x, 3.9, 3.8, 3.0, CARD_BG_NAVY, col, 1.2)
    ctf = card.text_frame
    ctf.word_wrap = True
    p = ctf.paragraphs[0]
    p.text = title
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = col
    p = ctf.add_paragraph()
    p.text = desc
    p.font.size = Pt(12)
    p.font.color.rgb = WHITE
    p.space_before = Pt(8)


# ==============================================================================
# SLIDE 12: Innovation 2: Visual Impact Graph & 1-Click Fix
# ==============================================================================
s12 = prs.slides.add_slide(blank_layout)
create_header(s12, "Interactive Studio", "Visual Blast Radius Impact Graph & 1-Click Auto-Fix",
              "Giving developers a visual interactive studio to explore drift impact and remediate issues in seconds.")

c1 = add_card(s12, 0.8, 1.7, 5.7, 5.2, CARD_BG_NAVY, CYAN, 1.5)
ctf1 = c1.text_frame
ctf1.word_wrap = True
p = ctf1.paragraphs[0]
p.text = "🌐 SVG Documentation Blast Radius Graph"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = CYAN

g_points = [
    ("Visual Dependency Mapping", "Connects changed source code files (e.g. cli.py) on the left to affected documentation sections (e.g. CLI Options) on the right."),
    ("Interactive Bezier Curves", "Dynamic SVG curves visually show where code changes radiate blast radius impact into documentation."),
    ("Color-Coded Status Nodes", "Red nodes indicate high-severity drift; green nodes indicate validated documentation harmony."),
    ("Live Web Studio", "Runs locally on http://localhost:3000 with real-time diff editing and preset scenario buttons.")
]
for title, desc in g_points:
    p = ctf1.add_paragraph()
    p.text = f"\n• {title}:"
    p.font.size = Pt(12.5)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p = ctf1.add_paragraph()
    p.text = desc
    p.font.size = Pt(11.5)
    p.font.color.rgb = SLATE_LIGHT

c2 = add_card(s12, 6.8, 1.7, 5.7, 5.2, CARD_BG_NAVY, EMERALD, 1.5)
ctf2 = c2.text_frame
ctf2.word_wrap = True
p = ctf2.paragraphs[0]
p.text = "⚡ 1-Click Auto-Remediation & Patches"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = EMERALD

f_points = [
    ("Instant In-Browser Correction", "Developers click 'Apply Fix' directly in the Web Studio; DriftLens updates the documentation textarea in real-time."),
    ("Downloadable Git .patch Files", "Generates standard unified .patch files (POST /api/fix/patch) ready to apply via git apply fix.patch."),
    ("GitHub PR Review Suggestions", "Outputs native GitHub Markdown ```suggestion blocks so maintainers can accept documentation fixes with 1 click on GitHub.")
]
for title, desc in f_points:
    p = ctf2.add_paragraph()
    p.text = f"\n• {title}:"
    p.font.size = Pt(12.5)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p = ctf2.add_paragraph()
    p.text = desc
    p.font.size = Pt(11.5)
    p.font.color.rgb = SLATE_LIGHT


# ==============================================================================
# SLIDE 13: Performance Engineering & CI/CD Integration
# ==============================================================================
s13 = prs.slides.add_slide(blank_layout)
create_header(s13, "Production Readiness", "Performance Engineering, Benchmarks & CI/CD",
              "Built for speed, scalability, and seamless integration into developer workflows.")

# 4 Stat Cards
stats = [
    ("70", "Unit & Integration Tests", EMERALD),
    ("100%", "Test Pass Rate (Vitest)", CYAN),
    ("5ms", "Live Benchmark Execution", EMERALD),
    ("Qwen 2.5 7B", "Open-Weight AI Model", PURPLE)
]
for idx, (big, label, col) in enumerate(stats):
    x = 0.8 + idx * 2.95
    card = add_card(s13, x, 1.7, 2.85, 1.5, CARD_BG_NAVY, col, 1.2)
    ctf = card.text_frame
    ctf.word_wrap = True
    p = ctf.paragraphs[0]
    p.text = big
    p.font.name = "Arial"
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = col
    p.alignment = PP_ALIGN.CENTER
    p = ctf.add_paragraph()
    p.text = label
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_MUTED
    p.alignment = PP_ALIGN.CENTER

# Bottom Cards
b1 = add_card(s13, 0.8, 3.5, 5.7, 3.4, CARD_BG_NAVY, CYAN, 1.5)
btf1 = b1.text_frame
btf1.word_wrap = True
p = btf1.paragraphs[0]
p.text = "⚡ Algorithmic & I/O Optimizations"
p.font.size = Pt(16)
p.font.bold = True
p.font.color.rgb = CYAN
p = btf1.add_paragraph()
p.text = "• O(1) Token Sets: Pre-computed token and stem sets eliminate repeated string parsing.\n• Worker Pool Concurrency: Evaluates candidate pairs in parallel without blocking.\n• Parallel Async File Traversal: Promise.all reads repositories concurrently in milliseconds.\n• In-Memory RAM Caching: Sub-millisecond response for golden scenarios."
p.font.size = Pt(11.5)
p.font.color.rgb = WHITE
p.space_before = Pt(8)

b2 = add_card(s13, 6.8, 3.5, 5.7, 3.4, CARD_BG_NAVY, AMBER, 1.5)
btf2 = b2.text_frame
btf2.word_wrap = True
p = btf2.paragraphs[0]
p.text = "📦 Reusable GitHub Action (action.yml)"
p.font.size = Pt(16)
p.font.bold = True
p.font.color.rgb = AMBER
p = btf2.add_paragraph()
p.text = "- name: DriftLens Check\n  uses: Marwadi-me/Driftlens@main\n  with:\n    base: ${{ github.event.pull_request.base.sha }}\n    head: ${{ github.event.pull_request.head.sha }}\n    min-confidence: '0.60'"
p.font.name = "Consolas"
p.font.size = Pt(10.5)
p.font.color.rgb = SLATE_LIGHT
p.space_before = Pt(8)
p = btf2.add_paragraph()
p.text = "Installs in any repo in 3 lines. Blocks merging on HIGH severity drift."
p.font.size = Pt(11)
p.font.color.rgb = WHITE
p.space_before = Pt(4)


# ==============================================================================
# SLIDE 14: Conclusion & Judge Q&A Defense
# ==============================================================================
s14 = prs.slides.add_slide(blank_layout)
create_header(s14, "Summary & Defense", "Conclusion & Hackathon Judge Defense Sheet",
              "Summary of why DriftLens wins Problem 5 and quick answers to expected judge inquiries.")

c1 = add_card(s14, 0.8, 1.7, 5.7, 5.2, CARD_BG_GREEN, EMERALD, 1.5)
ctf1 = c1.text_frame
ctf1.word_wrap = True
p = ctf1.paragraphs[0]
p.text = "🏆 Why DriftLens Wins Problem 5"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = EMERALD

recap = [
    ("Directly Solves the Real Problem", "Catches factual drift in explanatory prose, configuration tables, and API tutorials where doctests are blind."),
    ("Pre-Correction Verification", "Identifies the original documentation drift on the code commit before any corrective commit is created."),
    ("Zero Hallucinations", "Deterministic AST and diff parsing anchors all file paths and line ranges; the AI model only performs bounded semantic reasoning."),
    ("100% Hackathon Compliant", "Powered exclusively by open-weight Qwen 2.5 7B. Zero closed or proprietary model APIs."),
    ("Complete Developer Experience", "CLI + GitHub Action + Interactive Web Studio + SVG Impact Graph + 1-Click Fix + Starter README Generator.")
]
for title, desc in recap:
    p = ctf1.add_paragraph()
    p.text = f"\n• {title}:"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p = ctf1.add_paragraph()
    p.text = desc
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_LIGHT

c2 = add_card(s14, 6.8, 1.7, 5.7, 5.2, CARD_BG_NAVY, CYAN, 1.5)
ctf2 = c2.text_frame
ctf2.word_wrap = True
p = ctf2.paragraphs[0]
p.text = "🛡️ Judge Q&A Defense Cheat Sheet"
p.font.size = Pt(17)
p.font.bold = True
p.font.color.rgb = CYAN

qa = [
    ("Q: Why use an LLM instead of Grep / Regex?", "A: Grep can find words, but cannot know if changing a number from 30 to 60 contradicts 'the system waits half a minute before timing out'."),
    ("Q: How are false alarms minimized?", "A: Same-PR shield suppresses warnings if the doc was already updated; composite formula discards scores below 60%."),
    ("Q: Why not send the entire repo to the LLM?", "A: Too slow, expensive, and prone to hallucinations. We isolate candidate pairs deterministically first."),
    ("Q: Is this ready for real repositories?", "A: Yes. 70 unit tests passing, action.yml available, and runs on any GitHub repository.")
]
for q, a in qa:
    p = ctf2.add_paragraph()
    p.text = f"\n{q}"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = AMBER
    p = ctf2.add_paragraph()
    p.text = a
    p.font.size = Pt(10.5)
    p.font.color.rgb = WHITE

# Save Presentation
output_path = "/Users/yashvardhanmundhra/Desktop/driftlens/DriftLens_Presentation.pptx"
prs.save(output_path)
print(f"Colorful & Detailed Presentation successfully generated: {output_path}")
