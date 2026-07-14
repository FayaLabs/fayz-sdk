-- 000_plg_rename.sql — rename legacy tasks tables to plg_tasks_* for pools
-- provisioned before the industry-pool rename. Guarded: fires only when legacy
-- name exists and target does not, so fresh pools skip every branch.
DO $$
BEGIN
  IF to_regclass('public.tsk_tasks') IS NOT NULL AND to_regclass('public.plg_tasks_tasks') IS NULL THEN
    ALTER TABLE public.tsk_tasks RENAME TO plg_tasks_tasks;
  END IF;
  IF to_regclass('public.tsk_labels') IS NOT NULL AND to_regclass('public.plg_tasks_labels') IS NULL THEN
    ALTER TABLE public.tsk_labels RENAME TO plg_tasks_labels;
  END IF;
END $$;
