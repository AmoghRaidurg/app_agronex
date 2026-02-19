from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AGRONEX API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.agronex

# Collections
users_collection = db.users
crops_collection = db.crops
orders_collection = db.orders
transactions_collection = db.transactions
wallet_history_collection = db.wallet_history
notifications_collection = db.notifications

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# Pydantic Models
class UserCreate(BaseModel):
    uid: str
    phoneNumber: str
    role: Literal["farmer", "trader", "customer", "industrialist", "admin"]
    name: str
    address: str
    bankUPI: str

class UserResponse(BaseModel):
    uid: str
    phoneNumber: str
    role: str
    name: str
    address: str
    bankUPI: str
    walletBalance: float = 0.0
    createdAt: datetime

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

class OrderCreate(BaseModel):
    buyerId: str
    buyerName: str
    buyerRole: str
    items: List[dict]
    totalAmount: float
    shippingAddress: str

class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "accepted", "shipped", "delivered"]

class ResaleRecord(BaseModel):
    orderId: str
    resalePrice: float
    originalFarmerId: str

# ============ USER ROUTES ============

@app.post("/api/users", response_model=UserResponse)
async def create_user(user: UserCreate):
    # Check if user already exists
    existing = await users_collection.find_one({"uid": user.uid})
    if existing:
        return serialize_doc(existing)
    
    user_doc = {
        **user.dict(),
        "walletBalance": 0.0,
        "createdAt": datetime.utcnow(),
        "approved": user.role != "farmer"  # Farmers need approval
    }
    
    result = await users_collection.insert_one(user_doc)
    user_doc["_id"] = str(result.inserted_id)
    return user_doc

