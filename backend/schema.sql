-- Agronex Supabase Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DROP EXISTING TABLES TO AVOID CONFLICTS
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.wallet_history CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.crops CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    uid TEXT PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('farmer', 'trader', 'customer', 'industrialist', 'admin')),
    name TEXT NOT NULL,
    address TEXT,
    "bankUPI" TEXT,
    "walletBalance" NUMERIC DEFAULT 0.0,
    approved BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- CROPS TABLE
CREATE TABLE IF NOT EXISTS public.crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "farmerId" TEXT REFERENCES public.users(uid),
    "farmerName" TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT DEFAULT 'kg',
    "pricePerUnit" NUMERIC NOT NULL,
    "harvestDate" TEXT,
    description TEXT,
    "imageBase64" TEXT,
    category TEXT,
    location TEXT,
    status TEXT DEFAULT 'available',
    "soldQuantity" NUMERIC DEFAULT 0,
    rating NUMERIC DEFAULT 0,
    "originalFarmerId" TEXT, -- for royalty tracking
    "originalPrice" NUMERIC, -- for calculating profit
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "buyerId" TEXT REFERENCES public.users(uid),
    "buyerName" TEXT NOT NULL,
    "buyerRole" TEXT NOT NULL,
    "totalAmount" NUMERIC NOT NULL,
    "shippingAddress" TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'shipped', 'delivered')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "orderId" UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    "cropId" UUID REFERENCES public.crops(id),
    "farmerId" TEXT REFERENCES public.users(uid),
    "cropName" TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    "pricePerUnit" NUMERIC NOT NULL,
    "totalPrice" NUMERIC NOT NULL,
    "originalFarmerId" TEXT
);

-- TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" TEXT REFERENCES public.users(uid),
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    "orderId" UUID,
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- WALLET HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.wallet_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" TEXT REFERENCES public.users(uid),
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    "orderId" UUID,
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" TEXT REFERENCES public.users(uid),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- DISABLE ROW LEVEL SECURITY (RLS) FOR EASY MIGRATION
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
