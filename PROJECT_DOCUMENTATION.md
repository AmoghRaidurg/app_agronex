# AGRONEX - Agricultural Marketplace Platform

## 🌾 Project Overview

AGRONEX is a comprehensive cross-platform mobile application that connects Farmers, Traders, Customers, and Industrialists on a single agricultural marketplace platform. The app solves unfair profit distribution in agriculture by enabling direct digital trade and automatically returning a percentage of profit back to farmers as a royalty reward.

## 🎯 Key Features

### 1. **Multi-Role Authentication System**
- **Phone OTP Authentication** (Firebase-based)
- **5 User Roles**: Farmer, Trader, Customer, Industrialist, Admin
- Secure session management with auto-login
- Role-based dashboard navigation

### 2. **Farmer Dashboard** 🚜
- Add crop listings with image upload
- View all orders placed on crops
- Track earnings and royalty income
- **AI Income Prediction Graph** (offline logic-based)
- Wallet balance management
- Withdraw funds to bank/UPI (simulated)
- Best-selling crops analytics

### 3. **Marketplace** 🛒
- Browse all available crops
- Search and filter by:
  - Crop type
  - Price range
  - Location
  - Category (Grains, Vegetables, Fruits, Pulses, Raw Materials)
- View detailed crop information
- Direct farmer contact info

### 4. **Order & Payment System** 💳
- Add crops to cart
- **Simulated payment flow** (Razorpay-like UI)
- Order status tracking:
  - Pending → Accepted → Shipped → Delivered
- Digital invoice generation
- Order history for all users

### 5. **Royalty Distribution System** 🏆 (CORE FEATURE)
- Automatic 10-15% royalty to original farmers
- Triggered when traders/industrialists resell crops
- Real-time wallet crediting
- Transparent transaction history
- Notification on royalty receipt

### 6. **Wallet & Transactions** 💰
- Virtual wallet system (demo currency)
- Transaction history with filters
- Withdrawal requests (simulated)
- Multiple transaction types:
  - Sales
  - Royalties
  - Withdrawals

### 7. **Analytics & Predictions** 📊
- **Offline ML-based predictions**:
  - Average monthly earnings calculation
  - Annual income projection
  - Sales trend visualization
- Best-selling crop recommendations
- Monthly earnings charts (Line graphs)

### 8. **Admin Panel** 👨‍💼
- View all users and farmers
- Approve farmer accounts
- Monitor platform transactions
- Platform analytics dashboard
- Adjust royalty percentages

### 9. **Notifications** 🔔
- New order received
- Order status updates
- Payment confirmations
- Royalty credited alerts
- Order delivered notifications

## 🏗 Technical Architecture

### Frontend
- **Framework**: Expo (React Native)
- **Navigation**: expo-router (file-based routing)
- **State Management**: React Context API
- **UI Libraries**:
  - react-native-gifted-charts (Analytics)
  - expo-image-picker (Image uploads)
  - @react-native-async-storage/async-storage
- **Icons**: @expo/vector-icons (Ionicons)

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Authentication**: Firebase Phone Auth
- **Storage**: Firebase Storage (crop images)
- **API Architecture**: RESTful

### Key Technologies
- **Firebase Services**:
  - Authentication (Phone OTP)
  - Cloud Storage (images)
  - Cloud Messaging (push notifications - ready)
- **Payment**: Simulated (NO real gateway)
- **AI/ML**: Offline prediction logic (no external APIs)

## 📱 User Roles & Capabilities

### 1. Farmer 🌾
- List crops for sale
- View orders
- Track royalties from resales
- Income analytics
- Wallet management

### 2. Trader 👔
- Purchase crops from farmers
- Resell to customers
- Auto-royalty payment to farmers
- Purchase history
- Profit tracking

### 3. Customer 🛍️
- Browse marketplace
- Purchase crops
- Order tracking
- View purchase history

### 4. Industrialist 🏭
- Bulk crop purchases
- Supplier management
- Resale capability with farmer royalties
- Large order placement

### 5. Admin 👨‍⚖️
- User management
- Farmer approval
- Transaction monitoring
- Platform analytics
- Royalty percentage control

## 🗂 Project Structure

