# 🧪 AGRONEX Demo Mode - Quick Start Guide

## 📱 How to Use the App (Demo Mode)

### ✅ Step 1: Phone Number Entry
1. On the first screen, enter **ANY 10-digit phone number**
   - Example: `9876543210`
   - The number doesn't need to be real
   
2. Click **"Send OTP"**
   
3. You'll see an alert: **"Demo Mode - OTP Simulated"**
   - ⚠️ No actual SMS is sent
   - This is a demonstration/testing mode

---

### ✅ Step 2: OTP Verification
1. After clicking "Send OTP", you'll see 6 OTP input boxes
   
2. Enter **ANY 6-digit code**
   - Example: `123456`
   - Example: `000000`
   - Example: `999999`
   - **Any combination works!**

3. Click **"Verify OTP"**

---

### ✅ Step 3: Complete Profile
1. Fill in your details:
   - **Name**: Your name
   - **Address**: Any address
   - **Bank/UPI**: Any UPI ID or account number
   
2. **Select your role** (Important!):
   - 🌾 **Farmer**: List crops, track earnings, receive royalties
   - 👔 **Trader**: Buy and resell crops
   - 🛍️ **Customer**: Browse and buy crops
   - 🏭 **Industrialist**: Bulk purchases
   
3. Click **"Continue"**

---

## 🎯 What Happens After Login?

### For Farmers:
- **Dashboard** with income analytics
- **Add Crop** button to list products
- **Wallet** to track earnings and royalties
- **Orders** to manage sales

### For Customers:
- **Marketplace** to browse crops
- **Cart** to add items
- **Orders** to track purchases

### For Traders/Industrialists:
- **Buy** from farmers
- **Resell** products
- **Royalty system** automatically credits farmers 15% on resales
- **Wallet** to manage finances

---

## 💡 Demo Features:

### ✅ Working Features:
- Phone authentication (simulated)
- All 5 user dashboards
- Crop listing with image upload
- Marketplace browsing
- Order placement
- **Simulated payments** (no real money)
- Wallet system (virtual currency)
- **Royalty distribution** (automatic)
- Income analytics with charts

### ⚠️ Limitations (Demo Mode):
- **No real SMS/OTP**: Any 6-digit code works
- **No real payments**: All transactions are simulated
- **Virtual currency**: All money (₹) is for demo only
- **Images**: Stored as base64 (works but not optimal)

---

## 🔄 Testing Different Roles:

To test different roles:
1. **Sign out** from the Profile tab
2. Enter a **different phone number** (e.g., 9876543211)
3. Use any OTP (e.g., 111111)
4. Select a **different role**

This way you can experience:
- How farmers add crops
- How customers browse and buy
- How traders resell with automatic royalties

---

## 🚀 Setting Up Real Firebase (Optional):

If you want **REAL OTP via SMS**:

1. **Get Firebase Service Account Key**:
   - Go to: https://console.firebase.google.com/
   - Select your AGRONEX project
   - Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file

2. **Upload the key**:
   - Save it as `/app/backend/firebase_admin_key.json`
   
3. **Update backend code** to use real Firebase Auth

4. **Enable Phone Authentication**:
   - Firebase Console → Authentication
   - Sign-in method → Phone
   - Enable it

---

## 📞 Quick Test Accounts:

| Role | Phone | OTP | Purpose |
|------|-------|-----|---------|
| Farmer | 9876543210 | 123456 | Add crops |
| Customer | 9876543211 | 123456 | Buy crops |
| Trader | 9876543212 | 123456 | Resell crops |
| Admin | 9876543213 | 123456 | Monitor platform |

---

## 💰 Testing Royalty System:

1. Create a **Farmer account** (9876543210)
2. **Add a crop** (e.g., Wheat, 100kg, ₹30/kg)
3. Create a **Trader account** (9876543212)
4. **Buy the crop** from farmer
5. When trader resells, **15% royalty automatically goes to farmer's wallet**
6. Check **farmer's wallet** to see royalty credit

---

## ❓ Common Questions:

**Q: Why isn't the OTP arriving?**
A: The app is in demo mode. No real SMS is sent. Use any 6-digit code (e.g., 123456).

**Q: Can I use real money?**
A: No, all currency is virtual for demonstration purposes only.

**Q: How do I test the royalty system?**
A: Create a farmer, list a crop, then create a trader account and purchase it. The backend API will handle royalty distribution.

**Q: Why do images take time to load?**
A: Images are stored as base64 in MongoDB. For production, migrate to Firebase Storage.

---

## 🎯 Next Steps:

1. ✅ **Test all user flows**
2. ✅ **Explore different roles**
3. ✅ **Try the royalty system**
4. 📝 Provide feedback on features
5. 🚀 Set up real Firebase for production use

---

**Enjoy testing AGRONEX! 🌾**

For technical documentation, see: `/app/PROJECT_DOCUMENTATION.md`
