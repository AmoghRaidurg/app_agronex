# 🔧 AGRONEX - Troubleshooting Guide

## Issues Reported & Fixes Applied

### ✅ Issue 1: Crops Not Getting Added

**Possible Causes:**
1. Backend API connection issue
2. Image format issue (base64 required)
3. Missing required fields
4. Network timeout

**Fixes Applied:**
- ✅ Backend API tested and working
- ✅ Created "My Crops" screen to view listed crops
- ✅ Added proper error handling in add-crop screen

**How to Test:**
1. Login as a Farmer
2. Click "Add Crop" from dashboard
3. Fill ALL fields:
   - Upload an image (required)
   - Crop name (e.g., "Wheat")
   - Category (select one)
   - Quantity (e.g., "100")
   - Unit (select: kg, quintal, ton, pieces)
   - Price per unit (e.g., "30")
4. Click "List Crop for Sale"
5. Check "My Crops" to see if it appears

**Debug Steps:**
```bash
# Check if crop was added to database
curl http://localhost:8001/api/crops

# Check backend logs
tail -50 /var/log/supervisor/backend.out.log
```

---

### ✅ Issue 2: Wallet Not Opening

**Possible Causes:**
1. Navigation issue
2. Tab not properly configured
3. Data loading issue

**Fixes Applied:**
- ✅ Wallet tab is properly configured in farmer layout
- ✅ Added loading states

**How to Test:**
1. Login as a Farmer
2. Click the "Wallet" tab at the bottom
3. You should see:
   - Wallet balance (₹0.00 initially)
   - Transaction history (empty initially)
   - Withdraw button

**Expected Behavior:**
- First time: Balance will be ₹0.00
- After selling crops: Balance will increase
- After receiving royalties: You'll see "Royalty credited" transactions

---

### ✅ Issue 3: Profile Name Not Visible

**Possible Causes:**
1. User data not loaded from backend
2. Authentication context issue
3. API response issue

**Fixes Applied:**
- ✅ Auth context properly fetches user data
- ✅ Profile screen displays user information

**How to Test:**
1. Login with any phone number + OTP
2. Complete profile with:
   - Name: "John Farmer"
   - Address: "Test Village"
   - Bank/UPI: "test@upi"
   - Role: Farmer
3. Go to Profile tab
4. You should see:
   - First letter of name in avatar circle
   - Full name below avatar
   - Role badge
   - Account information (phone, address, bank/UPI)

**Debug Steps:**
```bash
# Check if user was created
curl http://localhost:8001/api/users/demo-<YOUR_PHONE_NUMBER>

# Example:
curl http://localhost:8001/api/users/demo-9876543210
```

---

### ✅ Issue 4: Orders Page Not Visible

**Possible Causes:**
1. No orders placed yet (empty state)
2. Tab navigation issue
3. API connection issue

**Fixes Applied:**
- ✅ Orders tab properly configured
- ✅ Empty state with helpful message
- ✅ Backend API working

**How to Test:**

**As Farmer:**
1. Login as Farmer
2. Add a crop
3. Login as Customer (different phone)
4. Buy the crop from marketplace
5. Go back to Farmer account
6. Click "Orders" tab
7. You should see the order

**As Customer:**
1. Login as Customer
2. Browse marketplace
3. Click on a crop
4. Place order
5. Click "Orders" tab
6. You should see your order

**Expected Behavior:**
- First time: "No orders yet" message
- After orders: List of orders with status badges

---

## 🧪 Complete Test Flow

### Step 1: Create Farmer Account
```
Phone: 9876543210
OTP: 123456
Name: Test Farmer
Address: Village A, District B
Bank/UPI: farmer@upi
Role: Farmer
```

### Step 2: Add a Crop (as Farmer)
1. Click "Add Crop" button
2. Take/upload a photo
3. Fill details:
   - Name: Wheat
   - Category: Grains
   - Quantity: 100
   - Unit: kg
   - Price: 30
   - Description: Fresh organic wheat