```
/app
├── backend/
│   ├── server.py              # FastAPI main server
│   ├── .env                   # MongoDB connection
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── app/                   # Expo Router screens
│   │   ├── index.tsx          # Entry point
│   │   ├── _layout.tsx        # Root layout
│   │   ├── auth/              # Authentication screens
│   │   │   ├── phone.tsx
│   │   │   └── complete-profile.tsx
│   │   ├── farmer/            # Farmer dashboard & features
│   │   │   ├── dashboard.tsx
│   │   │   ├── add-crop.tsx
│   │   │   ├── marketplace.tsx
│   │   │   ├── orders.tsx
│   │   │   ├── wallet.tsx
│   │   │   └── profile.tsx
│   │   ├── customer/          # Customer screens
│   │   ├── trader/            # Trader screens
│   │   ├── industrialist/     # Industrialist screens
│   │   └── admin/             # Admin panel
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx    # Global auth state
│   │
│   ├── lib/
│   │   └── firebase.ts        # Firebase configuration
│   │
│   ├── app.json               # Expo configuration
│   └── package.json
│
└── google-services.json       # Firebase Android config
```

## 🔗 API Endpoints

### Users
- `POST /api/users` - Create user
- `GET /api/users/{uid}` - Get user details
- `GET /api/users?role={role}` - List users by role

