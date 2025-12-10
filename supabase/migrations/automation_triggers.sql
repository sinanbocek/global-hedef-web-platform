-- Trigger Function to handle automatic commission distribution
CREATE OR REPLACE FUNCTION public.handle_policy_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- CASE 1: New Policy Created OR Policy Updated
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE') THEN
    -- If status is Active, distribute commission
    -- We re-run distribution even on update to ensure amounts are correct if premium changed
    IF NEW.status = 'Active' THEN
      -- Call existing distribution logic
      -- This function should be idempotent or handle re-calculation
      PERFORM public.distribute_policy_commission(NEW.id);
    END IF;
  END IF;

  -- CASE 2: Policy Deleted
  IF (TG_OP = 'DELETE') THEN
    -- Remove associated commission distributions to keep financial data clean
    DELETE FROM public.commission_distributions WHERE policy_id = OLD.id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the Trigger
DROP TRIGGER IF EXISTS on_policy_change ON public.policies;

CREATE TRIGGER on_policy_change
AFTER INSERT OR UPDATE OR DELETE ON public.policies
FOR EACH ROW EXECUTE FUNCTION public.handle_policy_changes();
