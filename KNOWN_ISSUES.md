# Known Issues

## Three `FolderAPITests` failures are stale tests, not product bugs

`files/tests.py::FolderAPITests` has three failing tests on `main`. They are **not**
inherited from anywhere and they do **not** indicate broken folder behaviour in the
running app. They are tests that were written against the old product-scoped folder
API and never updated when folders were re-scoped to a stage/iteration.

Current state: 9 of 12 pass, 3 fail.

| Test | Symptom | What is actually broken |
| --- | --- | --- |
| `test_create_folder` | `400 != 201` | The test posts `{'name', 'product'}`. `product` is read-only on `FolderSerializer` and `create()` now requires `stage_id` or `iteration_id`, so the request is rejected with *"Either stage_id or iteration_id must be provided."* |
| `test_move_file_into_folder_and_back_to_root` | `400 != 200` | The fixture builds its folder with `Folder.objects.create(product=...)`, leaving `content_type_id`/`object_id` NULL. The file lives in a stage, so the update-path check in `FileSerializer.validate` rejects the move with *"Folder must be in the same stage/iteration as the file."* |
| `test_move_folder_across_products_rejected` | `200 != 400` | Same container-less fixtures. `FolderSerializer.validate` guards its container check with `if ct_id and ...`; `ct_id` is `None`, so the check is skipped entirely and the cross-product reparent is accepted. |

### Root cause

Commit `bdc708a` (2026-07-22, *"feat: per-iteration folders, file rename, and crash-safe
previews"*) moved folders from being scoped to a **product** to being scoped to a
**stage or iteration**, adding `content_type`/`object_id` to `Folder` via migrations
`0013` and `0014`. `files/tests.py` was last touched in `457f15b` (2026-07-08), two weeks
earlier, and was not updated alongside that change.

All three failures share one cause: the fixtures create folders with `product=` only, so
those folders have no container, and the container-aware API either rejects them or
short-circuits its validation on them.

### How this was confirmed

Verified by running the identical suite either side of the suspect commit, in throwaway
worktrees off this repo's own history:

| Commit | Result |
| --- | --- |
| `f38ea5d` (`bdc708a~1`) | `Ran 12 tests ... OK` — all pass |
| `bdc708a` | `FAILED (failures=3)` — the same three, same assertions |
| `0257367` (current `main`) | `FAILED (failures=3)` — unchanged since |

There is no upstream or parent repository to compare against: `origin` is
`github.com/t-veera/mini-plm`, GitHub reports it is not a fork, and the full 126-commit
history starts at `90c1db1` "Initial commit". The comparison above — this repo against
its own history — is the equivalent check.

### Relevant code

- `files/tests.py:35` — `test_create_folder`
- `files/tests.py:79` — `test_move_folder_across_products_rejected`
- `files/tests.py:113` — `test_move_file_into_folder_and_back_to_root`
- `files/serializers.py:114-130` — `FolderSerializer.validate`, container guard at line 120
- `files/serializers.py:132-150` — `FolderSerializer.create`, requires `stage_id`/`iteration_id`
- `files/serializers.py:356-359` — `FileSerializer.validate`, folder/file container match

### Fix

Update the three fixtures to create folders through the container-scoped API
(`stage_id`/`iteration_id`) instead of `product=`. The tests have not been marked
`@skip` or `@expectedFailure`, because the failures are accurate signal about stale
tests rather than a known defect to be suppressed.

One genuine gap is worth noting separately: the `if ct_id and ...` guard in
`FolderSerializer.validate` means a folder with no container accepts any parent, including
one from another product. The API never creates container-less folders, so this is not
reachable in normal use — only through direct ORM writes like these fixtures.

### CI

The only workflow, `.github/workflows/docker-publish.yml`, builds and publishes Docker
images and does not run the Django test suite. No CI output reports these failures, and
no message in the repo describes mini-plm as failing on their account.
