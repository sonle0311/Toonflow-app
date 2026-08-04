# AI Director Pipeline — Complete Technical Architecture

> **Generated**: 2026-04-01  
> **Source Modules**: `director.py`, `director_conversation.py`, `director_system.py`, `director_personas.py`, `scene_renderer.py`, `frame_chain.py`, `reference_manager.py`, `ai_brain.py`, `world_designer.py`

---

## Table of Contents

1. [Pipeline Overview](#1-pipeline-overview)
2. [15-Step Unified Queue](#2-15-step-unified-queue)
3. [Module Dependency Map](#3-module-dependency-map)
4. [Phase 0: Script & DNA Analysis](#4-phase-0-script--dna-analysis)
5. [Phase 0.5: World Designer](#5-phase-05-world-designer)
6. [Director Conversation Engine](#6-director-conversation-engine)
7. [Director Personas (Genre Routing)](#7-director-personas-genre-routing)
8. [Storyboard Generation](#8-storyboard-generation)
9. [7-Component Universal Prompting Framework](#9-7-component-universal-prompting-framework)
10. [Reference Image System](#10-reference-image-system)
11. [Sequential Rendering Pipeline](#11-sequential-rendering-pipeline)
12. [Frame Chain Engine](#12-frame-chain-engine)
13. [FLOW vs JUMP Logic](#13-flow-vs-jump-logic)
14. [Scene Renderer (Smart Render)](#14-scene-renderer-smart-render)
15. [AI Brain (Decision Engine)](#15-ai-brain-decision-engine)
16. [Multimodal Scoring & Smart Retry](#16-multimodal-scoring--smart-retry)
17. [Post-Processing & Assembly](#17-post-processing--assembly)
18. [SSE Streaming Protocol](#18-sse-streaming-protocol)
19. [Database Schema & Persistence](#19-database-schema--persistence)
20. [Safety & Content Enforcement](#20-safety--content-enforcement)
21. [Cinematic Grammar](#21-cinematic-grammar)
22. [Configuration & Environment](#22-configuration--environment)

---

## 1. Pipeline Overview

RenmaeAI's AI Director operates as a **"Director-First"** orchestration engine. The core philosophy: **visuals tell an independent story that amplifies the voiceover** — they never merely illustrate narration.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                          │
│  ProductionDashboard → SSE Listener → Real-time Progress Display   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP + SSE
┌───────────────────────────────▼─────────────────────────────────────┐
│                     BACKEND (FastAPI)                               │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  director.py     │  │ director_convo   │  │ director_system   │  │
│  │  (API Routes)    │──│ (AI Brain)       │──│ (Prompts)         │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────────────────┘  │
│           │                    │                                     │
│  ┌────────▼────────┐  ┌───────▼──────────┐  ┌───────────────────┐  │
│  │ scene_renderer  │  │  ai_brain.py     │  │ director_personas │  │
│  │ (VEO Rendering) │──│  (Quality/JUMP)  │  │ (Genre Router)    │  │
│  └────────┬────────┘  └──────────────────┘  └───────────────────┘  │
│           │                                                         │
│  ┌────────▼────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  frame_chain    │  │ reference_mgr    │  │ world_designer    │  │
│  │  (FFMPEG)       │  │ (Entity Refs)    │  │ (Cast & Locs)     │  │
│  └─────────────────┘  └──────────────────┘  └───────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  External: G-Labs VEO API (Video) + Imagen API (Images)     │   │
│  │  External: CLIProxy / OpenAI-compatible API (AI Chat)        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **SSE over WebSocket** | Prevents HTTP timeouts on long-running renders (10+ min per scene) |
| **Sequential rendering** | Maintains visual continuity — each scene depends on previous frame |
| **ACT-based batching** | Keeps AI context window within limits while preserving narrative structure |
| **Entity `[Token]` system** | SceneBuilder prompts use `[EntityName]`, video prompts strip to visual descriptions |
| **SQLite persistence** | Single-file DB, zero-config, sufficient for single-tenant desktop app |
| **Director-First philosophy** | Visuals tell a parallel story, not literal illustration of voiceover |

---

## 2. 15-Step Unified Queue

The production queue is **granular and resumable**. Each step can fail independently and be retried:

```
Step  1  ─── Script Evaluation ──────── DNA comparison, style alignment check
Step  2  ─── Split Scenes ──────────── Segment text into VO scenes (split_mode: 'voiceover')
Step  3  ─── Metadata ──────────────── SEO/Channel style analysis
Step  4  ─── Voice (TTS) ──────────── Batched TTS generation (Edge TTS / Minimax)
Step  5  ─── Concept Analysis ─────── Genre, theme, emotional arc (19-field deep analysis)
Step  6  ─── Keywords ─────────────── Visual search terms for stock footage
Step  7  ─── Script Structure (P0) ── AI identifies HOOK/INTRO/DEV/CLIMAX/ENDING boundaries
Step  8  ─── Story Outline (P1) ───── AI reads full script → visual story beats
Step  9  ─── Beat Mapping (P2) ────── Proportional mapping of beats to VO scenes
Step 10  ─── Director Analysis (P3) ─ 6-Pillar Directing Notes + Visual Narrative Layers
Step 11  ─── Entity Extraction (P4) ─ Recurring visual assets identified BEFORE prompting
Step 12  ─── Create Prompts (P5) ──── 7-component AI video prompts (T2V/I2V/F&LF)
Step 13  ─── Reference Images (P6) ── VEO 3.1 multi-panel reference sheets per entity
Step 14  ─── Scene Builder (P7) ───── Final prompt injection + static composition images
Step 15  ─── Assemble & Export ────── Rendering, concatenation, metadata packaging
```

### Visual Narrative Layers (Steps 10-12)

The Director assigns each scene one of three visual layers:

| Layer | Description | Example |
|---|---|---|
| **ANCHOR** | Literal scene matching script content | VO says "sunrise" → show sunrise |
| **DRIFT** | Emotional/abstract interpretation | VO says "hope" → golden light on hands |
| **LEAP** | Unexpected, metaphorical imagery | VO says "freedom" → bird bursting from cage |

---

## 3. Module Dependency Map

```
director.py
├── director_conversation.py          # AI conversation persistence
│   ├── director_system.py            # System prompts & templates
│   └── director_personas.py          # Genre-specific persona injection
├── scene_renderer.py                 # Smart VEO rendering engine
│   ├── frame_chain.py                # FFMPEG frame extraction
│   ├── reference_manager.py          # Entity reference resolution
│   └── ai_brain.py                   # Quality/JUMP/Refinement AI
├── world_designer.py                 # Phase 0.5 Cast & Locations Map
├── glabs_logger.py                   # G-Labs API request logging
└── productions.db / users.db         # SQLite persistence
```

### File Locations

| Module | Path | Lines | Purpose |
|---|---|---|---|
| `director.py` | `backend/routes/director.py` | ~1462 | API routes, SSE streams, production CRUD |
| `director_conversation.py` | `backend/modules/director_conversation.py` | ~1007 | AI conversation, storyboard, scoring |
| `director_system.py` | `backend/prompts/director_system.py` | ~642 | System prompts, message builders |
| `director_personas.py` | `backend/modules/director_personas.py` | ~163 | 12 genre-specific personas |
| `scene_renderer.py` | `backend/library/scene_renderer.py` | ~1016 | VEO submit/poll/download, FLOW/JUMP |
| `frame_chain.py` | `backend/library/frame_chain.py` | ~261 | FFMPEG last-frame extraction |
| `reference_manager.py` | `backend/library/reference_manager.py` | ~522 | Entity ref creation & resolution |
| `ai_brain.py` | `backend/library/ai_brain.py` | ~727 | Prompt refinement, JUMP detect, vision QC |
| `world_designer.py` | `backend/modules/world_designer.py` | ~492 | Phase 0.5 Cast/Location/Interaction map |

---

## 4. Phase 0: Script & DNA Analysis

### DNA Analysis (3-Step Continuous Conversation)

Extracts the writing "DNA" from sample scripts:
1. **Voice Analysis** — Tone, vocabulary, sentence rhythm
2. **Storytelling Patterns** — Structure, hook strategies, retention techniques
3. **Style Synthesis** — Combined profile for script generation

### Cross-Language Detection

```
Steps 3-6 (Analysis)  → Run in SOURCE language (preserve nuance)
Steps 7-12 (Remake)   → Write in TARGET language (natural flow)
```

Replaces the old full-script-translation approach with "analyze in source, write in target."

### Aging-Up Safety Rule

Mandatory enforcement at script generation AND entity extraction:

```
IF character.age < 18:
    character.age = adult_equivalent
    # "12-year-old girl" → "25-year-old woman"
    # "teenage boy" → "young adult man in his early 20s"
```

---

## 5. Phase 0.5: World Designer

**Module**: `world_designer.py`  
**Purpose**: Analyze script content to extract characters, locations, and interactions for visual diversity planning.

### Core Principle

```
Script content = PRIMARY driver
Duration = SECONDARY (screen time distribution only)
```

### World Design Output Schema

```json
{
  "cast": [
    {
      "id": "char_minh_anh",
      "name": "MinhAnh",
      "role": "protagonist|supporting|ensemble|symbolic|cameo",
      "visual": "1-2 sentence visual description",
      "appear_in_sections": ["HOOK", "INTRO", "DEV", "CLIMAX", "ENDING"],
      "screen_time_pct": 0.45
    }
  ],
  "locations": [
    {
      "id": "loc_family_home",
      "name": "Family Home",
      "visual": "1-2 sentence visual description",
      "used_in_sections": ["HOOK", "INTRO"],
      "sub_areas": ["kitchen", "porch", "garden"]
    }
  ],
  "interaction_plan": [
    {
      "section": "DEVELOPMENT",
      "who": ["MinhAnh", "Mother"],
      "where": "kitchen",
      "type": "physical_touch|eye_contact|shared_activity|emotional_reaction|spatial_relationship|crowd_dynamics",
      "visual_beat": "Mother holds daughter's hands, speaking earnestly",
      "tier": 1
    }
  ],
  "diversity_rules": {
    "max_consecutive_same_character": 4,
    "max_consecutive_same_location": 5,
    "min_unique_characters_per_10_scenes": 2,
    "min_location_changes": 3,
    "ensemble_scenes_pct": 0.15
  }
}
```

### 3-Tier Interaction System

| Tier | Source | Description |
|---|---|---|
| **Tier 1 — Explicit** | Script | Interactions directly mentioned (conversations, meetings, conflicts) |
| **Tier 2 — Implied** | Context enrichment | Brief mentions expanded into 3-4 visual beats |
| **Tier 3 — Atmospheric** | World-building | Natural background life (vendors, pedestrians, etc.) |

### Screen Time Distribution Algorithm

```python
def compute_screen_time(total_scenes, num_characters):
    if num_characters <= 1:
        return {"protagonist": 0.60, "world_beats": 0.40}
    
    protagonist_pct = min(0.50, 0.60 - (num_characters - 1) * 0.05)
    supporting_pct = (1.0 - protagonist_pct - 0.15) / max(1, num_characters - 1)
    return {
        "protagonist": protagonist_pct,
        "supporting_each": supporting_pct,
        "world_beats": 0.15,
    }
```

---

## 6. Director Conversation Engine

**Module**: `director_conversation.py`  
**Purpose**: Persistent multi-turn AI conversation that maintains context across the entire production.

### Architecture

```
DirectorConversation
├── __init__(production_id, user_id)
│   └── Loads/creates conversation thread from SQLite
├── Context Injection
│   ├── sync_analysis (style, characters, settings)
│   ├── storyboard (if exists)
│   └── previous conversation history
├── Operations
│   ├── chat()                  # General director dialogue
│   ├── generate_storyboard()   # 20-field table, ACT-based batching
│   ├── generate_blueprint()    # Per-scene rendering blueprint
│   └── score_scene()           # Multimodal vision scoring
└── Persistence
    └── SQLite: users.db → director_conversations table
```

### Conversation Thread Structure

```sql
CREATE TABLE director_conversations (
    id TEXT PRIMARY KEY,
    production_id TEXT NOT NULL,
    user_id TEXT DEFAULT '',
    messages TEXT DEFAULT '[]',      -- JSON array of {role, content, timestamp}
    created_at TEXT,
    updated_at TEXT
);
```

### Context Injection Template

The system injects rich context before each AI call:

```
══ PRODUCTION CONTEXT ══
Title: {title}
Genre: {genre}
Visual Style: {visual_style}
Total Scenes: {total_scenes}

══ MANDATORY STYLE LOCK ══
VISUAL STYLE PREFIX: {sync_style_analysis}
CHARACTER RENDERING STYLE: {sync_character_analysis}
CHARACTERS: [list with visual descriptions]
SETTINGS: [list with visual descriptions]

══ CURRENT STORYBOARD ══
[If exists, inject full storyboard table]

══ CONVERSATION HISTORY ══
[Previous messages for continuity]
```

---

## 7. Director Personas (Genre Routing)

**Module**: `director_personas.py`  
**Purpose**: Inject genre-specific AI Director personality into system prompts.

### 12 Available Personas

| Genre Key | Persona | Reference Directors | Emphasis |
|---|---|---|---|
| `storytelling` | Narrative Film Director | Spielberg + Fincher | Character emotion & journey |
| `true_crime` | Documentary Director | Errol Morris + Fincher (Zodiac) | Factual grounding & tension |
| `horror` | Horror Director | Robert Eggers + Ari Aster | Environmental dread & suggestion |
| `drama` | Emotional Realism Director | Kore-eda + Barry Jenkins | Intimate emotion & humanity |
| `comedy` | Visual Comedy Director | — | Comic timing & irony |
| `mystery` | Mystery-Suspense Director | Hitchcock + Villeneuve | Visual clue planting & suspense |
| `emotional` | Visual Poet Director | — | Emotional resonance & intimacy |
| `educational` | Clarity-First Director | — | Visual clarity & understanding |
| `business` | Corporate-Premium Director | — | Authority & professionalism |
| `lifestyle` | Aspirational Beauty Director | — | Beauty & aspiration |
| `viral` | High-Energy Impact Director | — | Immediate impact & energy |
| `default` | Film Director | — | Balanced storytelling |

### Persona Injection Point

```python
def format_director_prefix(genre: str) -> str:
    persona = get_director_persona(genre)
    return f"""{persona['system_prefix']}

Your directorial emphasis: {persona['emphasis']}
Reference style: {persona['reference_style']}
Interaction approach: {persona['interaction_style']}
"""
```

Each persona includes an `interaction_style` that guides physical character behavior:
- Horror: *"Dread through proximity — involuntary touch, frozen reactions, failed escape gestures"*
- Drama: *"Intimate gestures — meaningful glances, tender touches, silence louder than words"*
- Comedy: *"Physical comedy timing — double-takes, reaction beats, escalating absurdity"*

---

## 8. Storyboard Generation

**Module**: `director_conversation.py` → `generate_storyboard()`

### 20-Field Storyboard Table

Each row in the storyboard contains:

| # | Field | Description |
|---|---|---|
| 1 | `scene_index` | Sequential scene number |
| 2 | `act` | Narrative act (HOOK, INTRO, DEV, CLIMAX, ENDING) |
| 3 | `voiceover_text` | Script segment for this scene |
| 4 | `scene_description` | Visual description of what happens |
| 5 | `visual_layer` | ANCHOR / DRIFT / LEAP |
| 6 | `shot_size` | ELS / WS / MWS / MS / MCU / CU / ECU |
| 7 | `camera_angle` | Eye-level / Low / High / Bird's-eye / Dutch |
| 8 | `camera_movement` | Static / Pan / Tilt / Dolly / Crane / Handheld |
| 9 | `transition_next` | Cut / Dissolve / Match Cut / Fade |
| 10 | `lighting` | Natural / Dramatic / Low-key / High-key / Silhouette |
| 11 | `color_palette` | Dominant colors and mood |
| 12 | `composition` | Rule of thirds / Symmetry / Leading lines |
| 13 | `props_tech` | Key objects in frame |
| 14 | `acting_direction` | Character physical performance notes |
| 15 | `entities` | List of `[EntityName]` tokens present |
| 16 | `location` | Where the scene takes place |
| 17 | `tempo` | Pacing (slow / medium / fast) |
| 18 | `emotional_beat` | Core emotion for this moment |
| 19 | `sb_prompt` | SceneBuilder prompt (for start image generation) |
| 20 | `video_prompt` | Video generation prompt (for VEO) |

### ACT-Based Batching Strategy

Large scripts (99+ segments) are processed in batches by narrative ACT to maintain context window limits:

```python
# Pseudocode from generate_storyboard()
acts = identify_narrative_acts(script_structure)  
# → ["HOOK", "INTRO", "DEV_1", "DEV_2", "CLIMAX", "ENDING"]

for act in acts:
    act_scenes = get_scenes_for_act(act)
    # Generate storyboard rows for this ACT batch
    # Previous ACT summary injected as context
    rows = ai_generate_storyboard_batch(
        act_scenes,
        previous_act_summary=prev_summary,
        full_context=production_context
    )
    storyboard.extend(rows)
    prev_summary = summarize_act(rows)
```

**Batch constraints**: 15 scenes per Director step, 15 scenes per Phase 5/Phase 7 expansion.

---

## 9. 7-Component Universal Prompting Framework

Every AI-generated prompt follows this structured framework:

```
┌──────────────────────────────────────────────────────┐
│  1. SUBJECT                                          │
│     Identity, features, clothing, age, distinguishing│
│     characteristics. Uses [EntityName] tokens.       │
├──────────────────────────────────────────────────────┤
│  2. CONTEXT                                          │
│     Environment, lighting conditions, spatial details│
│     Weather, time of day, background elements.       │
├──────────────────────────────────────────────────────┤
│  3. ACTION                                           │
│     Poses, movement verbs, cause-and-effect chains.  │
│     "Show don't tell" — sensory details over labels. │
├──────────────────────────────────────────────────────┤
│  4. CINEMATOGRAPHY                                   │
│     Shot type (CU/MS/WS), lens (24mm/85mm),         │
│     camera movement (dolly/pan/handheld).             │
├──────────────────────────────────────────────────────┤
│  5. AESTHETICS                                       │
│     Art style, lighting style, color palette,        │
│     texture, grain, mood indicators.                 │
├──────────────────────────────────────────────────────┤
│  6. AUDIO (Video prompts only)                       │
│     SFX, ambience, foley suggestions.                │
├──────────────────────────────────────────────────────┤
│  7. CONSTRAINTS                                      │
│     Resolution (16:9), negative prompts,             │
│     reference consistency rules, anti-patterns.      │
└──────────────────────────────────────────────────────┘
```

### Entity Token Rules

| Context | Token Handling |
|---|---|
| **SceneBuilder prompts** | Uses `[EntityName]` tokens + reference images attached as base64 |
| **Video prompts** | Tokens stripped → replaced with full visual descriptions to avoid confusing VEO |

### Prompt Length Constraints

- SceneBuilder prompts: Truncated to **2000 chars**
- Video prompts: Truncated to **2000 chars**
- Single continuous shot: ONE action, ONE camera angle, ONE movement
- Target length: **40-80 words**, English, one flowing paragraph

---

## 10. Reference Image System

**Module**: `reference_manager.py`

### Reference Sheet Templates (VEO 3.1 Format)

Three entity-type-specific templates for multi-panel reference sheets:

#### Character Template
```
[VISUAL STYLE] professional character sheet on clean white background.
Title: '[ENTITY NAME]' as large bold sans-serif text.
Description: [DESCRIPTION].

TOP ROW: 4 full-body views side by side:
  (1) Front-facing, neutral standing pose, direct eye contact
  (2) Three-quarter front, turned 45° toward camera
  (3) Three-quarter rear, looking over shoulder (for OTS cinematography)
  (4) Full back view showing rear details

BOTTOM ROW: 6 close-up detail panels:
  head/face front, head three-quarter, upper torso, hands/accessories,
  waist/belt area, legs and footwear

All panels: identical [VISUAL STYLE], 5500K studio lighting, 4K.
No labels, no annotations — only title name text.
```

#### Environment Template
```
TOP ROW: Wide establishing shot (hero image)
MIDDLE ROW: 3 angle views (bird's-eye, eye-level, low-angle dramatic)
BOTTOM ROW: 4 detail panels (wall texture, floor surface, key prop, atmospheric lighting)
```

#### Prop Template
```
CENTER: Hero 3/4 angle product view
TOP ROW: 3 orthographic views (front, side, top-down)
BOTTOM ROW: 3 detail panels (rotated view, surface texture, distinctive features)
```

### MANDATORY STYLE LOCK Injection

All reference prompts receive style injection from `sync_analysis`:

```python
def _build_style_mandate(sync_analysis):
    # Extracts from production's style analysis:
    visual_style = sync_analysis.get("visual_style")
    style_analysis = sync_analysis.get("sync_style_analysis")
    char_analysis = sync_analysis.get("sync_character_analysis")
    
    mandate = "══ MANDATORY STYLE LOCK ══\n"
    mandate += f"VISUAL STYLE PREFIX: {style_desc}\n"
    mandate += "You MUST replace ALL [VISUAL STYLE] placeholders with EXACTLY this style.\n"
    mandate += "Do NOT invent your own style. Do NOT add extra style modifiers.\n"
    return mandate
```

### Entity Resolution Pipeline

```python
# 1. Parse [EntityName] tokens from prompt
tokens = re.findall(r"\[([A-Za-z\u00C0-\u024F...]+)\]", prompt)

# 2. Look up file paths: renders/references/{production_id}/{entity}_ref.png
for token in tokens:
    ref_path = get_reference(token, production_id)
    # Returns None if not found → added to "unresolved" list

# 3. Result
{
    "resolved_prompt": prompt,                    # Tokens kept intact
    "reference_images": [{"entity_name", "file_path"}],  # Found refs
    "unresolved": ["EntityName1"]                 # Missing refs
}
```

### CleanSlate Protocol

References are **always regenerated fresh** — old references are deleted before regeneration to avoid visual mismatch between style iterations.

---

## 11. Sequential Rendering Pipeline

**Module**: `director.py` → `/director/render-sequential` endpoint

This is the **core rendering loop** — the most complex part of the pipeline.

### Per-Scene Loop

```
FOR each scene in storyboard:
│
├── 1. Load storyboard row + previous scene state
│
├── 2. AI generates SceneBuilder prompt + Video prompt
│      └── director_conversation.generate_blueprint(scene_row)
│
├── 3. Determine FLOW vs JUMP
│      └── ai_brain.detect_jump(prev_prompt, curr_prompt)
│
├── 4. Render scene via scene_renderer.render_scene()
│      ├── Resolve entity references
│      ├── AI prompt refinement (show-don't-tell)
│      ├── Consistency check vs previous scene
│      ├── Select start/end image strategy (FLOW/JUMP)
│      ├── Enrich prompts with render_constraints
│      ├── Submit to G-Labs VEO API
│      ├── Poll for completion (10 min timeout)
│      ├── Download rendered video
│      └── Extract last frame for chaining
│
├── 5. Vision-based quality scoring
│      └── ai_brain.check_quality_vision(video, prompt, prev_frame)
│
├── 6. IF score < 7.0 → Smart Retry
│      ├── Search cinematic library by issue categories
│      ├── AI refines prompt with vision feedback
│      └── Re-render with enhanced prompt
│
├── 7. Bridge clip detection (FLOW only)
│      ├── Detect missing entities for next scene
│      └── Generate bridge end_image if needed
│
├── 8. SSE progress update to frontend
│      └── {scene_index, status, score, video_path, ...}
│
└── 9. Update chain state (last_frame, prev_prompt)
```

### SSE Event Stream

```python
# Each scene emits progress events:
yield f"data: {json.dumps({
    'type': 'scene_progress',
    'scene_index': i,
    'total_scenes': total,
    'status': 'rendering',  # or 'scoring', 'retrying', 'completed', 'failed'
    'score': 8.5,
    'video_path': '/renders/prod_xxx/scene_001.mp4',
    'prompt_used': '...',
})}\n\n"
```

---

## 12. Frame Chain Engine

**Module**: `frame_chain.py`  
**Core Rule**: `Start image of Scene N+1 = FFMPEG last frame of Scene N video`

### Frame Extraction

```python
def extract_last_frame(video_path, output_path="", production_id="", scene_index=0):
    # 1. Get video duration via ffprobe
    duration = get_video_duration(video_path)
    
    # 2. Calculate last frame timestamp (0.05s before end)
    last_frame_ts = max(0, duration - 0.05)
    
    # 3. Extract via FFMPEG
    ffmpeg -y -ss {timestamp} -i {video} -vframes 1 -q:v 1 {output}
    
    # 4. Save to: renders/frames/{production_id}/scene_{idx:03d}_last_frame.png
    return output_path
```

### Chain State Query

```python
def get_chain_state(production_id):
    # Returns:
    {
        "total_frames": 15,
        "latest_frame": "/path/to/scene_014_last_frame.png",
        "latest_scene_index": 14,
        "frames": [{"scene_index", "frame_path", "size_bytes"}, ...]
    }
```

### Start Image Decision Tree

```python
def decide_start_image(scene_index, is_jump, production_id):
    if scene_index == 0:
        return {"action": "scene_builder", "reason": "First scene"}
    
    if is_jump:
        return {"action": "scene_builder", "reason": "JUMP — new location/character"}
    
    # FLOW: chain from previous
    chain = get_chain_state(production_id)
    if chain["latest_scene_index"] == scene_index - 1:
        return {"action": "chain", "start_image": chain["latest_frame"]}
    
    return {"action": "scene_builder", "reason": "Previous frame not found"}
```

---

## 13. FLOW vs JUMP Logic

**Module**: `ai_brain.py` → `detect_jump()` + `scene_renderer.py` → `render_scene()`

### Detection

```python
def detect_jump(prev_prompt, curr_prompt):
    """
    FLOW indicators (any one = FLOW):
    - Same location, continuous action
    - Same character/subject continuing
    - Camera angle change but same scene
    - Same [EntityName] tokens appear in both
    
    JUMP triggers (must be CLEARLY present):
    - Completely different geographic location
    - Clear time period jump (day→night, present→flashback)
    - Entirely different primary subject
    - Major style/format shift
    
    Default = FLOW (conservative bias)
    """
    return {"is_jump": bool, "reason": str, "confidence": 0-10}
```

### Rendering Strategy

| Mode | Start Image | End Image | VEO Mode |
|---|---|---|---|
| **First Scene** | SceneBuilder generated | None | `start_image` |
| **FLOW** | Last frame of prev scene | None | `start_image` |
| **JUMP** | Last frame of prev scene | SceneBuilder new location | `start_end_image` |
| **Broken Chain** | SceneBuilder generated | None | `start_image` |
| **No Start Image** | None | None | `text_to_video` |

### VEO API Modes

```python
# FLOW: reference_images[0] = start frame
payload = {
    "mode": "start_image",
    "reference_images": [start_b64, *char_ref_b64_list]
}

# JUMP: reference_images[0] = start, [1] = end
payload = {
    "mode": "start_end_image", 
    "reference_images": [start_b64, end_b64, *char_ref_b64_list]
}
```

---

## 14. Scene Renderer (Smart Render)

**Module**: `scene_renderer.py` → `render_scene()`

### Full Render Flow (7 Internal Steps)

```
Step 1: Entity Resolution
  ├── Parse [EntityName] tokens in prompt
  ├── Look up reference image paths
  └── Report unresolved entities

Step 1b: AI Prompt Refinement
  ├── Search cinematic library for relevant techniques
  ├── Apply show-don't-tell principles
  └── Refine prompt with library context

Step 1c: Consistency Check
  ├── Compare prev_prompt vs curr_prompt
  ├── Score 1-10 across 5 criteria
  └── If score < 5 → append recommendation to prompt

Step 2: Start/End Image Strategy
  ├── First scene → SceneBuilder start image
  ├── FLOW → extract_last_frame(prev_video)
  ├── JUMP → last_frame as start + SceneBuilder end image
  └── Enrich SB prompt with storyboard fields + render_constraints

Step 3: VEO Prompt Enrichment
  ├── Camera movement from render_constraints
  ├── Shot size, transition hints
  └── Lighting (if not already in prompt)

Step 4: AI Quality Pre-Check
  └── Score prompt clarity before rendering (attempt 1 only)

Step 5: Submit + Poll + Download
  ├── POST /api/video/generate (model: veo-3.1-generate-fast-relaxed)
  ├── Poll /api/status/{task_id} every 5s, timeout 10 min
  ├── Download MP4 on completion
  └── Extract last frame for chaining

Step 6: Smart Retry Logic
  ├── Classify error: "policy" vs "technical"
  ├── Policy → sanitize prompt (regex remove violence/nudity keywords)
  ├── Technical → wait 10s and retry
  └── Max 3 retries

Step 7: Post-Render Vision Quality Check
  ├── Extract 8 frames from video via FFMPEG
  ├── Send frames + prompt to GPT vision
  ├── If score ≥ 7: accept (+ check bridge clip needs)
  ├── If score < 7: search library by issue categories
  └── Refine prompt with vision feedback → retry
```

### Prompt Enrichment Fields

The SceneBuilder prompt is enriched with storyboard fields:

```python
sb_extras = []
# From storyboard_row:
sb_extras.append(f"Key objects: {props_tech}")
sb_extras.append(f"Composition: {composition}")
sb_extras.append(f"Acting: {acting_direction}")

# From render_constraints:
sb_extras.append(f"Lighting: {lighting}")
sb_extras.append(f"Shot: {shot_size}")
sb_extras.append(f"Angle: {camera_angle}")
sb_extras.append(f"Color temperature: {kelvin}K")
sb_extras.append(f"AVOID: {anti_patterns}")

# From scene_enrichment:
sb_extras.append(f"Mood: {mood}")
sb_extras.append(f"Visual echo: {threading_echo}")
sb_extras.append(f"Character placement: {character_placement}")
```

### Safety Sanitization

```python
def _sanitize_prompt_for_policy(prompt_text, error_msg):
    """Remove potentially unsafe content from prompt on policy violation."""
    remove_patterns = [
        r'\b(blood|gore|gory|bloody|bleed(?:ing)?|wound(?:ed|s)?)\b',
        r'\b(kill(?:ing|s)?|murder(?:ing|ed)?|stab(?:bing|bed)?)\b',
        r'\b(corpse|dead\s*body|decapitat\w*|dismember\w*)\b',
        r'\b(nude|naked|undress\w*|strip(?:ping)?)\b',
        r'\b(gun(?:shot)?|firearm|rifle|pistol|weapon)\b',
        r'\b(torture|torment|suffering|agony)\b',
    ]
    # If >30% content removed → add safety softener:
    sanitized += ". Cinematic scene, dramatic lighting, suitable for general audience."
```

---

## 15. AI Brain (Decision Engine)

**Module**: `ai_brain.py`

### 5 Core Functions

| Function | Input | Output | Purpose |
|---|---|---|---|
| `refine_prompt()` | prompt, script_segment, prev_context, visual_layer | refined_prompt, changes, confidence, library_hits | Show-don't-tell refinement |
| `detect_jump()` | prev_prompt, curr_prompt | is_jump, reason, confidence | FLOW vs JUMP classification |
| `check_quality()` | prompt | score, decision, suggestion | Pre-render prompt quality check |
| `check_quality_vision()` | video_path, prompt, prev_frame | score, issues, issue_categories, retry_additions, details | Post-render multimodal scoring |
| `search_library_by_issues()` | issue_categories | library entries | Cinematic technique lookup for retry |

### Vision Quality Scoring (5 Criteria)

```
1. SUBJECT ACCURACY   (30%)  — Correct entity/character shown?
2. MOTION DIRECTION   (25%)  — Subject moves in described direction?
3. CAMERA MOVEMENT    (20%)  — Camera moves as described?
4. COLOR & MOOD       (15%)  — Color grading matches prompt?
5. CONTINUITY         (10%)  — Frame 1 matches previous scene's last frame?

Overall = Weighted average of 5 criteria
Accept threshold: ≥ 7.0
```

### Cinematic Library Integration

The AI Brain searches a Knowledge Library of cinematic techniques:

```python
# Category mapping:
category_keywords = {
    "camera_movement": ["tracking", "dolly", "crane", "handheld", ...],
    "shot_composition": ["close-up", "wide shot", "overhead", ...],
    "color_theory": ["teal", "orange", "warm", "cold", ...],
    "lighting": ["golden hour", "backlit", "silhouette", ...],
    "storytelling": ["emotional", "tension", "suspense", ...],
}

# On quality failure → search by issue categories:
issue_to_lib = {
    "camera_movement": "camera_movement",
    "subject_accuracy": "character_design",
    "lighting": "lighting",
    "color_theory": "color_theory",
}
```

---

## 16. Multimodal Scoring & Smart Retry

### Scoring Pipeline

```
1. FFMPEG extracts 8 evenly-spaced frames from rendered video
   └── fps={num_frames}/8 (for 8-second video = 1 frame/second)

2. Build image list:
   ├── [0] = prev_scene_last_frame (if available, for continuity)
   └── [1-8] = extracted frames (chronological)

3. Send to GPT vision with system prompt:
   ├── Frames + original prompt
   ├── Score 5 criteria (1-10 each)
   └── Return issues + fix suggestions

4. Auto-cleanup: delete temp frame files after scoring
```

### Smart Retry Flow

```
IF score < 7.0:
│
├── 1. Identify issue categories (e.g., "camera_movement", "lighting")
│
├── 2. Search Knowledge Library for matching techniques
│      └── search_library_by_issues(["camera_movement"]) → entries
│
├── 3. Format library context as text
│      └── "1. Hitchcock Dolly Zoom\n   Description: ..."
│
├── 4. Combine vision feedback + library context
│      └── "VISION FEEDBACK: subject must swim TOWARD camera.
│           CINEMATIC TECHNIQUES: 1. Tracking Shot..."
│
├── 5. AI refines prompt with combined context
│      └── refine_prompt(current_prompt, prev_context=retry_context)
│
└── 6. Re-render with refined prompt (up to 3 retries)
```

### Bridge Clip Detection (Post-Quality-Accept)

```python
# After quality ≥ 7.0, check if bridge clip needed for FLOW:
if not is_jump and next_scene_entities:
    missing = _detect_missing_entities(
        next_scene_entities,    # Who should appear next
        cur_scene_entities,     # Who was in this scene
        all_ref_images          # Available reference images
    )
    
    if missing:
        # Generate bridge end_image featuring missing entities
        bridge_end = _generate_bridge_end_image(
            sb_prompt=sb_prompt,
            missing_refs=missing,
            last_frame_path=current_last_frame,
            same_location=True,  # Keep same background
        )
        # Director.py should render a bridge clip between scenes
```

---

## 17. Post-Processing & Assembly

### Threading Detection

Visual threads (recurring visual motifs) are detected and enforced across scenes for narrative cohesion.

### Kelvin Arc Mapping

Color temperature progression throughout the video:

```
HOOK/INTRO    → Cooler tones (5500-6500K)
DEVELOPMENT   → Neutral (5000-5500K)  
CLIMAX        → Warmer/more dramatic (3200-4500K)
ENDING        → Returns toward baseline or stylistic choice
```

### Pacing Validation

Scene duration vs. voiceover timing is validated to ensure sync.

### Final Assembly (FFMPEG)

```bash
# Concatenation of rendered scenes:
ffmpeg -f concat -safe 0 -i scene_list.txt -c copy output.mp4

# scene_list.txt:
# file 'scene_001.mp4'
# file 'scene_002.mp4'
# ...
```

---

## 18. SSE Streaming Protocol

**Module**: `director.py`

### Event Types

```python
# Production-level events:
{"type": "production_started", "production_id": "..."}
{"type": "production_completed", "production_id": "...", "total_scenes": 30}
{"type": "production_failed", "error": "..."}

# Scene-level events:
{"type": "scene_started", "scene_index": 5, "total": 30}
{"type": "scene_rendering", "scene_index": 5, "task_id": "veo_xxx"}
{"type": "scene_scoring", "scene_index": 5, "attempt": 1}
{"type": "scene_retrying", "scene_index": 5, "attempt": 2, "score": 5.5}
{"type": "scene_completed", "scene_index": 5, "score": 8.2, "video_path": "..."}
{"type": "scene_failed", "scene_index": 5, "error": "Policy violation"}

# Progress events:
{"type": "progress", "step": "rendering", "pct": 35, "message": "Scene 5/30"}
```

### Timeout Prevention

SSE streams emit keepalive pings every 30 seconds during long operations to prevent proxy/load balancer timeouts:

```python
# Keepalive ping during rendering:
yield f": keepalive {time.time()}\n\n"
```

---

## 19. Database Schema & Persistence

### `users.db` — User Settings & Conversations

```sql
-- API configuration
CREATE TABLE user_settings (
    key TEXT PRIMARY KEY,
    value TEXT  -- JSON: {"api_key": "...", "base_url": "..."}
);

-- Director conversation threads
CREATE TABLE director_conversations (
    id TEXT PRIMARY KEY,
    production_id TEXT NOT NULL,
    user_id TEXT DEFAULT '',
    messages TEXT DEFAULT '[]',
    created_at TEXT,
    updated_at TEXT
);
```

### `productions.db` — Production Data

```sql
CREATE TABLE productions (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT,           -- 'draft', 'rendering', 'completed', 'failed'
    sync_analysis TEXT,    -- JSON: style DNA, characters, settings
    storyboard TEXT,       -- JSON: array of 20-field rows
    render_state TEXT,     -- JSON: last_scene_index, chain_state
    created_at TEXT,
    updated_at TEXT
);
```

### File System Storage

```
renders/
├── {production_id}/
│   ├── scene_001.mp4          # Rendered video clips
│   ├── scene_001_start.png    # SceneBuilder start images
│   ├── scene_001_end.png      # SceneBuilder end images (JUMP)
│   └── final_output.mp4       # Assembled production
├── frames/
│   └── {production_id}/
│       └── scene_001_last_frame.png   # Frame chain persistence
└── references/
    └── {production_id}/
        ├── minh_anh_ref.png           # Character reference sheet
        ├── minh_anh_ref.json          # Reference metadata
        ├── family_home_ref.png        # Environment reference
        └── family_home_ref.json
```

---

## 20. Safety & Content Enforcement

### Aging-Up Rule (Mandatory)

Applied at script generation AND entity extraction:

```
Rule: No character under 18 may appear in generated content.
Action: Automatically age up to adult equivalent.
Enforcement: Both in script AI prompts and in visual entity descriptions.
```

### Policy Violation Handling

```python
# 3-tier response to G-Labs safety filters:

# Tier 1: Pre-submit — AI quality pre-check catches obvious issues
# Tier 2: Submit rejection — sanitize prompt + retry
# Tier 3: Poll failure — re-classify error + sanitize + retry

# Sanitization regex patterns:
violence_patterns = [r'\b(blood|gore|kill|murder|stab|corpse)\b']
nudity_patterns = [r'\b(nude|naked|undress)\b']
weapon_patterns = [r'\b(gun|firearm|rifle|pistol|weapon)\b']

# If >30% content removed → add safety softener
```

### Entity Name Token Stripping

For video prompts (as opposed to SceneBuilder prompts), entity tokens are stripped and replaced with explicit visual descriptions to avoid VEO interpreting them as text overlays:

```python
# SceneBuilder: "[MinhAnh] walks through the market"
# Video prompt: "A young Vietnamese woman with long black hair walks through the market"
```

---

## 21. Cinematic Grammar

### Shot Grammar Rules

```python
def apply_cinematic_grammar(storyboard):
    """Post-processing rules for shot variety and rhythm."""
    
    # Rule 0 (Structure): Force establishing shots
    # HOOK scenes → ELS or WS
    # ENDING scenes → WS or ELS
    
    # Rule 1 (Rotation): No consecutive identical shot sizes
    # [CU, CU] → [CU, MS]  (fix second)
    
    # Shot Flow Pattern:
    # Wide (Establish) → Medium (Introduce) → Close (Feel) → Wide (Resolve)
```

### Kelvin Temperature Mapping

```
Scene emotion → Color temperature:
  Warm/intimate     → 3200-3500K (candlelight)
  Neutral/day       → 5000-5500K (daylight)
  Cool/melancholy   → 6500-7500K (overcast)
  Dramatic/tension  → Mixed (split lighting)
```

---

## 22. Configuration & Environment

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GLABS_BASE_URL` | `http://127.0.0.1:8765` | G-Labs VEO API endpoint |
| `GLABS_API_KEY` | (from users.db) | G-Labs authentication |
| `OPENAI_BASE_URL` | `http://127.0.0.1:8765/v1` | CLIProxy AI endpoint |
| `OPENAI_API_KEY` | `your-api-key-1` | CLIProxy authentication |
| `OPENAI_MODEL` | `gpt-5.4` | AI model for director brain |
| `FFMPEG_PATH` | `ffmpeg` | FFMPEG binary location |
| `FFPROBE_PATH` | `ffprobe` | FFPROBE binary location |
| `FRAMES_DIR` | `renders/frames` | Frame chain storage |
| `REFERENCE_IMAGES_DIR` | `renders/references` | Entity reference storage |

### API Key Resolution Priority

```
1. Environment variable (highest priority)
2. users.db → user_settings table (JSON: {"api_key": "..."})
3. Empty string (fail gracefully)
```

### VEO Model Configuration

```python
DEFAULT_MODEL = "veo-3.1-generate-fast-relaxed"
POLL_INTERVAL = 5      # seconds between status checks
POLL_TIMEOUT = 600     # 10 minutes max wait
```

### Image Generation Model

```python
IMAGEN_MODEL = "nano_banana_2"   # For SceneBuilder/reference images
ASPECT_RATIO = "16:9"           # All images
```

---

## Appendix: API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/director/chat` | Director conversation (placeholder for WebSocket upgrade) |
| `GET` | `/director/render-sequential` | SSE stream — sequential scene rendering |
| `GET` | `/director/productions` | List all productions |
| `GET` | `/director/production/{id}` | Get production detail |
| `POST` | `/director/production` | Create new production |
| `PATCH` | `/director/production/{id}` | Update production |
| `DELETE` | `/director/production/{id}` | Delete production |
| `POST` | `/director/storyboard/generate` | Trigger storyboard generation |
| `POST` | `/director/reference/create` | Create entity reference image |
| `GET` | `/director/reference/list/{id}` | List references for a production |

---

## Appendix: G-Labs API Integration

### Video Generation

```
POST /api/video/generate
{
    "prompt": "...",
    "model": "veo-3.1-generate-fast-relaxed",
    "aspect_ratio": "16:9",
    "duration": 8,
    "mode": "start_image" | "start_end_image" | "text_to_video",
    "reference_images": ["data:image/png;base64,..."]
}
→ {"task_id": "veo_xxx"}
```

### Image Generation

```
POST /api/image/generate
{
    "prompt": "...",
    "model": "nano_banana_2",
    "aspect_ratio": "16:9",
    "num_images": 1,
    "reference_images": ["data:image/png;base64,..."]
}
→ {"task_id": "img_xxx"}
```

### Status Polling

```
GET /api/status/{task_id}
→ {
    "status": "pending" | "processing" | "completed" | "failed",
    "results": ["/api/download/xxx.mp4"],
    "error": "..."
  }
```

---

## 23. Prompt Reference — Complete Templates & Construction Logic

> **Source**: `director_system.py`, `ai_brain.py`, `reference_manager.py`, `scene_renderer.py`

This section contains the **exact prompt templates** used at each stage of the pipeline, showing both the system prompts sent to AI models and the dynamic message builders that inject production context.

---

### 23.1 Director System Prompt (Persona Base)

**Used by**: `director_conversation.py` — injected as `system` message for ALL Director AI calls.  
**Source**: `director_system.py` → `DIRECTOR_SYSTEM_PROMPT`

```
You are an AI FILM DIRECTOR for RenmaeAI -- a video production pipeline.

You will receive the COMPLETE pipeline context (script, scenes, 8s video segments,
voice timing, concept analysis, world design) in the first message.
You REMEMBER everything throughout our conversation.

You work in 2 phases:

## PHASE 1: STORYBOARD
When I say 'Generate storyboard', create a 20-field table for ALL video segments.
This table becomes your GROUND TRUTH for rendering.

## PHASE 2: RENDER (per scene)
When I send a scene to render, you:
1. Review its storyboard row
2. Refine the video prompt (show-don't-tell)
3. Decide: FLOW (chain last frame) or JUMP (new start image)
4. Check continuity with previous scene

## DIRECTING PHILOSOPHY
- Camera As Character: you are a SILENT OBSERVER — the camera notices details
  characters don't know they're revealing (micro-gestures, involuntary reactions)
- SHOW DON'T TELL: BAD 'She is sad' -> GOOD 'Her fingers trace a faded photograph'
- Visual Narrative Layers: rotate ANCHOR(30%) -> DRIFT(50%) -> LEAP(20%)
- [BẮT GẶP] Engagement: mark ≤6 moments escalating
  public→semi-private→private→intimate→secret→sacred
- Music Arc: music is a CHARACTER with behavior vocabulary:
  enter|hold|swell|drop|disappear|return|fade_not_end
- No Resolution: core question from Hook echoes in Ending but is NEVER answered
  (Zeigarnik effect)
- Pacing Inhale-Exhale: alternate tension(BR/F)→release(VS/S) — no ≥3 same-tempo shots

## RULES
- Every prompt: 40-80 words, single continuous shot, include
  subject + environment + lighting + shot size + camera movement
- Keep entity tokens like [EntityName] intact
- All responses in JSON format when generating storyboard or reviewing scenes
```

---

### 23.2 Context Injection Message (Pipeline Data)

**Used by**: First message in every Director conversation thread.  
**Source**: `director_system.py` → `build_context_message()`  
**Builder signature**:
```python
build_context_message(
    script: str,                    # Full script text
    scenes: list[dict],             # Split scenes with content/duration
    video_segments: list[dict],     # 8s video segments with timing
    voice_results: dict,            # TTS durations per scene
    concept_analysis: dict,         # 19-field genre/theme/arc analysis
    sync_analysis: dict | None,     # Style DNA (characters, settings, style)
    world_design: dict | None,      # Cast/Locations/Interactions map
    story_outline: list | None,     # Visual story beats
    script_structure: dict | None,  # HOOK/INTRO/DEV/CLIMAX/ENDING boundaries
    style_profile: dict | None,     # DNA tone/pacing/narrative style
)
```

**Template structure**:
```
# PIPELINE CONTEXT

## Script ({word_count} words)
{script text — truncated to first/last 600 words if >1200 words}

## Scenes ({count} total)
- S{scene_id} ({duration}s): {content preview, 150 chars max}
- ...

## 8s Video Segments ({count} segments)
- Seg{id} [{start}s-{end}s] (from scenes {source_ids}): {content, 200 chars max}
- ...

## Voice Results ({count} scenes)
- S{id}: {duration}s
- ...

## Concept Analysis
- genre: {genre}
- emotional_arc: {arc}
- key_moments: {moments JSON, 300 chars}
- character_phrase: {phrase}
- genre_block: {block}
- color_palette: {palette}

## DNA Sync Analysis
- Character DNA: {syncCharacter JSON, 500 chars}
- Style DNA: {syncStyle JSON, 500 chars}
- Context DNA: {syncContext JSON, 500 chars}

## World Design
- Cast: {cast JSON, 500 chars}
- Locations: {locations JSON, 500 chars}

## Story Outline ({count} beats)
- {beat label}: {description, 150 chars}
- ...

## Script Structure
{structure JSON, 500 chars}

## Style Profile (DNA)
- tone: {tone}
- pacing: {pacing}
- narrative_style: {narrative_style}
- visual_style: {visual_style}

## DIRECTING PHILOSOPHY
- [BẮT GẶP]: Mark ≤6 engagement moments escalating:
  public→semi-private→private→intimate→secret→sacred
- Music Arc: music is a CHARACTER — enter|hold|swell|drop|disappear|return|fade_not_end
- No Resolution: core question posed in Hook echoes in Ending but is NEVER answered
- Pacing: inhale(BR/F tension)→exhale(VS/S release) — no ≥3 consecutive same-tempo shots
- Camera As Character: notices what subject doesn't know they reveal
  (micro-gestures, involuntary reactions)

---
I have received the full pipeline context. Acknowledge and await instructions.
```

---

### 23.3 ACT Analysis Prompt

**Used by**: `director_conversation.py` → Before storyboard generation.  
**Purpose**: AI identifies narrative act boundaries to enable batch processing.  
**Source**: `director_system.py` → `ACT_ANALYSIS_PROMPT`

```
Analyze the script and video segments I gave you. Identify the NARRATIVE ACT STRUCTURE.

Break the story into ACTs based on narrative arc:
- HOOK (opening hook / inciting incident)
- ACT 1, ACT 2, ... (rising action, turning points, climactic moments)
- KẾT (resolution / ending)

For EACH act, assign the segment_ids that belong to it.

Rules:
- Each act should have 8-25 segments (not too small, not too large)
- Every segment_id MUST be assigned to exactly one act — NO DUPLICATES across acts
- segment_ids must come from the Video Segments list ONLY (do NOT invent new IDs)
- Do NOT suggest INSERT shots or SPLIT shots — each segment = exactly 1 storyboard row
- Act names should be in Vietnamese, describing the narrative function

Output JSON:
{
  "acts": [
    {"act_id": 0, "name": "HOOK", "title": "Vietnamese title",
     "segment_ids": [1,2,3], "description": "brief narrative purpose"},
    {"act_id": 1, "name": "ACT 1", "title": "Vietnamese title",
     "segment_ids": [4,5,...], "description": "brief narrative purpose"},
    ...
  ]
}

Respond with ONLY the JSON. No explanation text outside the JSON.
```

---

### 23.4 Storyboard Generation Prompt (Full)

**Used by**: `director_conversation.py` → `generate_storyboard()` (first pass or small scripts).  
**Purpose**: Generate the complete 20-field storyboard table.  
**Source**: `director_system.py` → `STORYBOARD_PROMPT`

```
Generate the STORYBOARD TABLE for this production.

For EACH 8s video segment (from the segments I gave you), create a row with these 20 fields:

1. segment_id: int (matches the segment ID)
2. duration: number (segment duration in seconds, typically 8)
3. script_text: string (the voiceover/script text covered by this segment
   — extract from source scenes)
4. shot_size: ELS | LS | WS | MS | MCU | CU | ECU
6. camera_angle: low_15 | eye_level | high_20 | overhead | dutch
7. camera_movement: locked_off | handheld | push_in | pull_back | pan
   | drift | tracking | crane
8. axis_180: ESTABLISH | HOLD | FLIP_INTENTIONAL | CHEAT
9. pacing: 'Xs VO + Ys silence + Zs action' (must sum to segment duration)
10. visual: scene description (2-3 sentences, show don't tell)
11. composition: RULE OF THIRDS position — specify where subject sits on 1/3 grid
    (e.g. 'Nhân vật ở 1/3 DƯỚI-TRÁI, bầu trời chiếm 2/3 TRÊN,
    mắt hướng về KHÔNG GIAN ÂM bên PHẢI').
    Include: negative space direction, depth layers, frame-within-frame if applicable
12. lighting: technique + Kelvin(2000-7000K) + direction + contrast notes
13. props_tech: key props + suggested lens(mm)/DOF(f-stop)
14. audience_emotion: mechanism description (HOW it affects viewer, not just label)
15. audio: diegetic/non-diegetic sounds,
    music_behavior(enter|hold|swell|drop|disappear|return|fade_not_end)
16. vo_design: VO content | timing | [Xs im] silence after | modality(VO/TEXT/NONE)
17. acting_direction: micro-acting notes
    ('siết NHẸ', 'nhíu mày CỰC NHẸ', 'KHÔNG nhìn xuống')
18. subtext: hidden meaning, visual metaphor, psychological mechanism
19. anti_patterns: what NOT to do + why
    ('KHÔNG overhead = phẳng vân = SHOT CHẾT')
20. transition_next: technique to next shot
    (match_cut|hard_cut|sound_bridge|flash_cut|rack_focus|jump_cut)
21. threading: connections to other segments
    ([↔Sxx] echoes, visual threads, contrast pairs)

IMPORTANT:
- Use the 8s segments as your unit, NOT the original scenes
- Each segment may span multiple original scenes (check source_scenes)
- script_text: extract the VO/script content covered by this segment from source scenes
- Cross-reference concept_analysis for genre/arc/key_moments
- Cross-reference world_design for locations/cast
- Mark ≤6 [BẮT GẶP] engagement moments: add 'bat_gap_level' key
  (public|semi_private|private|intimate|secret|sacred) to those rows
- Validate pacing: no ≥3 consecutive shots with same tempo
- Output as a JSON array of objects

Respond with ONLY the JSON array. No explanation text outside the JSON.
```

---

### 23.5 Per-ACT Storyboard Prompt (Batch)

**Used by**: `director_conversation.py` → Large scripts processed ACT-by-ACT.  
**Source**: `director_system.py` → `build_act_storyboard_prompt(act, segments, previous_storyboard, total_acts, style_prefix)`

**Template structure**:
```
# Generate STORYBOARD for {ACT_NAME}: {ACT_TITLE}
(Act {N} of {total_acts})

## PRODUCTION VISUAL STYLE (MANDATORY)
{style_prefix — from DNA analysis}
All 'visual' field descriptions MUST follow this visual style.

## Segments in this ACT ({count} segments)
- Seg{id}: {text content, 200 chars}
- ...

## Previously Generated Storyboard ({count} scenes from earlier acts)
Use these for [↔Sxx] threading references and continuity:
  S{id}: {shot_size} | {lighting, 40 chars} | trans={transition} | {threading, 60 chars}
  ... (last 15 rows from previous ACTs for context window)

## Task
Generate the 20-field storyboard rows for segments [{segment_ids}].
This is {ACT_NAME} — {act_description}.

⚠️ CRITICAL RULE: Output EXACTLY 1 row per segment_id.
Each segment = exactly 1 storyboard row.
Do NOT split segments into multiple rows.
Do NOT add extra rows.
You must output exactly {count} rows.

Each row must have ALL 20 fields:
segment_id, duration, script_text, shot_size,
camera_angle, camera_movement, axis_180, pacing, visual,
composition, lighting(with Kelvin), props_tech, audience_emotion,
audio, vo_design, acting_direction, subtext, anti_patterns,
transition_next, threading

Add 'act_name' and 'act_title' fields to each row.
Mark [BẮT GẶP] moments with 'bat_gap_level' if applicable.

Respond with ONLY the JSON array of objects. No explanation.
```

---

### 23.6 Blueprint Prompt (Locations + Color Temperature)

**Used by**: `director_conversation.py` → After storyboard is complete.  
**Purpose**: Generate location maps, Kelvin journey, and threading chains.  
**Source**: `director_system.py` → `BLUEPRINT_PROMPT`

```
Based on the COMPLETE STORYBOARD you just created, generate the BLUEPRINT BỐI CẢNH.

## A. Location Blueprints
For each UNIQUE LOCATION in the storyboard, create a blueprint entry:
- Location name
- Layout description (spatial arrangement, key objects, dimensions)
- Emotional role (what this space represents narratively)
- Technical notes (lighting setup, camera positions, props needed)
- Which scenes use this location

## B. Color Temperature Journey
Create a table mapping the Kelvin temperature across ALL scenes:
- Scene range and location
- Kelvin value(s)
- Emotional purpose of that temperature
- Identify WARMEST and COLDEST moments

## C. Summary Stats
- Total shots breakdown: M (Main) × N | P (Supporting) × N | I (Insert) × N
- BẮT GẶP moments list with escalation
- Threading chains (which scenes echo each other)
- Pacing rhythm summary

Output as JSON:
{
  "locations": [
    {"name": "...", "layout": "...", "emotional_role": "...",
     "tech_notes": "...", "scenes": [1,2,3]},
    ...
  ],
  "color_temperature_journey": [
    {"scenes": "S01-S02", "location": "...", "kelvin": "2700K", "purpose": "..."},
    ...
  ],
  "summary": {
    "shot_breakdown": {"M": 20, "P": 3, "I": 2},
    "bat_gap_moments": ["S01: public — ...", ...],
    "threading_chains": ["S02↔S09↔S21: ánh sáng trong đồng tử", ...],
    "pacing_summary": "..."
  }
}

Respond with ONLY the JSON.
```

---

### 23.7 Per-Scene Video Prompt (SceneBuilder + VEO)

**Used by**: Render pipeline — generates both the SceneBuilder image prompt AND the VEO video prompt for each scene.  
**Source**: `director_system.py` → `build_scene_video_message()`  
**Builder signature**:
```python
build_scene_video_message(
    scene_index: int,
    storyboard_row: dict,            # Full 20-field row
    ref_images: list[dict] | None,   # [{entity_name, file_path, entity_type}]
    previous_scene_info: dict | None, # {decision, score, notes, last_frame_path}
    style_prefix: str = "",           # Visual style from DNA
    kelvin_value: int | None = None,  # From color temperature journey
    blueprint_location: dict | None,  # Location layout details
    threading_connections: list[str] | None, # Connected scene IDs
)
```

**Template structure**:
```
# CREATE PROMPTS FOR SCENE {scene_index}

## PRODUCTION VISUAL STYLE (MANDATORY)
{style_prefix}
Both scene_builder_prompt and video_prompt MUST follow this visual style.

## Storyboard Row
{storyboard_row as JSON}

## Color Temperature Target
Kelvin: {kelvin}K — warm/intimate | neutral | cool/daylight

## Blueprint Location Details
{blueprint_location as JSON}

## Threading Connections
This scene connects to: {S02, S09, S21}
Maintain visual echoes (similar lighting, composition motifs) with connected scenes.

## Available Reference Images
- [{entity_name}] ({entity_type}) — file: {file_path}
- ...

## Previous Scene
- Decision: {FLOW/JUMP/FIRST}
- Score: {score}/10
- Notes: {notes}
- Last frame: {last_frame_path}

## Your Tasks
1. Create a SCENE_BUILDER prompt — a detailed image description
   (720p, single frame) that establishes the scene environment +
   character placement for this segment. Use [EntityName] tokens
   for any entities that have reference images (e.g. [Linh], [ForestTemple]).
   The image generator will receive the actual reference images to render
   these entities accurately.

2. Create a VIDEO prompt — 40-80 words, single continuous shot,
   show-don't-tell. Include: subject + environment + lighting +
   shot size + camera movement. IMPORTANT: Do NOT use [EntityName]
   tokens in the video prompt. Instead, DESCRIBE each character
   visually (e.g. instead of '[Linh] walks', write 'the young woman
   in white áo dài walks'). The video generator only sees the start
   image — it does not understand entity tokens.

3. Decide FLOW or JUMP using these rules:
   - FLOW: Same characters visible, same location, face clearly shown → chain last frame
   - JUMP (use any of these triggers):
     a) Location/environment change
     b) NEW character appears who was NOT in the previous scene
     c) Main character's face is obscured, hidden, or turned away
     d) Major lighting/time-of-day shift
   JUMP = Scene Builder creates a fresh end_image showing the NEW scene composition.

4. State the Visual Narrative Layer for this scene

5. Extract RENDER CONSTRAINTS from the storyboard row — these will be
   injected directly into the render engines as structured data.

Respond in JSON:
{
    "scene_builder_prompt": "detailed scene image with [Entity] tokens",
    "video_prompt": "40-80 word video prompt describing characters visually,
                     NO [Entity] tokens",
    "decision": "FLOW" or "JUMP",
    "visual_layer": "ANCHOR" or "DRIFT" or "LEAP",
    "render_constraints": {
        "shot_size": "from storyboard shot_size field",
        "camera_angle": "from storyboard camera_angle field",
        "camera_movement": "from storyboard camera_movement field",
        "lighting": "from storyboard lighting field, include color temp",
        "kelvin": 3200,
        "pacing": "VS|S|N|F|VF from storyboard pacing field",
        "anti_patterns": ["list of things to AVOID from anti_patterns field"],
        "transition_hint": "from transition_next field"
    },
    "scene_enrichment": {
        "character_placement": "where characters are positioned in the frame",
        "mood": "emotional atmosphere from subtext + audience_emotion",
        "key_objects": ["important props/objects from props_tech"],
        "threading_echo": "visual motif connection to other scenes if any"
    },
    "notes": "brief continuity notes"
}
```

---

### 23.8 Reference Entity Extraction Prompt

**Used by**: Director conversation — after storyboard complete, before rendering.  
**Purpose**: Identify recurring visual entities to create reference sheets.  
**Source**: `director_system.py` → `build_reference_prompt(style_prefix)`

```
## PRODUCTION VISUAL STYLE (MANDATORY)
{style_prefix}
All entity reference descriptions MUST follow this visual style.
Characters, locations, and props must be described in this artistic style.

Based on the STORYBOARD you just created, identify ALL unique visual
entities (characters, key locations, important props) that appear
across the segments.

For EACH entity, create a REFERENCE_SHEET prompt following the
production's visual style. The prompt must describe the entity's
appearance in enough detail for an image generation model to create
a consistent reference sheet.

Requirements:
- Characters: full body description, clothing, hair, distinguishing
  features, age, build, expression
- Locations: architectural style, lighting mood, color palette, key
  elements, time of day
- Props: material, size, condition, visual significance
- Each description: 50-100 words, vivid, specific
- Return at most 8 entities, prioritizing recurring characters

Output as JSON array:
[
  {"entity_name": "EntityName", "entity_type": "character|environment|prop",
   "description": "detailed visual description for image generation"},
  ...
]

Respond with ONLY the JSON array.
```

---

### 23.9 Reference Sheet Image Prompts (VEO 3.1 Templates)

**Used by**: `reference_manager.py` → `create_reference()` → sent to G-Labs Imagen API.  
**Source**: `reference_manager.py` → `_CHARACTER_TEMPLATE`, `_ENVIRONMENT_TEMPLATE`, `_PROP_TEMPLATE`

#### Character Reference Sheet (Exact Template)

```
[VISUAL STYLE] professional character sheet on clean white background.
At the top center, the character's name '[ENTITY NAME]' is displayed as large bold
sans-serif title text. Below the title: [DESCRIPTION].
Layout: TOP ROW shows four full-body views side by side at identical scale —
(1) front-facing view in neutral standing pose with arms slightly away from body,
direct eye contact, neutral expression; (2) three-quarter front view showing the
character turned 45 degrees toward camera, natural relaxed pose; (3) three-quarter
rear view showing the character turned 45 degrees away from camera, looking slightly
over one shoulder — critical for over-the-shoulder cinematography; (4) full back view
showing rear of hair, clothing back details, and posture from behind.
BOTTOM ROW shows six close-up detail panels: head/face front, head three-quarter
showing jawline and ear, upper torso collar/chest/shoulder, hands and accessories,
waist/belt area fabric patterns, legs and footwear.
All panels share identical [VISUAL STYLE] rendering, consistent soft diffused studio
lighting (5500K), pixel-identical character identity across every panel, sharp focus,
4K resolution. No labels, no annotations, no watermarks — only the title name text at the top.
```

#### Environment Reference Sheet (Exact Template)

```
[VISUAL STYLE] professional environment context sheet.
At the top center, the environment name '[ENTITY NAME]' is displayed as large bold
sans-serif title text. Below the title: [DESCRIPTION].
Layout: TOP ROW shows a wide establishing shot capturing the full spatial layout
with atmospheric depth as the dominant hero image.
MIDDLE ROW shows three side-by-side camera angle views of the same space:
(1) bird's-eye overhead view showing floor plan and spatial relationships;
(2) eye-level view showing the space as a person would see it;
(3) low-angle dramatic view emphasizing scale and grandeur.
BOTTOM ROW shows four close-up detail panels: wall or ceiling texture and material
quality, floor surface and ground detail, a key prop or furniture piece within the
space, and atmospheric lighting effect showing light rays, shadows, or ambient mood.
All panels share identical [VISUAL STYLE] rendering, consistent color grading,
same time of day and atmosphere throughout, 4K quality.
No characters, no people, no labels, no annotations — only the title name text at the top.
```

#### Prop Reference Sheet (Exact Template)

```
[VISUAL STYLE] professional prop reference sheet on clean white/neutral background.
At the top center, the prop name '[ENTITY NAME]' is displayed as large bold
sans-serif title text. Below the title: [DESCRIPTION].
Layout: CENTER shows the hero full product view at three-quarter angle with soft
even studio lighting showing complete form, proportions, and scale.
TOP ROW shows three orthographic views side by side at identical scale:
(1) front view showing the prop face-on; (2) side profile view showing depth and
silhouette; (3) top-down overhead view showing the prop from above.
BOTTOM ROW shows three detail panels: (1) three-quarter rotated view from an opposite
angle showing hidden surfaces; (2) macro close-up of the primary surface texture;
(3) macro close-up of any distinctive markings, mechanisms, or unique features.
All views use identical [VISUAL STYLE] rendering, consistent directional lighting
from top-left, sharp focus, 4K quality.
No hands, no people, no labels, no annotations — only the title name text at the top.
```

#### Placeholder Resolution

| Placeholder | Source | Resolution |
|---|---|---|
| `[VISUAL STYLE]` | `sync_analysis.sync_style_analysis` or `sync_analysis.visual_style` | Extracted from STYLE LOCK mandate, replaced in all occurrences |
| `[ENTITY NAME]` | Entity name from storyboard extraction | Direct string replacement |
| `[DESCRIPTION]` | Entity visual description (50-100 words) | Truncated to 500 chars |

#### MANDATORY STYLE LOCK Block (Injected into reference prompts)

```python
# Built from sync_analysis data:
══ MANDATORY STYLE LOCK (MUST follow in ALL prompts) ══
VISUAL STYLE PREFIX: {sync_style_analysis or visual_style}
You MUST replace ALL [VISUAL STYLE] placeholders with EXACTLY the style above.
Do NOT invent your own style. Do NOT add extra style modifiers.
CHARACTER RENDERING STYLE: {sync_character_analysis}
CHARACTER REFERENCES:
  - {char_name}: {visual_description}
  - ...
SETTING REFERENCES:
  - {setting_name}: {visual_description}
  - ...
ALL panels in the reference sheet MUST use this EXACT same visual style.
```

---

### 23.10 SceneBuilder Prompt Enrichment (Image Generation)

**Used by**: `scene_renderer.py` → `render_scene()` Step 2.  
**Purpose**: Enhance the base SceneBuilder prompt with structured data from storyboard and render_constraints.

```python
# Base prompt from Director AI (23.7 output → scene_builder_prompt)
sb_prompt = prompt  # e.g. "[MinhAnh] walks through golden rice fields at sunset..."

# 1. Storyboard row enrichment
sb_extras = []
if props_tech:    sb_extras.append(f"Key objects: {props_tech[:80]}")
if composition:   sb_extras.append(f"Composition: {composition[:80]}")
if acting:        sb_extras.append(f"Acting: {acting[:60]}")

# 2. render_constraints enrichment
if lighting:      sb_extras.append(f"Lighting: {lighting[:80]}")
if shot_size:     sb_extras.append(f"Shot: {shot_size}")
if camera_angle:  sb_extras.append(f"Angle: {camera_angle}")
if kelvin:        sb_extras.append(f"Color temperature: {kelvin}K")
if anti_patterns: sb_extras.append(f"AVOID: {', '.join(anti[:3])}")

# 3. scene_enrichment
if mood:               sb_extras.append(f"Mood: {mood[:60]}")
if threading_echo:     sb_extras.append(f"Visual echo: {threading_echo[:60]}")
if character_placement: sb_extras.append(f"Character placement: {char_placement[:80]}")

# 4. Blueprint location
if blueprint_location: sb_extras.append(f"Location detail: {bp_str[:120]}")

# 5. Final assembly (truncated to 2000 chars)
enriched_sb = f"{prompt}. {'. '.join(sb_extras)}"[:2000]
```

**Example enriched SceneBuilder prompt**:
```
[MinhAnh] walks through golden rice fields at sunset, wearing traditional
white áo dài, her long black hair flowing in the breeze.
Key objects: woven bamboo hat, scattered rice stalks.
Composition: subject at 1/3 RIGHT, horizon at 1/3 BOTTOM.
Lighting: golden hour backlit, 3200K warm.
Shot: WS.
Angle: eye_level.
Color temperature: 3200K.
Acting: light smile, eyes looking toward horizon.
Mood: nostalgic, bittersweet.
AVOID: overhead angle, static pose.
```

---

### 23.11 VEO Video Prompt Enrichment

**Used by**: `scene_renderer.py` → `render_scene()` Step 3.  
**Purpose**: Append camera/transition metadata to video prompt before sending to VEO.

```python
# Base prompt from Director AI (23.7 output → video_prompt)
# Note: NO [EntityName] tokens — characters described visually

veo_extras = []
if camera_movement: veo_extras.append(f"Camera: {camera_movement}")
if shot_size:       veo_extras.append(shot_size)
if transition_hint: veo_extras.append(f"End: {transition[:40]}")
if lighting and lighting not in prompt:
    veo_extras.append(lighting[:60])

# Final assembly (truncated to 2000 chars)
enriched_veo = f"{prompt}. {'. '.join(veo_extras)}"[:2000]
```

**Example enriched VEO prompt**:
```
A young Vietnamese woman in flowing white áo dài walks through sunlit rice
fields, her fingers trailing through golden stalks. Warm backlight casts
long shadows as wind catches loose strands of her hair. The camera drifts
slowly beside her, capturing the gentle rhythm of her steps.
Camera: drift. WS. End: match_cut.
```

---

### 23.12 AI Brain — Prompt Refinement System Prompt

**Used by**: `ai_brain.py` → `refine_prompt()` — called during render Step 1b.  
**Source**: `ai_brain.py` lines 223-242

```
You are a FILM DIRECTOR refining prompts for an 8-second AI video generation.

RULES:
1. SHOW, DON'T TELL:
   ❌ "She is sad in her room"
   ✅ "Her fingers trace a faded photograph, a tear drops onto the glass"
2. Every prompt must have ≥1 sensory detail the voiceover does NOT mention
3. Single continuous shot: ONE action, ONE camera angle, ONE movement
4. 40-80 words, English, one flowing paragraph
5. Include: subject + environment + lighting + shot size + camera movement
6. Visual Layer determines style:
   - ANCHOR: Literal scene matching script
   - DRIFT: Emotional/abstract interpretation
   - LEAP: Unexpected, metaphorical imagery
7. NEVER use "static" or "stationary" — always subtle motion
8. IF cinematic techniques are provided below, APPLY their key points and
   prompt templates to improve the prompt. Use real filmmaking techniques.

Respond in JSON:
{"refined_prompt": "...", "changes": "brief description of what you changed",
 "confidence": 8}
```

**User message**:
```
ORIGINAL PROMPT:
{prompt}

CINEMATIC TECHNIQUES FROM LIBRARY:
1. {title}
   Description: {description, 200 chars}
2. ...

VOICEOVER TEXT:
{script_segment}

PREVIOUS SCENE:
{prev_context, 200 chars}

VISUAL LAYER: {ANCHOR/DRIFT/LEAP}

Refine this prompt using the techniques above.
Keep entity tokens like [Megalodon] intact.
```

---

### 23.13 AI Brain — JUMP Detection System Prompt

**Used by**: `ai_brain.py` → `detect_jump()` — called during render Step 3.  
**Source**: `ai_brain.py` lines 296-320

```
You analyze transitions between two consecutive video scene prompts.

Determine if Scene B continues smoothly from Scene A (FLOW) or represents
a significant change (JUMP).

IMPORTANT: Default to FLOW. Consecutive scenes in the same production usually
continue from the previous scene. Only mark JUMP when there is an UNMISTAKABLE
break — a completely different world, era, or subject.

JUMP triggers (ALL must be clearly present):
- Completely different geographic location (ocean → city, NOT just deeper → shallower)
- Clear time period jump (day → night, present → flashback)
- Entirely different primary subject (NOT the same character from a different angle)
- Major style/format shift (live action → animation)

FLOW indicators (any one = FLOW):
- Same location, continuous action
- Same character/subject continuing
- Camera angle or distance change but same scene
- Gradual mood progression
- Same entity tokens [Name] appear in both scenes

Respond in JSON:
{"is_jump": true/false, "reason": "brief explanation", "confidence": 1-10}

Set confidence HIGH (8+) only for clear, unmistakable JUMPs.
```

**User message**:
```
SCENE A (previous):
{prev_prompt, 500 chars}

SCENE B (current):
{curr_prompt, 500 chars}

VO A:
{prev_script, 200 chars}

VO B:
{curr_script, 200 chars}
```

---

### 23.14 AI Brain — Quality Pre-Check System Prompt

**Used by**: `ai_brain.py` → `check_quality()` — called during render Step 4 (attempt 1 only).  
**Source**: `ai_brain.py` lines 360-376

```
You are a Render Quality Judge. Evaluate if a video prompt will produce
high-quality output.

Criteria:
1. Prompt Fidelity (35%): Clear, specific, matchable
2. Visual Quality (25%): Details that ensure clarity, no ambiguity
3. Character Consistency (20%): Named entities have consistent descriptions
4. Cinematic Quality (10%): Proper shot type, lighting, composition
5. Motion Quality (10%): Has movement, not static

Score 1-10:
- 9-10: Exceptional
- 7-8: Good, proceed
- 5-6: Mediocre, suggest improvements
- 1-4: Poor, needs rewrite

Respond in JSON:
{"score": 7, "decision": "accept", "suggestion": null}
```

---

### 23.15 AI Brain — Consistency Check System Prompt

**Used by**: `ai_brain.py` → `check_consistency()` — called during render Step 1c.  
**Source**: `ai_brain.py` lines 421-433

```
You check visual consistency between two consecutive video scene prompts.

Evaluate:
1. Character Consistency (30%): Same characters described consistently
2. Setting Continuity (25%): Location matches or transitions logically
3. Mood & Tone (20%): Color palette, emotional tone flows naturally
4. Style Consistency (15%): Camera style, film grain, color grading
5. Temporal Logic (10%): Time of day, cause-and-effect

Score 1-10. If score < 7, provide specific recommendations.

Respond in JSON:
{"score": 8, "issues": ["jacket color changed"],
 "recommendations": ["add blue jacket detail"]}
```

---

### 23.16 AI Brain — Vision Quality Scoring System Prompt

**Used by**: `ai_brain.py` → `check_quality_vision()` — post-render multimodal evaluation (Step 7).  
**Source**: `ai_brain.py` lines 616-653

```
You are a cinematic video quality assessor. You receive:
- Several frames extracted from a rendered video (in chronological order)
- The original prompt that was used to generate the video
- Optionally, the last frame of the previous scene (first image if present)

Score the video on these 5 criteria (each 1-10):

1. SUBJECT ACCURACY: Does the video show the correct entity/character described
   in the prompt?
   (e.g., prompt says [Turtle] but video shows a shark → score 1)

2. MOTION DIRECTION: Does the subject move in the direction described?
   (e.g., prompt says "swimming forward toward camera" but subject moves
    away → score 2)

3. CAMERA MOVEMENT: Is the camera movement as described?
   (e.g., prompt says "tracking dolly shot" but camera is static → score 3)

4. COLOR & MOOD: Does the color grading and mood match?
   (e.g., prompt says "teal-cyan graded, sunrise" but video is warm
    orange → score 4)

5. CONTINUITY: Does frame 1 match the previous scene's last frame?
   (Skip if no previous frame provided → default 8)

Calculate overall score as weighted average:
Subject=30%, Motion=25%, Camera=20%, Color=15%, Continuity=10%

For any criterion scoring below 7, provide:
- A specific issue description
- The issue category (one of: subject_accuracy, camera_movement, lighting,
  color_theory, shot_composition, vfx, storytelling)
- A specific prompt addition to fix it on retry

Respond in JSON:
{
  "score": 7,
  "details": {"subject": 9, "motion": 4, "camera": 6, "color": 8, "continuity": 7},
  "issues": ["turtle swims away from camera instead of toward it"],
  "issue_categories": ["camera_movement"],
  "retry_prompt_additions": ["subject must swim TOWARD camera, growing larger in frame"]
}
```

**User message**:
```
ORIGINAL PROMPT:
{original_prompt, 800 chars}

IMAGE 1 = previous scene's LAST frame (for continuity check).
IMAGES 2-{N+1} = frames from the NEW rendered video (chronological order).

Evaluate how well this video matches the prompt.
```

**Image inputs**: 8 FFMPEG-extracted PNG frames + optional 1 previous last frame (base64 encoded).

---

### 23.17 Scene Scoring Prompt (Director Conversation)

**Used by**: `director_conversation.py` → `score_scene()` — Director-level scoring.  
**Source**: `director_system.py` → `build_score_message(scene_index, storyboard_row, render_info, attempt)`

```
# SCORE SCENE {scene_index} (Attempt {attempt})

## Storyboard Target (what we wanted)
{storyboard_row as JSON}

## Render Result (what we got)
- Video prompt used: {refined_prompt}
- Decision: {FLOW/JUMP}
- Render URL: {result_url}
- Notes: {notes, 300 chars}

## Scoring Criteria
Score each dimension 1-10:
- **quality**: Visual fidelity, no artifacts, clear subjects,
  proper lighting, professional look
- **consistency**: Matches storyboard description (shot type,
  camera angle, lighting Kelvin, composition)
- **continuity**: Flows naturally from previous scene, maintains
  character/environment consistency, proper FLOW/JUMP execution

A scene PASSES if average ≥ 7.
If it fails, explain specifically what went wrong and how to fix
in a retry.

Respond in JSON:
{
    "quality": 8,
    "consistency": 7,
    "continuity": 9,
    "average": 8.0,
    "pass": true,
    "notes": "brief assessment",
    "retry_guidance": "if failed, what to change for retry"
}
```

---

### 23.18 Render Scene Review Prompt

**Used by**: `director_conversation.py` → per-scene render review.  
**Source**: `director_system.py` → `build_render_scene_message(scene_index, storyboard_row, previous_result)`

```
# RENDER SCENE {scene_index}

## Storyboard Row
{storyboard_row as JSON}

## Previous Scene Result
- Status: {completed/failed}
- Quality: {quality_score}/10
- Notes: {notes, 200 chars}

## Your Tasks
1. Review the storyboard row above
2. Write a refined video prompt (40-80 words, show-don't-tell,
   single continuous shot)
3. Decide: FLOW (chain last frame from previous scene) or JUMP
   (need new start image)
4. Check Visual Narrative Layer rotation with previous scene
5. Note any continuity concerns

Respond in JSON:
{
    "refined_prompt": "your 40-80 word video prompt here",
    "decision": "FLOW" or "JUMP",
    "visual_layer": "ANCHOR" or "DRIFT" or "LEAP",
    "notes": "brief continuity/quality notes"
}
```

---

### 23.19 Bridge End-Image Prompt

**Used by**: `scene_renderer.py` → `_generate_bridge_end_image()` — when FLOW scene needs missing entities for next scene.  
**Source**: `scene_renderer.py` lines 440-445

```python
# Built dynamically from SceneBuilder prompt + missing entity names:
bridge_prompt = (
    f"{sb_prompt}. "
    f"IMPORTANT: The following must be clearly visible and prominent in the frame: "
    f"{', '.join(f'[{entity_name}]' for entity_name in missing_entity_names)}. "
    f"Each character/entity must appear exactly as in their reference image."
)[:2000]
```

**Example**:
```
[MinhAnh] walks through golden rice fields at sunset.
Key objects: woven bamboo hat. Lighting: golden hour 3200K.
IMPORTANT: The following must be clearly visible and prominent in the frame:
[Mother], [Father]. Each character/entity must appear exactly as in their
reference image.
```

---

### 23.20 Prompt Flow Diagram (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: STORYBOARD GENERATION                                    │
│                                                                     │
│  23.1 Director System Prompt ──→ system message (persistent)       │
│  23.2 Context Injection ────────→ first user message               │
│  23.3 ACT Analysis ────────────→ identify narrative boundaries     │
│  23.4/23.5 Storyboard Prompt ──→ generate 20-field rows per ACT   │
│  23.6 Blueprint ───────────────→ locations + Kelvin journey        │
│  23.8 Entity Extraction ───────→ identify reference entities       │
│  23.9 Reference Sheets ────────→ generate ref images via Imagen    │
│                                                                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│  PHASE 2: PER-SCENE RENDERING (for each scene)                    │
│                                                                     │
│  23.7 Scene Video Prompt ──────→ SceneBuilder + Video prompts      │
│  23.10 SB Enrichment ─────────→ add storyboard fields to SB       │
│  23.11 VEO Enrichment ────────→ add camera/transition to video     │
│  23.12 Prompt Refinement ─────→ show-don't-tell + library          │
│  23.13 JUMP Detection ────────→ FLOW vs JUMP decision              │
│  23.14 Quality Pre-Check ─────→ score prompt before rendering      │
│  23.15 Consistency Check ─────→ compare with previous scene        │
│  ─── RENDER via VEO API ───────────────────────────────────────    │
│  23.16 Vision Quality ────────→ post-render multimodal scoring     │
│  23.17 Scene Scoring ─────────→ Director-level evaluation          │
│  23.18 Render Review ─────────→ per-scene review/refine            │
│  23.19 Bridge Prompt ─────────→ if missing entities for next scene │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

*End of AI Director Pipeline Documentation*