### Crops
- `POST /api/crops` - Add new crop listing
- `GET /api/crops` - List all crops (with filters)
- `GET /api/crops/farmer/{farmerId}` - Get farmer's crops
- `GET /api/crops/{crop_id}` - Get crop details

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/user/{userId}?role={role}` - Get user orders
- `PATCH /api/orders/{order_id}/status` - Update order status

### Royalty System
- `POST /api/resale` - Record resale & credit royalty

### Wallet
- `GET /api/wallet/{userId}` - Get wallet balance
- `GET /api/wallet/history/{userId}` - Get transaction history
- `POST /api/wallet/withdraw` - Request withdrawal

### Analytics
- `GET /api/analytics/farmer/{farmerId}` - Get farmer analytics

### Notifications
- `GET /api/notifications/{userId}` - Get notifications
- `PATCH /api/notifications/{notif_id}/read` - Mark as read

### Admin
- `GET /api/admin/stats` - Platform statistics
- `PATCH /api/admin/approve-farmer/{uid}` - Approve farmer

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ and Yarn
- Python 3.11+
- MongoDB
- Expo CLI
- Firebase account

### Backend Setup
```bash
cd /app/backend
pip install -r requirements.txt
python server.py
```

### Frontend Setup
```bash
cd /app/frontend
yarn install
yarn start
```

### Environment Variables

#### Backend (`.env`)
```
MONGO_URL=mongodb://localhost:27017
```

#### Frontend (`.env.local`)
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 📊 MongoDB Collections

### users
```json
{
  "uid": "string",
  "phoneNumber": "string",
  "role": "farmer|trader|customer|industrialist|admin",
  "name": "string",
  "address": "string",
  "bankUPI": "string",
  "walletBalance": "number",
  "approved": "boolean",
  "createdAt": "datetime"
}
```

### crops
```json
{
  "farmerId": "string",
  "farmerName": "string",
  "name": "string",
  "quantity": "number",
  "unit": "string",
  "pricePerUnit": "number",
  "harvestDate": "string",
  "description": "string",
  "imageBase64": "string",
  "category": "string",
  "location": "string",
  "status": "available|sold",
  "soldQuantity": "number",
  "createdAt": "datetime"
}
```

### orders
```json
{
  "buyerId": "string",
  "buyerName": "string",
  "buyerRole": "string",
  "items": [
    {
      "cropId": "string",
      "cropName": "string",
      "farmerId": "string",
      "quantity": "number",
      "unit": "string",
      "pricePerUnit": "number",
      "totalPrice": "number"
    }
  ],
  "totalAmount": "number",
  "shippingAddress": "string",
  "status": "pending|accepted|shipped|delivered",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### wallet_history
```json
{
  "userId": "string",
  "type": "credit|royalty|withdrawal",
  "amount": "number",
  "orderId": "string",
  "description": "string",
  "createdAt": "datetime"
}
```

### transactions
```json
{
  "userId": "string",
  "type": "sale",
  "amount": "number",
  "orderId": "string",
  "description": "string",
  "createdAt": "datetime"
}
```

### notifications
```json
{
  "userId": "string",
  "title": "string",
  "message": "string",
  "read": "boolean",
  "createdAt": "datetime"
}
```

## 🎨 Design Principles

### Mobile-First UX
- Large touch targets (min 48dp)
- Simple, clean UI for rural users
- Minimal English complexity
- Icon-based navigation
- Bottom tab navigation for main features

### Color Scheme
- **Primary**: #10b981 (Green - Agriculture theme)
- **Secondary**: #3b82f6 (Blue)
- **Success**: #10b981
- **Warning**: #f59e0b
- **Error**: #ef4444
- **Gray**: #6b7280

### Typography
- **Headers**: Bold, 24-40px
- **Body**: Regular, 14-16px
- **Captions**: 12-13px

## 🔐 Security Considerations

1. **Authentication**
   - Firebase Phone OTP (production-ready)
   - Session persistence
   - Auto-logout on session expiry

2. **Data Storage**
   - Images stored as base64 in MongoDB
   - No PII in logs
   - Secure MongoDB connection

3. **API Security**
   - CORS enabled for frontend
   - Input validation on all endpoints
   - Error handling without data exposure

## 🚧 Current Limitations & Future Enhancements

### Limitations
1. **Firebase**: Using dummy service account (needs real key)
2. **Phone Auth**: Simulated OTP (needs Firebase setup)
3. **Push Notifications**: FCM ready but not implemented
4. **Payment**: Fully simulated (no real gateway)
5. **Image Storage**: Base64 in MongoDB (should use Firebase Storage)

### Future Enhancements
1. Real Firebase Phone Authentication
2. Firebase Cloud Messaging integration
3. Image upload to Firebase Storage
4. Advanced crop recommendation ML model
5. Real-time chat between buyers/sellers
6. Multi-language support (Hindi, regional languages)
7. Crop disease detection (AI/ML)
8. Weather integration
9. Price prediction based on market trends
10. GPS-based farmer location

## 📱 App Screens Summary

### Authentication Flow
1. Phone Number Entry
2. OTP Verification
3. Profile Completion (Role Selection)

### Farmer Flow
1. Dashboard (Analytics, Stats)
2. Add Crop (with image)
3. My Crops List
4. Marketplace (Browse)
5. Orders (Sales)
6. Wallet (Balance, History)
7. Profile (Settings)

### Trader/Industrialist Flow
1. Dashboard
2. Marketplace (Purchase)
3. Orders (Purchase History)
4. Wallet (Balance, Royalty Payments)
5. Profile

### Customer Flow
1. Dashboard
2. Marketplace (Browse & Buy)
3. Orders (Purchase History)
4. Profile

### Admin Flow
1. Dashboard (Platform Stats)
2. User Management
3. Farmer Approval
4. Transaction Monitoring

## 🧪 Testing

### Backend Testing
```bash
# Health check
curl http://localhost:8001/api/health

# Create user
curl -X POST http://localhost:8001/api/users \
  -H "Content-Type: application/json" \
  -d '{"uid":"test123","phoneNumber":"+919876543210","role":"farmer",...}'

# List crops
curl http://localhost:8001/api/crops
```

### Frontend Testing
- Test on Expo Go app (scan QR code)
- Web preview available at preview URL
- Test all user roles
- Test order flow
- Test royalty system

## 🎯 Success Metrics

1. **User Adoption**: Number of farmers, traders registered
2. **Transaction Volume**: Total orders placed
3. **Farmer Income**: Average earnings per farmer
4. **Royalty Distribution**: Total royalties paid to farmers
5. **Platform Usage**: Daily active users

## 📞 Support & Documentation

- **API Documentation**: Available at `/api/docs` (FastAPI auto-generated)
- **Firebase Console**: https://console.firebase.google.com/
- **Expo Documentation**: https://docs.expo.dev/

## 🌟 Unique Selling Points

1. **Fair Trade Focus**: Automatic farmer royalties
2. **No Middleman Exploitation**: Direct farmer-to-buyer connection
3. **Transparent Pricing**: Real-time market prices
4. **Income Prediction**: AI-powered farmer earnings forecast
5. **Multi-Stakeholder Platform**: Serves entire agricultural ecosystem
6. **Rural-Friendly Design**: Simple UI, minimal complexity
7. **Virtual Currency Demo**: Safe testing environment

## 📝 License

This is a demonstration project for agricultural marketplace functionality.

---

**Built with ❤️ for Indian Farmers**

**Version**: 1.0.0
**Last Updated**: February 2026