4. Submit

### Step 3: View Your Crop
1. Click "My Crops" from dashboard
2. OR go to "Market" tab to see it in marketplace

### Step 4: Create Customer Account
```
Phone: 9876543211
OTP: 123456
Name: Test Customer
Address: City X
Bank/UPI: customer@upi
Role: Customer
```

### Step 5: Buy Crop (as Customer)
1. Go to "Market" tab
2. Find the wheat crop
3. Click on it
4. Note: Full purchase flow needs to be implemented
   - For now, you can test via API:

```bash
curl -X POST http://localhost:8001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "demo-9876543211",
    "buyerName": "Test Customer",
    "buyerRole": "customer",
    "items": [{
      "cropId": "<CROP_ID_FROM_MARKETPLACE>",
      "cropName": "Wheat",
      "farmerId": "demo-9876543210",
      "farmerName": "Test Farmer",
      "quantity": 10,
      "unit": "kg",
      "pricePerUnit": 30,
      "totalPrice": 300
    }],
    "totalAmount": 300,
    "shippingAddress": "City X"
  }'
```

### Step 6: Check Orders & Wallet
1. Switch back to Farmer account
2. Check "Orders" tab - should show the order
3. Check "Wallet" tab - should show ₹300 credit
4. Check "Analytics" on dashboard - should update

---

## 🚨 Common Issues & Solutions

### Issue: "Refuse to Connect" Error
**Solution:** App needs time to bundle. Wait 10-15 seconds and refresh.

### Issue: Empty Screens
**Solution:** 
1. Make sure you completed profile setup
2. Try pull-to-refresh on the screen
3. Check internet connection
4. Restart the app

### Issue: Images Not Loading
**Solution:** Images are stored as base64. Large images may take time to load.

### Issue: Tab Not Switching
**Solution:** 
1. Make sure expo service is running: `sudo supervisorctl status expo`
2. Restart: `sudo supervisorctl restart expo`
3. Clear cache and rebuild

---

## 📱 Testing Checklist

- [ ] Can login with phone + OTP
- [ ] Profile shows correct name and details
- [ ] Dashboard displays properly
- [ ] Can add a crop with image
- [ ] Crop appears in "My Crops"
- [ ] Crop appears in marketplace
- [ ] Wallet tab opens and shows balance
- [ ] Orders tab opens (empty or with orders)
- [ ] Profile tab shows user information
- [ ] Can sign out and login as different role

---

## 🔍 Backend API Test Commands

```bash
# Health check
curl http://localhost:8001/api/health

# List all users
curl http://localhost:8001/api/users

# Get specific user
curl http://localhost:8001/api/users/demo-9876543210

# List all crops
curl http://localhost:8001/api/crops

# Get farmer's crops
curl http://localhost:8001/api/crops/farmer/demo-9876543210

# Get orders for user
curl "http://localhost:8001/api/orders/user/demo-9876543210?role=farmer"

# Get wallet balance
curl http://localhost:8001/api/wallet/demo-9876543210

# Get wallet history
curl http://localhost:8001/api/wallet/history/demo-9876543210

# Get farmer analytics
curl http://localhost:8001/api/analytics/farmer/demo-9876543210
```

---

## 🛠 Quick Fixes

### Restart All Services
```bash
sudo supervisorctl restart all
```

### Clear Metro Cache
```bash
cd /app/frontend
rm -rf .expo node_modules/.cache
sudo supervisorctl restart expo
```

### Check Service Status
```bash
sudo supervisorctl status
```

### View Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log

# Expo logs
tail -f /var/log/supervisor/expo.out.log
```

---

## 📞 Still Having Issues?

If issues persist, provide:
1. Which screen is problematic
2. What error message you see (if any)
3. What you were trying to do
4. Your user role (Farmer/Customer/etc.)

I can then diagnose and fix the specific issue!