@app.get("/api/users/{uid}", response_model=UserResponse)
async def get_user(uid: str):
    user = await users_collection.find_one({"uid": uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)

@app.get("/api/users")
async def list_users(role: Optional[str] = None):
    query = {"role": role} if role else {}
    users = await users_collection.find(query).to_list(1000)
    return [serialize_doc(u) for u in users]

# ============ CROP ROUTES ============

@app.post("/api/crops")
async def create_crop(crop: CropCreate):
    crop_doc = {
        **crop.dict(),
        "status": "available",
        "soldQuantity": 0,
        "createdAt": datetime.utcnow(),
        "rating": 0,
        "reviews": []
    }
    
    result = await crops_collection.insert_one(crop_doc)
    crop_doc["_id"] = str(result.inserted_id)
    return crop_doc

@app.get("/api/crops")
async def list_crops(
    category: Optional[str] = None,
    search: Optional[str] = None,
    minPrice: Optional[float] = None,
    maxPrice: Optional[float] = None,
    status: str = "available"
):
    query = {"status": status}
    
    if category:
        query["category"] = category
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    if minPrice is not None or maxPrice is not None:
        query["pricePerUnit"] = {}
        if minPrice is not None:
            query["pricePerUnit"]["$gte"] = minPrice
        if maxPrice is not None:
            query["pricePerUnit"]["$lte"] = maxPrice
    
    crops = await crops_collection.find(query).sort("createdAt", -1).to_list(1000)
    return [serialize_doc(c) for c in crops]

@app.get("/api/crops/farmer/{farmerId}")
async def get_farmer_crops(farmerId: str):
    crops = await crops_collection.find({"farmerId": farmerId}).sort("createdAt", -1).to_list(1000)
    return [serialize_doc(c) for c in crops]

@app.get("/api/crops/{crop_id}")
async def get_crop(crop_id: str):
    try:
        crop = await crops_collection.find_one({"_id": ObjectId(crop_id)})
        if not crop:
            raise HTTPException(status_code=404, detail="Crop not found")
        return serialize_doc(crop)
    except:
        raise HTTPException(status_code=400, detail="Invalid crop ID")

# ============ ORDER ROUTES ============

@app.post("/api/orders")
async def create_order(order: OrderCreate):
    order_doc = {
        **order.dict(),
        "status": "pending",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await orders_collection.insert_one(order_doc)
    order_id = str(result.inserted_id)
    
    # Update crop quantities and create transactions
    for item in order.items:
        # Update crop sold quantity
        await crops_collection.update_one(
            {"_id": ObjectId(item["cropId"])},
            {
                "$inc": {"soldQuantity": item["quantity"]},
                "$set": {"status": "sold" if item.get("fullySold") else "available"}
            }
        )
        
        # Credit farmer wallet
        await users_collection.update_one(
            {"uid": item["farmerId"]},
            {"$inc": {"walletBalance": item["totalPrice"]}}
        )
        
        # Create transaction record
        await transactions_collection.insert_one({
            "userId": item["farmerId"],
            "type": "sale",
            "amount": item["totalPrice"],
            "orderId": order_id,
            "description": f"Sale of {item['quantity']}{item['unit']} {item['cropName']}",
            "createdAt": datetime.utcnow()
        })
        
        # Add wallet history
        await wallet_history_collection.insert_one({
            "userId": item["farmerId"],
            "type": "credit",
            "amount": item["totalPrice"],
            "orderId": order_id,
            "description": f"Payment received for {item['cropName']}",
            "createdAt": datetime.utcnow()
        })
        
        # Send notification to farmer
        await notifications_collection.insert_one({
            "userId": item["farmerId"],
            "title": "New Order Received!",
            "message": f"{order.buyerName} ordered {item['quantity']}{item['unit']} of {item['cropName']}",
            "read": False,
            "createdAt": datetime.utcnow()
        })
    
    # Send notification to buyer
    await notifications_collection.insert_one({
        "userId": order.buyerId,
        "title": "Order Placed Successfully",
        "message": f"Your order of ₹{order.totalAmount} has been placed",
        "read": False,
        "createdAt": datetime.utcnow()
    })
    
    order_doc["_id"] = order_id
    return order_doc

@app.get("/api/orders/user/{userId}")
async def get_user_orders(userId: str, role: str):
    if role == "farmer":
        # Get orders where user is the seller
        orders = await orders_collection.find(
            {"items.farmerId": userId}
        ).sort("createdAt", -1).to_list(1000)
    else:
        # Get orders where user is the buyer
        orders = await orders_collection.find(
            {"buyerId": userId}
        ).sort("createdAt", -1).to_list(1000)
    
    return [serialize_doc(o) for o in orders]

@app.patch("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, update: OrderStatusUpdate):
    try:
        result = await orders_collection.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": update.status, "updatedAt": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Get order details for notification
        order = await orders_collection.find_one({"_id": ObjectId(order_id)})
        
        # Send notification to buyer
        status_messages = {
            "accepted": "Your order has been accepted by the seller",
            "shipped": "Your order has been shipped",
            "delivered": "Your order has been delivered"
        }
        
        if update.status in status_messages:
            await notifications_collection.insert_one({
                "userId": order["buyerId"],
                "title": f"Order {update.status.capitalize()}",
                "message": status_messages[update.status],
                "read": False,
                "createdAt": datetime.utcnow()
            })
        
        return {"message": "Order status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ ROYALTY SYSTEM ============

@app.post("/api/resale")
async def record_resale(resale: ResaleRecord):
    """Record when trader/industrialist resells and credit royalty to original farmer"""
    try:
        # Get original order to find purchase price
        order = await orders_collection.find_one({"_id": ObjectId(resale.orderId)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Calculate profit and royalty (15% of profit)
        original_price = order["totalAmount"]
        profit = resale.resalePrice - original_price
        royalty_percentage = 0.15  # 15%
        royalty_amount = profit * royalty_percentage if profit > 0 else 0
        
        if royalty_amount > 0:
            # Credit royalty to farmer
            await users_collection.update_one(
                {"uid": resale.originalFarmerId},
                {"$inc": {"walletBalance": royalty_amount}}
            )
            
            # Add wallet history
            await wallet_history_collection.insert_one({
                "userId": resale.originalFarmerId,
                "type": "royalty",
                "amount": royalty_amount,
                "orderId": resale.orderId,
                "description": f"Royalty credited from resale transaction (₹{profit:.2f} profit)",
                "createdAt": datetime.utcnow()
            })
            
            # Send notification to farmer
            await notifications_collection.insert_one({
                "userId": resale.originalFarmerId,
                "title": "Royalty Credited! 🎉",
                "message": f"You received ₹{royalty_amount:.2f} royalty from resale",
                "read": False,
                "createdAt": datetime.utcnow()
            })
        
        return {
            "success": True,
            "royaltyAmount": royalty_amount,
            "profit": profit
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ WALLET & TRANSACTIONS ============

@app.get("/api/wallet/{userId}")
async def get_wallet_balance(userId: str):
    user = await users_collection.find_one({"uid": userId})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"walletBalance": user.get("walletBalance", 0)}

@app.get("/api/wallet/history/{userId}")
async def get_wallet_history(userId: str):
    history = await wallet_history_collection.find(
        {"userId": userId}
    ).sort("createdAt", -1).to_list(1000)
    return [serialize_doc(h) for h in history]

@app.post("/api/wallet/withdraw")
async def request_withdrawal(userId: str, amount: float):
    user = await users_collection.find_one({"uid": userId})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("walletBalance", 0) < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Deduct from wallet (simulated withdrawal)
    await users_collection.update_one(
        {"uid": userId},
        {"$inc": {"walletBalance": -amount}}
    )
    
    # Add to wallet history
    await wallet_history_collection.insert_one({
        "userId": userId,
        "type": "withdrawal",
        "amount": amount,
        "description": f"Withdrawal request to {user.get('bankUPI', 'bank account')}",
        "createdAt": datetime.utcnow()
    })
    
    # Send notification
    await notifications_collection.insert_one({
        "userId": userId,
        "title": "Withdrawal Requested",
        "message": f"Withdrawal of ₹{amount} is being processed",
        "read": False,
        "createdAt": datetime.utcnow()
    })
    
    return {"success": True, "message": "Withdrawal request submitted"}

# ============ ANALYTICS ============

@app.get("/api/analytics/farmer/{farmerId}")
async def get_farmer_analytics(farmerId: str):
    # Get all transactions
    transactions = await transactions_collection.find(
        {"userId": farmerId}
    ).sort("createdAt", 1).to_list(1000)
    
    # Calculate monthly earnings
    monthly_data = {}
    total_earnings = 0
    
    for txn in transactions:
        month_key = txn["createdAt"].strftime("%Y-%m")
        if month_key not in monthly_data:
            monthly_data[month_key] = 0
        monthly_data[month_key] += txn["amount"]
        total_earnings += txn["amount"]
    
    # Calculate average monthly earnings
    months = list(monthly_data.values())
    avg_monthly = sum(months) / len(months) if months else 0
    
    # Predict annual income (simple projection)
    predicted_annual = avg_monthly * 12
    
    # Get best selling crops
    crops = await crops_collection.find(
        {"farmerId": farmerId}
    ).sort("soldQuantity", -1).limit(5).to_list(5)
    
    return {
        "totalEarnings": total_earnings,
        "monthlyData": monthly_data,
        "avgMonthlyEarnings": avg_monthly,
        "predictedAnnualIncome": predicted_annual,
        "bestSellingCrops": [serialize_doc(c) for c in crops],
        "transactionCount": len(transactions)
    }

# ============ NOTIFICATIONS ============

@app.get("/api/notifications/{userId}")
async def get_notifications(userId: str):
    notifications = await notifications_collection.find(
        {"userId": userId}
    ).sort("createdAt", -1).limit(50).to_list(50)
    return [serialize_doc(n) for n in notifications]

@app.patch("/api/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str):
    try:
        await notifications_collection.update_one(
            {"_id": ObjectId(notif_id)},
            {"$set": {"read": True}}
        )
        return {"success": True}
    except:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

# ============ ADMIN ROUTES ============

@app.get("/api/admin/stats")
async def get_admin_stats():
    total_users = await users_collection.count_documents({})
    total_farmers = await users_collection.count_documents({"role": "farmer"})
    total_orders = await orders_collection.count_documents({})
    total_crops = await crops_collection.count_documents({})
    
    # Calculate total platform transactions
    all_transactions = await transactions_collection.find({}).to_list(10000)
    total_volume = sum(t.get("amount", 0) for t in all_transactions)
    
    # Get recent orders
    recent_orders = await orders_collection.find({}).sort("createdAt", -1).limit(10).to_list(10)
    
    return {
        "totalUsers": total_users,
        "totalFarmers": total_farmers,
        "totalOrders": total_orders,
        "totalCrops": total_crops,
        "totalVolume": total_volume,
        "recentOrders": [serialize_doc(o) for o in recent_orders]
    }

@app.patch("/api/admin/approve-farmer/{uid}")
async def approve_farmer(uid: str):
    result = await users_collection.update_one(
        {"uid": uid, "role": "farmer"},
        {"$set": {"approved": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    # Send notification
    await notifications_collection.insert_one({
        "userId": uid,
        "title": "Account Approved! ✅",
        "message": "Your farmer account has been approved. You can now list crops.",
        "read": False,
        "createdAt": datetime.utcnow()
    })
    
    return {"success": True}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "AGRONEX API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)