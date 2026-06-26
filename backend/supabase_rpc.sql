-- Supabase Serverless RPC Functions
-- Copy and paste this entirely into the Supabase SQL Editor and click RUN

-- 1. ADD FUNDS FUNCTION
CREATE OR REPLACE FUNCTION public.add_funds(
    p_user_id TEXT,
    p_amount NUMERIC,
    p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance NUMERIC;
BEGIN
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Update wallet balance
    UPDATE public.users
    SET "walletBalance" = COALESCE("walletBalance", 0) + p_amount
    WHERE uid = p_user_id
    RETURNING "walletBalance" INTO v_new_balance;

    -- Add wallet history
    INSERT INTO public.wallet_history ("userId", "type", amount, description)
    VALUES (p_user_id, 'add_funds', p_amount, 'Added funds via ' || p_payment_method);

    RETURN jsonb_build_object(
        'success', true,
        'newBalance', v_new_balance,
        'message', 'Funds added successfully'
    );
END;
$$;


-- 2. CREATE ORDER FUNCTION
-- This handles balance deduction, farmer crediting, and 12.5% royalty distribution
CREATE OR REPLACE FUNCTION public.create_order(
    p_buyer_id TEXT,
    p_buyer_name TEXT,
    p_buyer_role TEXT,
    p_total_amount NUMERIC,
    p_shipping_address TEXT,
    p_items JSONB -- Array of order items
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_balance NUMERIC;
    v_order_id UUID;
    v_item JSONB;
    v_royalty_amount NUMERIC;
    v_seller_credit NUMERIC;
    v_profit_per_unit NUMERIC;
    v_sold_qty NUMERIC;
    v_tot_qty NUMERIC;
    v_new_status TEXT;
BEGIN
    -- 1. Verify Buyer Balance
    SELECT "walletBalance" INTO v_buyer_balance FROM public.users WHERE uid = p_buyer_id;
    IF v_buyer_balance IS NULL THEN
        RAISE EXCEPTION 'Buyer not found';
    END IF;

    IF v_buyer_balance < p_total_amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Please add funds.';
    END IF;

    -- 2. Create Order
    INSERT INTO public.orders ("buyerId", "buyerName", "buyerRole", "totalAmount", "shippingAddress", status)
    VALUES (p_buyer_id, p_buyer_name, p_buyer_role, p_total_amount, p_shipping_address, 'pending')
    RETURNING id INTO v_order_id;

    -- 3. Deduct from Buyer
    UPDATE public.users
    SET "walletBalance" = "walletBalance" - p_total_amount
    WHERE uid = p_buyer_id;

    INSERT INTO public.wallet_history ("userId", "type", amount, "orderId", description)
    VALUES (p_buyer_id, 'debit', p_total_amount, v_order_id, 'Payment for order ' || v_order_id);

    -- 4. Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Insert Order Item
        INSERT INTO public.order_items ("orderId", "cropId", "farmerId", "cropName", quantity, unit, "pricePerUnit", "totalPrice")
        VALUES (
            v_order_id, 
            (v_item->>'cropId')::UUID, 
            v_item->>'farmerId', 
            v_item->>'cropName', 
            (v_item->>'quantity')::NUMERIC, 
            v_item->>'unit', 
            (v_item->>'pricePerUnit')::NUMERIC, 
            (v_item->>'totalPrice')::NUMERIC
        );

        -- Royalty Calculation
        v_royalty_amount := 0;
        v_seller_credit := (v_item->>'totalPrice')::NUMERIC;

        IF (v_item->>'originalFarmerId') IS NOT NULL AND (v_item->>'originalPrice') IS NOT NULL THEN
            v_profit_per_unit := (v_item->>'pricePerUnit')::NUMERIC - (v_item->>'originalPrice')::NUMERIC;
            IF v_profit_per_unit > 0 THEN
                v_royalty_amount := (v_profit_per_unit * (v_item->>'quantity')::NUMERIC) * 0.125;
                v_seller_credit := v_seller_credit - v_royalty_amount;

                -- Credit Original Farmer
                UPDATE public.users SET "walletBalance" = COALESCE("walletBalance", 0) + v_royalty_amount WHERE uid = v_item->>'originalFarmerId';
                
                INSERT INTO public.wallet_history ("userId", "type", amount, "orderId", description)
                VALUES (v_item->>'originalFarmerId', 'royalty', v_royalty_amount, v_order_id, '12.5% Royalty from resale of ' || (v_item->>'cropName'));
                
                INSERT INTO public.notifications ("userId", title, message)
                VALUES (v_item->>'originalFarmerId', 'Royalty Credited! 🎉', 'You received ₹' || v_royalty_amount || ' royalty from a trader''s resale.');
            END IF;
        END IF;

        -- Credit Seller
        UPDATE public.users SET "walletBalance" = COALESCE("walletBalance", 0) + v_seller_credit WHERE uid = v_item->>'farmerId';
        
        INSERT INTO public.wallet_history ("userId", "type", amount, "orderId", description)
        VALUES (v_item->>'farmerId', 'credit', v_seller_credit, v_order_id, 'Payment received for ' || (v_item->>'cropName'));

        INSERT INTO public.transactions ("userId", "type", amount, "orderId", description)
        VALUES (v_item->>'farmerId', 'sale', v_seller_credit, v_order_id, 'Sale of ' || (v_item->>'quantity') || ' ' || (v_item->>'cropName'));

        INSERT INTO public.notifications ("userId", title, message)
        VALUES (v_item->>'farmerId', 'New Order Received!', p_buyer_name || ' ordered ' || (v_item->>'quantity') || ' of ' || (v_item->>'cropName'));

        -- Update Crop
        SELECT "soldQuantity", quantity INTO v_sold_qty, v_tot_qty FROM public.crops WHERE id = (v_item->>'cropId')::UUID;
        v_sold_qty := COALESCE(v_sold_qty, 0) + (v_item->>'quantity')::NUMERIC;
        IF v_sold_qty >= v_tot_qty THEN
            v_new_status := 'sold';
        ELSE
            v_new_status := 'available';
        END IF;

        UPDATE public.crops SET "soldQuantity" = v_sold_qty, status = v_new_status WHERE id = (v_item->>'cropId')::UUID;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'orderId', v_order_id
    );
END;
$$;
