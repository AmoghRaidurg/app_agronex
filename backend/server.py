from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import uuid

load_dotenv()

app = FastAPI(title="AGRONEX API (Supabase)")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Missing Supabase credentials in .env")

# Initialize client only if we have credentials (prevent crash if .env isn't loaded yet)
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Helper function to ensure client exists
def get_db():
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not configured")
    return supabase

# Pydantic Models
class UserCreate(BaseModel):
    uid: str
    phoneNumber: str
    role: Literal["farmer", "trader", "customer", "industrialist", "admin"]
    name: str
    address: str
    bankUPI: str

class CropCreate(BaseModel):
    farmerId: str
    farmerName: str
    name: str
    quantity: float
    unit: str = "kg"
    pricePerUnit: float
    harvestDate: str
    description: str
    imageBase64: str
    category: str
    location: str
    originalFarmerId: Optional[str] = None
    originalPrice: Optional[float] = None

class OrderItem(BaseModel):
    cropId: str
    farmerId: str
    cropName: str
    quantity: float
    unit: str
    pricePerUnit: float
    totalPrice: float
    originalFarmerId: Optional[str] = None
    originalPrice: Optional[float] = None

class OrderCreate(BaseModel):
    buyerId: str
    buyerName: str
    buyerRole: str
    items: List[OrderItem]
    totalAmount: float
    shippingAddress: str

class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "accepted", "shipped", "delivered"]

class AddFundsRequest(BaseModel):
    userId: str
    amount: float
    paymentMethod: str
    cardNumber: Optional[str] = None

# ============ USER ROUTES ============

@app.post("/api/users")
async def create_user(user: UserCreate):
    db = get_db()
    existing = db.table('users').select('*').eq('uid', user.uid).execute()
    if existing.data and len(existing.data) > 0:
        return existing.data[0]
    
    user_data = user.dict()
    user_data["approved"] = user.role != "farmer"
    user_data["walletBalance"] = 0.0
    
    result = db.table('users').insert(user_data).execute()
    return result.data[0]

@app.get("/api/users/{uid}")
async def get_user(uid: str):
    db = get_db()
    result = db.table('users').select('*').eq('uid', uid).execute()
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]

@app.get("/api/users")
async def list_users(role: Optional[str] = None):
    db = get_db()
    query = db.table('users').select('*')
    if role:
        query = query.eq('role', role)
    result = query.execute()
    return result.data

# ============ CROP ROUTES ============

@app.post("/api/crops")
async def create_crop(crop: CropCreate):
    db = get_db()
    crop_data = crop.dict(exclude_none=True)
    crop_data["status"] = "available"
    crop_data["soldQuantity"] = 0
    crop_data["rating"] = 0
    
    result = db.table('crops').insert(crop_data).execute()
    return result.data[0]

@app.get("/api/crops")
async def list_crops(
    category: Optional[str] = None,
    search: Optional[str] = None,
    status: str = "available"
):
    db = get_db()
    query = db.table('crops').select('*').eq('status', status)
    if category:
        query = query.eq('category', category)
    if search:
        query = query.ilike('name', f'%{search}%')
    
    result = query.order('createdAt', desc=True).execute()
    return result.data

@app.get("/api/crops/farmer/{farmerId}")
async def get_farmer_crops(farmerId: str):
    db = get_db()
    result = db.table('crops').select('*').eq('farmerId', farmerId).order('createdAt', desc=True).execute()
    return result.data

@app.get("/api/crops/{crop_id}")
async def get_crop(crop_id: str):
    db = get_db()
    result = db.table('crops').select('*').eq('id', crop_id).execute()
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Crop not found")
    return result.data[0]

# ============ ORDER & WALLET ROUTES ============

@app.post("/api/wallet/add-funds")
async def add_funds(req: AddFundsRequest):
    """Mock Payment Gateway to add funds to wallet"""
    db = get_db()
    user_res = db.table('users').select('*').eq('uid', req.userId).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = user_res.data[0]
    new_balance = float(user.get("walletBalance", 0)) + req.amount
    
    # Update wallet balance
    db.table('users').update({"walletBalance": new_balance}).eq('uid', req.userId).execute()
    
    # Add history
    db.table('wallet_history').insert({
        "userId": req.userId,
        "type": "add_funds",
        "amount": req.amount,
        "description": f"Added funds via {req.paymentMethod}"
    }).execute()
    
    return {"success": True, "newBalance": new_balance, "message": "Funds added successfully"}

