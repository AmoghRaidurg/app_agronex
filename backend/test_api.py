import requests
import uuid
import time

BASE_URL = "http://localhost:8001"

def print_step(msg):
    print(f"\n{'='*50}\n{msg}\n{'='*50}")

def safe_json(res):
    try:
        return res.json()
    except Exception:
        print(f"Failed to decode JSON. Status Code: {res.status_code}")
        print("Raw response:", res.text)
        return {}

def test_flow():
    # 1. Health Check
    try:
        res = requests.get(f"{BASE_URL}/api/health")
        print("Health Check:", safe_json(res))
    except Exception as e:
        print("Failed to connect to backend:", e)
        return

    # Generate unique IDs for this test run
    run_id = str(uuid.uuid4())[:8]
    farmer_uid = f"farmer_{run_id}"
    trader_uid = f"trader_{run_id}"
    ind_uid = f"ind_{run_id}"

    # 2. Create Users
    print_step("Creating Users")
    users = [
        {"uid": farmer_uid, "phoneNumber": "1234567890", "role": "farmer", "name": f"Farmer {run_id}", "address": "Farmville", "bankUPI": "farmer@upi"},
        {"uid": trader_uid, "phoneNumber": "0987654321", "role": "trader", "name": f"Trader {run_id}", "address": "Tradeville", "bankUPI": "trader@upi"},
        {"uid": ind_uid, "phoneNumber": "1112223333", "role": "industrialist", "name": f"Ind {run_id}", "address": "Factory", "bankUPI": "ind@upi"}
    ]
    
    for u in users:
        res = requests.post(f"{BASE_URL}/api/users", json=u)
        print(f"Created {u['role']}:", res.status_code, safe_json(res).get('uid', ''))

    # 3. Add Funds
    print_step("Adding Funds to Trader and Industrialist")
    for uid, amt in [(trader_uid, 5000), (ind_uid, 10000)]:
        res = requests.post(f"{BASE_URL}/api/wallet/add-funds", json={
            "userId": uid,
            "amount": amt,
            "paymentMethod": "Credit Card",
            "cardNumber": "1234"
        })
        print(f"Added funds for {uid}:", res.status_code, safe_json(res))

    # 4. Farmer Lists a Crop
    print_step("Farmer Listing a Crop")
    crop_payload = {
        "farmerId": farmer_uid,
        "farmerName": f"Farmer {run_id}",
        "name": "Premium Wheat",
        "quantity": 100,
        "unit": "kg",
        "pricePerUnit": 20,
        "harvestDate": "2026-05-01",
        "description": "High quality wheat",
        "imageBase64": "data:image/png;base64,...",
        "category": "Grains",
        "location": "Farmville"
    }
    res = requests.post(f"{BASE_URL}/api/crops", json=crop_payload)
    crop_data = safe_json(res)
    crop_id = crop_data.get('id')
    print("Crop created:", crop_id)

    if not crop_id:
        print("Failed to create crop. Exiting.")
        return

    # 5. Trader Buys Crop
    print_step("Trader Buys Crop from Farmer")
    order_payload = {
        "buyerId": trader_uid,
        "buyerName": f"Trader {run_id}",
        "buyerRole": "trader",
        "totalAmount": 2000, # 100 * 20
        "shippingAddress": "Tradeville",
        "items": [{
            "cropId": crop_id,
            "farmerId": farmer_uid,
            "cropName": "Premium Wheat",
            "quantity": 100,
            "unit": "kg",
            "pricePerUnit": 20,
            "totalPrice": 2000
        }]
    }
    res = requests.post(f"{BASE_URL}/api/orders", json=order_payload)
    print("Trader purchase order:", res.status_code, safe_json(res))

    # Verify Wallets after initial trade
    print_step("Wallets after Trader purchase (Trader -2000, Farmer +2000)")
    f_wallet = safe_json(requests.get(f"{BASE_URL}/api/wallet/{farmer_uid}"))
    t_wallet = safe_json(requests.get(f"{BASE_URL}/api/wallet/{trader_uid}"))
    print("Farmer Wallet:", f_wallet)
    print("Trader Wallet:", t_wallet)

    # 6. Trader Resells Crop
    print_step("Trader Resells the Crop")
    resell_payload = {
        "farmerId": trader_uid,
        "farmerName": f"Trader {run_id}",
        "name": "Premium Wheat",
        "quantity": 100,
        "unit": "kg",
        "pricePerUnit": 30, # Increased price
        "harvestDate": "2026-05-01",
        "description": "Resold high quality wheat",
        "imageBase64": "data:image/png;base64,...",
        "category": "Grains",
        "location": "Tradeville",
        "originalFarmerId": farmer_uid,
        "originalPrice": 20 # Important for royalty calculation
    }
    res = requests.post(f"{BASE_URL}/api/crops", json=resell_payload)
    resold_crop = safe_json(res)
    resold_crop_id = resold_crop.get('id')
    print("Resold crop created:", resold_crop_id)

    if not resold_crop_id:
        print("Failed to resell crop. Exiting.")
        return

    # 7. Industrialist Buys Resold Crop
    print_step("Industrialist Buys Resold Crop")
    ind_order_payload = {
        "buyerId": ind_uid,
        "buyerName": f"Ind {run_id}",
        "buyerRole": "industrialist",
        "totalAmount": 3000, # 100 * 30
        "shippingAddress": "Factory",
        "items": [{
            "cropId": resold_crop_id,
            "farmerId": trader_uid,
            "cropName": "Premium Wheat",
            "quantity": 100,
            "unit": "kg",
            "pricePerUnit": 30,
            "totalPrice": 3000,
            "originalFarmerId": farmer_uid,
            "originalPrice": 20
        }]
    }
    res = requests.post(f"{BASE_URL}/api/orders", json=ind_order_payload)
    print("Industrialist purchase order:", res.status_code, safe_json(res))

    # 8. Verify Royalties
    print_step("Verifying Royalties and Final Wallets")
    f_wallet_final = safe_json(requests.get(f"{BASE_URL}/api/wallet/{farmer_uid}"))
    t_wallet_final = safe_json(requests.get(f"{BASE_URL}/api/wallet/{trader_uid}"))
    i_wallet_final = safe_json(requests.get(f"{BASE_URL}/api/wallet/{ind_uid}"))
    
    print("Expected Farmer Wallet: 2125.0 -> Actual:", f_wallet_final)
    print("Expected Trader Wallet: 5875.0 -> Actual:", t_wallet_final)
    print("Expected Ind Wallet: 7000.0 -> Actual:", i_wallet_final)

if __name__ == "__main__":
    test_flow()
