# Writing documents the traceability matrix can read

The matrix indexes markdown you upload into any stage or iteration. It does not invent
structure — it reads IDs and references you write yourself. These are the rules it
follows, so a doc written this way is indexed with no configuration.

Nothing here is a new syntax. It is ordinary markdown; the parser just needs each item
it should track to have a name.

---

## 1. Name the file so its type is obvious

The document type comes from a **keyword anywhere in the filename**, matched
case-insensitively. Position does not matter, so any numbering scheme you like may sit
in front of it — `5_INKFRAME-ARCH-I2-001.md` is an ARCH document even though ARCH is the
second document logically and the fifth by prefix.

| Type | Filename contains | Examples |
|------|-------------------|----------|
| PRD | `prd`, `product requirement` | `PRD.md`, `1_INKFRAME-PRD-001.md` |
| ARCH | `arch`, `sys_arch`, `system architecture` | `Architecture.md`, `5_INKFRAME-ARCH-I2-001.md` |
| RISK | `fmea`, `risk`, `hazard` | `FMEA.md`, `3_INKFRAME-RISK-I2-001.md` |
| SRS | `srs`, `spec`, `requirement` | `001_Requirements.md`, `2_INKFRAME-SRS-I2-001.md` |
| VERIF | `verification`, `verif`, `ver`, `test`, `tst`, `acceptance` | `7_INKFRAME-TST-I2-001.xlsx`, `001_Test_Protocol.md` |
| VAL | `validation`, `val` | `Validation_Report.md` |

**Several files may feed one column.** Two verification documents both index into
Verification; neither overwrites the other.

`ver` and `val` only count as whole words, and `test` only at the start of one, so
`PRD_Version2.md`, `Design_Overview.md` and `Latest_Notes.md` are not verification
documents.

More specific wins: `verification_spec.md` is VERIF, not SRS, because `spec` and
`requirement` are generic — every document type uses those words — and only mean SRS when
nothing more specific is in the name.

### Files that never index

| Filename contains | Why |
|---|---|
| `scope` | A narrative planning document. Uploads and previews normally; carries no IDs to track. |
| `bench` | Raw bench data, keyed by test point rather than by ID. |
| `gate_review` | A meeting record. |

These upload, store, preview and download exactly like any other file — they are simply
never sent to the parser. A filename matching none of the keywords is also skipped, but
it is **logged as a warning**: if you expected a document in the matrix and it is not
there, the log says why.

If a filename matches two different types (`Risk_and_Test_Plan.md`), nothing is guessed —
the file is skipped and the clash is logged. Rename it so one type is unambiguous.

---

## 1a. Spreadsheets

A test protocol may be an `.xlsx` instead of markdown. The sheet named **Test Protocol**
(or the first sheet with an `ID` column) is read; the workbook's other sheets — overview,
run summary, findings — are ignored.

The header row does not have to be row 1: a title block above it is normal and is skipped.
Columns are found by name, the same way a markdown table's are:

| Column | Recognised by | Becomes |
|---|---|---|
| `ID` | `id`, `tag`, `ref` | the node's ID |
| `Test Name` | `name`, `title`, `test`, `description`, … | its title |
| `Run 1 Status`, `Run 2 Status` | `status`, `verdict`, `outcome` | PASS / FAIL |

With more than one run column the **rightmost one that has been filled in** is the
verdict, so a later FAIL is not masked by an earlier PASS. A `Pass Criteria` column is
prose, not a result, and is never read as one.

An ID must be at the **start** of its cell. A section banner in the ID column
(`INPUT — audit T08 before running this section`) mentions T08; it does not declare it.

**Careful:** a bare `Requirements.md` is an **SRS**, not a PRD. Only an explicit `prd` or
"product requirement" makes a PRD. This is deliberate — a project usually has one PRD and
a fuller requirements spec, and they must not fight over the same slot.

---

## 2. Give every item an ID, at the start of its line

An ID is recognised when it sits at the **head of a line** — after a heading marker, a
bullet, a number, or bold — or in the **first column of a table**. That is what separates
something you are *declaring* from something you are *mentioning*.

```markdown
### T01 — Cold Boot Time                     <- declares T01
- **SRS-101** MCU: ESP32-S3-N16R8            <- declares SRS-101
| SRS-301 | Cold boot | ≤ 8 seconds |        <- declares SRS-301

The boot path (see T01) is timed separately.  <- mentions T01, declares nothing
```

### Recognised prefixes

`PRD` `R` `REQ` `FR` `NFR` `AC` · `ARCH` `ARC` `BLOCK` `IFACE` · `RISK` `RSK` `HAZ` ·
`SRS` `SR` · `TC` `T` `TEST` `TST` `VER` `VERIF` · `VAL` · `G` `OQ`

Three shapes are recognised:

| Shape | Example | |
|---|---|---|
| `TYPE-NNN` | `RSK-101`, `REQ-01` | flat |
| `TYPE-ITER-NNN` | `FR-I2-014`, `BLOCK-I2-002` | with an iteration marker |
| `TYPE-SUB-NN` | `PRD-SYS-09` | with a subsystem marker |

plus the glued form `T01` / `R001` for legacy schemes. `R001`, `R-001` and `r1` are
treated as the same item.