@app.post("/api/orders")
async def create_order(order: OrderCreate):
    db = get_db()
    
    # 1. Verify Buyer has enough funds
    buyer_res = db.table('users').select('walletBalance').eq('uid', order.buyerId).execute()
    if not buyer_res.data:
        raise HTTPException(status_code=404, detail="Buyer not found")
    
    buyer_balance = float(buyer_res.data[0].get("walletBalance", 0))
    if buyer_balance < order.totalAmount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance. Please add funds.")
    
    # 2. Create the Order
    order_data = {
        "buyerId": order.buyerId,
        "buyerName": order.buyerName,
        "buyerRole": order.buyerRole,
        "totalAmount": order.totalAmount,
        "shippingAddress": order.shippingAddress,
        "status": "pending"
    }
    order_res = db.table('orders').insert(order_data).execute()
    order_id = order_res.data[0]['id']
    
    # 3. Deduct from Buyer
    new_buyer_balance = buyer_balance - order.totalAmount
    db.table('users').update({"walletBalance": new_buyer_balance}).eq('uid', order.buyerId).execute()
    
    # Debit wallet history for buyer
    db.table('wallet_history').insert({
        "userId": order.buyerId,
        "type": "debit",
        "amount": order.totalAmount,
        "orderId": order_id,
        "description": f"Payment for order {order_id}"
    }).execute()
    
    # 4. Process Items, Credit Sellers, and handle Royalty (12.5%)
    for item in order.items:
        # Save order item
        item_data = item.dict(exclude_none=True)
        # Remove originalPrice from item_data if we don't save it in order_items table
        if 'originalPrice' in item_data:
            del item_data['originalPrice']
            
        item_data["orderId"] = order_id
        db.table('order_items').insert(item_data).execute()
        
        # Calculate Royalty if this is a resale
        royalty_amount = 0
        seller_credit = item.totalPrice
        
        if item.originalFarmerId and item.originalPrice:
            # It's a resale by a trader
            profit_per_unit = item.pricePerUnit - item.originalPrice
            if profit_per_unit > 0:
                total_profit = profit_per_unit * item.quantity
                royalty_amount = total_profit * 0.125  # 12.5% to original farmer
                seller_credit -= royalty_amount
                
                # Credit Royalty to Original Farmer
                orig_farmer_res = db.table('users').select('walletBalance').eq('uid', item.originalFarmerId).execute()
                if orig_farmer_res.data:
                    orig_bal = float(orig_farmer_res.data[0].get("walletBalance", 0))
                    db.table('users').update({"walletBalance": orig_bal + royalty_amount}).eq('uid', item.originalFarmerId).execute()
                    
                    db.table('wallet_history').insert({
                        "userId": item.originalFarmerId,
                        "type": "royalty",
                        "amount": royalty_amount,
                        "orderId": order_id,
                        "description": f"12.5% Royalty from resale of {item.cropName}"
                    }).execute()
                    
                    db.table('notifications').insert({
                        "userId": item.originalFarmerId,
                        "title": "Royalty Credited! 🎉",
                        "message": f"You received ₹{royalty_amount:.2f} royalty from a trader's resale of {item.cropName}"
                    }).execute()
        
        # Credit the Seller (Farmer or Trader)
        seller_res = db.table('users').select('walletBalance').eq('uid', item.farmerId).execute()
        if seller_res.data:
            seller_bal = float(seller_res.data[0].get("walletBalance", 0))
            db.table('users').update({"walletBalance": seller_bal + seller_credit}).eq('uid', item.farmerId).execute()
            
            db.table('wallet_history').insert({
                "userId": item.farmerId,
                "type": "credit",
                "amount": seller_credit,
                "orderId": order_id,
                "description": f"Payment received for {item.cropName}"
            }).execute()
            
            db.table('transactions').insert({
                "userId": item.farmerId,
                "type": "sale",
                "amount": seller_credit,
                "orderId": order_id,
                "description": f"Sale of {item.quantity}{item.unit} {item.cropName}"
            }).execute()
            
            db.table('notifications').insert({
                "userId": item.farmerId,
                "title": "New Order Received!",
                "message": f"{order.buyerName} ordered {item.quantity}{item.unit} of {item.cropName}"
            }).execute()
            
        # Update Crop Sold Quantity
        crop_res = db.table('crops').select('soldQuantity, quantity').eq('id', item.cropId).execute()
        if crop_res.data:
            sold_qty = float(crop_res.data[0].get('soldQuantity', 0)) + item.quantity
            tot_qty = float(crop_res.data[0].get('quantity', 0))
            status = 'sold' if sold_qty >= tot_qty else 'available'
            db.table('crops').update({"soldQuantity": sold_qty, "status": status}).eq('id', item.cropId).execute()

    return order_res.data[0]

