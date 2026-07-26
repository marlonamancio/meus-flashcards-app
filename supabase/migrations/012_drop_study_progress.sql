-- study_progress is obsolete: SM-2's due_date (flashcard_schedule, migration 010) already tracks
-- per-card review state, so "resume where I left off" falls out for free — a session closed
-- mid-way just leaves the still-unanswered cards due, no separate progress table needed. See
-- CLAUDE.md item 6.
DROP TABLE public.study_progress;
