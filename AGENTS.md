# Agent instructions for this repo

## Writing style: no em-dashes in guiding text

Never use em-dashes (—) in learner-facing guiding text: the lesson content in
`apps/dashboard/src/lessons/*.ts` (`title`, `concept`, `instruction`, `saw`,
`takeaway`, `source.note`, and any bullet/list strings inside those fields),
and any other prose shown to a learner in the dashboard UI.

Rewrite the sentence with whatever punctuation actually fits instead of doing
a blind find-and-replace:

- Elaboration or explanation: use a colon (`X: Y`).
- A trailing aside joined with "and"/"but"/"which": use a comma.
- A true parenthetical: use parentheses.
- Two independent statements: split into two sentences.
- A short list label: use a colon (`NAME: description`), not `NAME — description`.

This does not apply to code comments (JSDoc, `teach:` comments, etc.), those
are developer-facing and out of scope.

If a `command:` field's literal text changes (e.g. an `echo` string), check
`apps/dashboard/src/generated/recordings.json` for a matching entry (keyed
`"<lessonId>:<stepIndex>"`) and update its `command`/`output` fields to match,
so the hosted demo replay stays consistent with the live command.

## Efficiency

- Don't scan or read the entire codebase to answer a narrow question. Use
  targeted `grep`/`find`/glob searches to locate exactly what's relevant,
  then read only those files.
- Don't re-read a file immediately after writing or editing it. The tool
  already confirms the write succeeded; trust it.
- Scope changes to what was actually asked. Don't refactor, reformat, or
  "clean up" unrelated code while making an unrelated change.
- Prefer editing existing files over creating new ones. Don't create
  documentation, planning, or summary files unless explicitly requested.
- When a change touches many similar call sites (e.g. bulk text edits across
  several files), batch them: read each file once, then write all the
  replacements for that file before moving to the next, rather than
  round-tripping reads and edits one instance at a time.
- Verify with the narrowest check available (e.g. `tsc --noEmit` for a
  TypeScript-only content change) instead of running the full build/test
  suite when it isn't necessary to confirm correctness.
