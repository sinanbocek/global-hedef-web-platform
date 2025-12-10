-- ==========================================
-- COMMISSION PAYMENT MODULE MIGRATION
-- ==========================================

-- 1. Create Payments Table
CREATE TABLE IF NOT EXISTS public.commission_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_no SERIAL, -- Simple incrementing number for reference
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('salesperson', 'partner', 'company')),
    recipient_id TEXT NOT NULL, -- Salesperson ID (text) or Partner ID (uuid casting to text)
    recipient_name TEXT, -- Snapshot of name at time of payment
    amount NUMERIC(12,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
    payment_method TEXT, -- 'bank_transfer', 'cash', etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- Optional: Reference to auth.users if available
);

-- 2. Add Payment References to Existing Tables

-- Link Commission Distributions (Salesperson Share) to Payments
ALTER TABLE public.commission_distributions 
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.commission_payments(id);

-- Link Partner Allocations (Partner Share) to Payments
ALTER TABLE public.partner_commission_allocations
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.commission_payments(id);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_payments_recipient ON public.commission_payments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.commission_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_distributions_payment ON public.commission_distributions(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.partner_commission_allocations(payment_id);

-- 4. RLS
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for all" ON public.commission_payments;
CREATE POLICY "Enable all for all" ON public.commission_payments FOR ALL USING (true);

-- 5. Helper Function: Create Key Payment
-- This function handles the transaction of creating a payment and marking related records as paid.

CREATE OR REPLACE FUNCTION public.create_commission_payment(
    p_recipient_type TEXT,
    p_recipient_id TEXT,
    p_recipient_name TEXT,
    p_amount NUMERIC,
    p_description TEXT,
    p_distribution_ids UUID[], -- Array of commission_distributions.id to mark as paid (for salespeople)
    p_allocation_ids UUID[]    -- Array of partner_commission_allocations.id to mark as paid (for partners)
)
RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
BEGIN
    -- 1. Create Payment Record
    INSERT INTO public.commission_payments (
        recipient_type, recipient_id, recipient_name, amount, description, status
    ) VALUES (
        p_recipient_type, p_recipient_id, p_recipient_name, p_amount, p_description, 'paid'
    ) RETURNING id INTO v_payment_id;

    -- 2. Link Salesperson Distributions (if any)
    IF p_distribution_ids IS NOT NULL AND array_length(p_distribution_ids, 1) > 0 THEN
        UPDATE public.commission_distributions
        SET payment_id = v_payment_id,
            status = 'completed' -- Ensure they are marked completed/paid
        WHERE id = ANY(p_distribution_ids);
    END IF;

    -- 3. Link Partner Allocations (if any)
    IF p_allocation_ids IS NOT NULL AND array_length(p_allocation_ids, 1) > 0 THEN
        UPDATE public.partner_commission_allocations
        SET payment_id = v_payment_id,
            payment_status = 'paid',
            payment_date = CURRENT_DATE
        WHERE id = ANY(p_allocation_ids);
    END IF;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;
