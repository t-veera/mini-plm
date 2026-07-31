# Writing documents the traceability matrix can read

The matrix indexes markdown you upload into any stage or iteration. It does not invent
structure — it reads IDs and references you write yourself. These are the rules it
follows, so a doc written this way is indexed with no configuration.

Nothing here is a new syntax. It is ordinary markdown; the parser just needs each item
it should track to have a name.

---

## 1. Name the file so its type is obvious

The document type comes from the **filename**, matched case-insensitively:

| Type | Filename contains | Examples |
|------|-------------------|----------|
| PRD | `prd`, `product requirement` | `PRD.md`, `Product_Requirements.md` |
| ARCH | `architecture`, `sys_arch` | `Architecture.md`, `sys_arch.md` |
| RISK | `fmea`, `risk`, `hazard` | `FMEA.md`, `Risk_Register.md` |
| SRS | `srs`, `spec`, `requirement` | `001_Requirements.md`, `SRS.md` |
| VERIF | `verif`, `test_protocol`, `test_plan`, `test_case`, `acceptance` | `001_Test_Protocol.md` |
| VAL | `validation`, `val` | `Validation_Report.md` |

More specific wins: `verification_spec.md` is VERIF, not SRS. A filename matching none of
these is skipped entirely and indexes nothing — that is how you keep `README.md` and
meeting notes out of the matrix.

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

`PRD` `R` `REQ` · `ARCH` `ARC` · `RISK` `RSK` `HAZ` · `SRS` `SR` · `TC` `T` `TEST` `TST`
`VER` `VERIF` · `VAL` · `G` `OQ`

Followed by 1–4 digits, with an optional hyphen: `R001`, `REQ-01`, `SRS-301`, `T01`,
`RSK-014`. `R001`, `R-001` and `r1` are treated as the same item.

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

Upload a doc into the stage or iteration it belongs to. The matrix walks the continuous
IIL order — `I1 → I2 → I3 → S1 → I4` — ordered by when each container was created.

For each of the six types it uses the newest document **at or before** the container you
are viewing, and inherits forward otherwise. Re-upload a doc into a later container only
when it actually changes; until then the earlier one keeps applying, and the matrix shows
it as *inherited*.

Re-uploading the same file with the same name creates a revision and reindexes it
automatically. Byte-identical re-uploads are skipped.