@app.get("/api/orders/user/{userId}")
async def get_user_orders(userId: str, role: str):
    db = get_db()
    
    # 1. Get orders where user is the BUYER
    buyer_orders_res = db.table('orders').select('*, order_items(*)').eq('buyerId', userId).execute()
    buyer_orders = buyer_orders_res.data
    
    # 2. Get orders where user is the SELLER (only for farmers and traders)
    seller_orders = []
    if role in ["farmer", "trader"]:
        items_res = db.table('order_items').select('orderId').eq('farmerId', userId).execute()
        order_ids = list(set([item['orderId'] for item in items_res.data]))
        if order_ids:
            seller_orders_res = db.table('orders').select('*, order_items(*)').in_('id', order_ids).execute()
            seller_orders = seller_orders_res.data
            
    # Combine and remove duplicates
    all_orders_dict = {order['id']: order for order in buyer_orders + seller_orders}
    all_orders = list(all_orders_dict.values())
    
    # Sort by createdAt descending
    all_orders.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
    
    return all_orders

@app.patch("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, update: OrderStatusUpdate):
    db = get_db()
    result = db.table('orders').update({"status": update.status, "updatedAt": datetime.utcnow().isoformat()}).eq('id', order_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    buyer_id = result.data[0]['buyerId']
    db.table('notifications').insert({
        "userId": buyer_id,
        "title": f"Order {update.status.capitalize()}",
        "message": f"Your order has been {update.status}"
    }).execute()
    
    return {"message": "Order status updated"}

@app.get("/api/wallet/{userId}")
async def get_wallet_balance(userId: str):
    db = get_db()
    res = db.table('users').select('walletBalance').eq('uid', userId).execute()
    return {"walletBalance": res.data[0].get("walletBalance", 0) if res.data else 0}

@app.get("/api/wallet/history/{userId}")
async def get_wallet_history(userId: str):
    db = get_db()
    res = db.table('wallet_history').select('*').eq('userId', userId).order('createdAt', desc=True).execute()
    return res.data

@app.get("/api/analytics/farmer/{farmerId}")
async def get_farmer_analytics(farmerId: str):
    db = get_db()
    tx_res = db.table('transactions').select('*').eq('userId', farmerId).execute()
    transactions = tx_res.data
    
    monthly_data = {}
    total_earnings = 0
    for txn in transactions:
        month_key = txn["createdAt"][:7] # YYYY-MM
        monthly_data[month_key] = monthly_data.get(month_key, 0) + float(txn["amount"])
        total_earnings += float(txn["amount"])
        
    months = list(monthly_data.values())
    avg_monthly = sum(months) / len(months) if months else 0
    predicted_annual = avg_monthly * 12
    
    crops_res = db.table('crops').select('*').eq('farmerId', farmerId).order('soldQuantity', desc=True).limit(5).execute()
    
    return {
        "totalEarnings": total_earnings,
        "monthlyData": monthly_data,
        "avgMonthlyEarnings": avg_monthly,
        "predictedAnnualIncome": predicted_annual,
        "bestSellingCrops": crops_res.data,
        "transactionCount": len(transactions)
    }

@app.get("/api/notifications/{userId}")
async def get_notifications(userId: str):
    db = get_db()
    res = db.table('notifications').select('*').eq('userId', userId).order('createdAt', desc=True).execute()
    return res.data

@app.patch("/api/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str):
    db = get_db()
    db.table('notifications').update({"read": True}).eq('id', notif_id).execute()
    return {"success": True}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "AGRONEX API (Supabase)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)