`FR`, `NFR` and `AC` need the hyphen and at least two digits — `FR-014`, not `FR4` —
because `FR4` is a PCB laminate and `AC` is a supply rail, and both appear in these
documents in their ordinary engineering sense. The same guard is why part numbers
(`TP4056`, `AO3401`, `GDEQ0583T31`), pin names (`GPIO45`) and test points (`TP24`) sitting
in the middle of a requirement never index as IDs.

### When a link is missing

Parsed cross-references will not catch every real connection — a requirement whose parent
is only implied, an inherited capability nobody wrote a `Traces To` for. Select the node
in the matrix and use **Link to…** in the side drawer to draw the link by hand. Hand-drawn
links render as a **dashed** connector; parsed ones stay solid.

A hand-drawn link can be removed from the same drawer. A parsed one cannot — it is what
the document says, and it would return on the next parse, so break it in the document
instead. Manual links are never removed automatically: if a later edit makes the same
connection parseable, both exist, which is harmless.

Note that an intermediate item (a spec, an architecture block) needs a link on **both**
sides to stop counting as an orphan — one upstream link alone still leaves it red.

**A prefix that names a kind overrides the document it sits in.** `RSK-014` inside
`PRD.md` is indexed as a RISK, not a PRD item — so a risk register can live inside a
larger document. `R`/`REQ` have no inherent kind and take the document's type.

**`V` is not a valid prefix** — `V1`/`V2` version markers are too common in product docs
to distinguish from IDs. Hardware tokens are safe: `GPIO15`, `ESP32`, `TP4056`, `UC8179`
and `SPI2` never match, because the digits must follow the prefix immediately.

### Number in blocks, not one long run

Give each section its own hundred: `SRS-1xx` hardware, `SRS-2xx` software, `SRS-3xx`
performance. Inserting a requirement later then never renumbers anything downstream.
For sectioned docs, derive the ID from the section number — `### 2.1` → `ARCH-201`.

---

## 3. Link items with words you already write

A reference makes an edge from the item named to the item you are writing. Direction is
always **upstream → local**, so all of these point the right way on their own:

```markdown
**ARCH-201** — Processing Unit
**Satisfies:** SRS-101, SRS-102

### T01 — Cold Boot Time
**Verifies:** SRS-301

- **SRS-12** Partial refresh controller. Satisfies ARCH-1. Mitigates RISK-04.
```

Recognised words: *satisfies, traces to, derived from, mitigates, addresses, verifies,
validates, implements, covers, tests, refines, fulfils, parent, upstream*.

A reference attaches to the **most recently declared ID above it**, so keep the link line
directly under the item it belongs to.

In tables, a column headed *Traces To*, *Parent*, *Upstream*, *Satisfies*, *Derived From*
or *Source* does the same thing for every row:

```markdown
| ID | Hazard | Traces To | Subsystem |
|----|--------|-----------|-----------|
| RISK-04 | Ghosting after partial refresh | ARCH-1 | display |
```

---

## 4. Optional columns the parser understands

In a table, these headers are read automatically:

- **ID / Tag / Ref** — where the item's ID lives. Defaults to the first column.
- **Title / Description / Test / Hazard / Item / Name** — the item's title. Falls back to
  the first column that is not IDs.
- **Status / Result / Verdict** — `PASS` / `FAIL` on a test. Also reads ✅ and ❌.
  Anything else (including `⬜ Pending`) leaves the test with no result yet.
- **Subsystem / Module / Component / Area** — groups the item, and drives the subsystem
  filter in the matrix. An explicit *Subsystem* column always beats a looser synonym.

Outside a table, write `Subsystem: display` on the item's line.

---

## 5. What makes an item green

Status is computed when you open the matrix, from the container you are viewing:

- **GREEN** — a complete chain downstream ending in a test marked `PASS`.
- **YELLOW** — declared but not finished: no passing test yet, or the only passing test
  comes from an *earlier* container than the item itself (the item changed after it was
  last tested — stale).
- **RED** — broken: an orphan (a PRD with nothing below it, a test with nothing above it,
  or a middle item missing either side), or anything upstream of a `FAIL`.

So a full chain needs all four links present:

```
PRD-01  ->  ARCH-201  ->  SRS-101  ->  T01 (PASS)
```

Miss any one and everything above it goes red. In particular, **architecture and spec
items need something above them as well as below** — tagging only your SRS and tests
leaves the whole column red, because nothing upstream claims them.

---

## 6. Where documents live

Upload a doc into the stage or iteration it belongs to. **A container shows only the
documents uploaded into it**, so a doc type with nothing indexed in the container you are
viewing reads as an empty column.

There is deliberately no inheritance from earlier containers. An iteration's scope
routinely diverges from the one before it — requirements dropped, a different direction
taken — so presenting I2's requirements while you are looking at I3 would show superseded
content as though it were still in force. An empty column is the more honest answer: it
says the document has not been uploaded here yet. Carry a document forward by uploading it
into the later container.

The continuous IIL order — `I1 → I2 → I3 → S1 → I4`, by container creation time — still
matters for status: a passing test older than the item it covers marks that item yellow
rather than green, because the item has changed since it was last verified.

Re-uploading the same file with the same name creates a revision and reindexes it
automatically. Byte-identical re-uploads are skipped.
