# Postman Manual — LeafFlow Buyer Orders API

A step-by-step guide to testing the buyer orders endpoints using Postman. All routes require a valid buyer access token.

---

## Prerequisites

Before opening Postman, make sure:

1. **Backend is running**
   ```
   npm run dev --workspace backend
   ```
   You should see `Server running on port 3000` in the terminal.

2. **You have a verified buyer account** — follow the buyer auth flow (send OTP → verify OTP) to obtain an access token.

3. **Your cart has items** — `POST /api/buyer/orders` reads from the buyer's saved cart. Use `PUT /api/buyer/cart` to add items before placing an order. Refer to the [Buyer Cart guide](postman-guide-buyer-cart.md).

---

## One-Time Postman Setup

### 1. Create a Collection

1. Open Postman → click **Collections** in the left sidebar → **+** (New Collection)
2. Name it: `LeafFlow Buyer Orders`

### 2. Add Collection Variables

1. Click on the collection name → go to the **Variables** tab
2. Add these variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `http://localhost:3000` | `http://localhost:3000` |
| `access_token` | *(leave empty)* | *(filled after login)* |
| `order_id` | *(leave empty)* | *(filled after order creation)* |
| `razorpay_order_id` | *(leave empty)* | *(filled after order creation)* |

3. Click **Save**

### 3. Configure Authorization

1. Click on the collection name → go to the **Authorization** tab
2. Set **Type** to `Bearer Token`
3. Set **Token** to `{{access_token}}`
4. Click **Save**

All requests in this collection will inherit this header automatically.

### 4. Get an Access Token

If you don't have a token yet:

1. `POST {{base_url}}/api/buyer/auth/email/send-otp` with `{ "email": "your@email.com" }`
2. `POST {{base_url}}/api/buyer/auth/email/verify-otp` with `{ "otpSessionId": "...", "otp": "..." }`
3. Copy the `data.accessToken` from the response
4. Paste it into the `access_token` collection variable → **Save**

---

## Request Body Schema

For `POST /api/buyer/orders`, the body must be a JSON object with a `shippingAddress`.

### `shippingAddress` fields

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `fullName` | string | yes | Recipient's full name |
| `phone` | string | yes | Minimum 10 digits |
| `line1` | string | yes | Street address line 1 |
| `line2` | string | no | Apartment, floor, landmark |
| `city` | string | yes | City name |
| `state` | string | yes | State name |
| `pincode` | string | yes | Exactly 6 digits |

> **Cart items are not sent in the request.** The backend reads the buyer's saved cart automatically. Price is snapshotted from the product record at order time — it is stored in `items[].priceAtOrder` and is not affected by future price changes.

---

## Section A — Preparing the Cart

Before placing an order, verify your cart has items.

---

### Step 1 — Verify Cart is Non-Empty

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/buyer/cart` |
| Name | `1. Verify Cart` |

No body. Auth is inherited from the collection. **Click Send. Expected response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "_id": "6849f3cfdae5ce6307946aaa",
    "userId": "6849f3cfdae5ce6307946bbb",
    "items": [
      {
        "productId": {
          "_id": "6849f3cfdae5ce6307946fff",
          "name": "Monstera Deliciosa",
          "slug": "monstera-deliciosa",
          "price": 599,
          "stock": 12,
          "images": ["https://res.cloudinary.com/example/leafflow/products/monstera.jpg"]
        },
        "quantity": 2
      }
    ]
  }
}
```

> If `items` is empty, use `PUT /api/buyer/cart` to add products first. Placing an order with an empty cart returns `422 CART_EMPTY`.

---

## Section B — Placing an Order

---

### Step 2 — POST /api/buyer/orders

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/buyer/orders` |
| Name | `2. Create Order` |
| Body | `raw` → `JSON` |

**Request body:**
```json
{
  "shippingAddress": {
    "fullName": "Ravi Kumar",
    "phone": "9876543210",
    "line1": "42 MG Road",
    "line2": "Near City Mall",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560001"
  }
}
```

Auth is inherited from the collection. **Click Send. Expected response — `201 Created`:**

```json
{
  "success": true,
  "message": "Order created",
  "data": {
    "orderId": "6849f3cfdae5ce6307946ccc",
    "razorpayOrderId": "order_PqR8sTuVwXyZ12",
    "amount": 119800,
    "currency": "INR"
  }
}
```

> **`amount` is in paise** (1 INR = 100 paise). `119800` means ₹1,198.00 (e.g. 2 × ₹599).

**After success, save the returned values:**

1. Copy `data.orderId` → paste into the `order_id` collection variable
2. Copy `data.razorpayOrderId` → paste into the `razorpay_order_id` collection variable

These are used to open the Razorpay payment modal on the frontend and to look up the order later.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `UNAUTHORIZED` | 401 | No or missing token | Set `access_token` variable and ensure collection Authorization is configured |
| `TOKEN_EXPIRED` | 401 | Access token has expired | Re-login and update `access_token` |
| `FORBIDDEN` | 403 | Token belongs to an admin account | Use a buyer token, not an admin token |
| `VALIDATION_ERROR` | 400 | `shippingAddress` is missing or a field fails validation | Check all required fields are present; `pincode` must be exactly 6 digits; `phone` must be at least 10 digits |
| `CART_EMPTY` | 422 | Buyer has no items in cart | Add items via `PUT /api/buyer/cart` first |
| `OUT_OF_STOCK` | 422 | One or more cart items has insufficient stock | Reduce the quantity for that product in the cart, or remove it |

---

### Step 3 — Verify Stock Was Decremented

After a successful order, the product stock is reduced by the ordered quantity. Confirm this with the public catalog:

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/products/monstera-deliciosa` |
| Name | `3. Check Product Stock` |

No auth required. **Click Send.** Check that `data.stock` has decreased by the quantity you ordered.

---

## Section C — Viewing Orders

---

### Step 4 — GET /api/buyer/orders (order history)

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/buyer/orders` |
| Name | `4. List Orders` |

No body. Auth is inherited from the collection.

**Optional query parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `20` | Results per page |

Example with pagination: `{{base_url}}/api/buyer/orders?page=1&limit=10`

**Click Send. Expected response — `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "6849f3cfdae5ce6307946ccc",
      "userId": "6849f3cfdae5ce6307946bbb",
      "items": [
        {
          "productId": "6849f3cfdae5ce6307946fff",
          "name": "Monstera Deliciosa",
          "quantity": 2,
          "priceAtOrder": 599
        }
      ],
      "subtotal": 1198,
      "shippingFee": 0,
      "total": 1198,
      "razorpayOrderId": "order_PqR8sTuVwXyZ12",
      "paymentStatus": "pending",
      "status": "pending",
      "createdAt": "2026-06-23T08:00:00.000Z",
      "updatedAt": "2026-06-23T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

> Results are sorted **newest first**. Only orders belonging to the authenticated buyer are returned — other buyers' orders are never visible.

**After success:** Copy `data[0]._id` → paste into the `order_id` collection variable for use in Step 5.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `UNAUTHORIZED` | 401 | No or missing token | Set `access_token` variable and check collection Authorization |
| `TOKEN_EXPIRED` | 401 | Access token has expired | Re-login and update `access_token` |

---

### Step 5 — GET /api/buyer/orders/:id (order detail)

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/buyer/orders/{{order_id}}` |
| Name | `5. Get Order` |

No body. Auth is inherited from the collection. **Click Send. Expected response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "_id": "6849f3cfdae5ce6307946ccc",
    "userId": "6849f3cfdae5ce6307946bbb",
    "items": [
      {
        "productId": "6849f3cfdae5ce6307946fff",
        "name": "Monstera Deliciosa",
        "quantity": 2,
        "priceAtOrder": 599
      }
    ],
    "shippingAddress": {
      "fullName": "Ravi Kumar",
      "phone": "9876543210",
      "line1": "42 MG Road",
      "line2": "Near City Mall",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560001"
    },
    "subtotal": 1198,
    "shippingFee": 0,
    "total": 1198,
    "razorpayOrderId": "order_PqR8sTuVwXyZ12",
    "paymentStatus": "pending",
    "status": "pending",
    "createdAt": "2026-06-23T08:00:00.000Z",
    "updatedAt": "2026-06-23T08:00:00.000Z"
  }
}
```

> `priceAtOrder` is the price snapshotted at the time of purchase — it does not change if the product price is updated later.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `UNAUTHORIZED` | 401 | No or missing token | Set `access_token` variable and check collection Authorization |
| `TOKEN_EXPIRED` | 401 | Access token has expired | Re-login and update `access_token` |
| `ORDER_NOT_FOUND` | 404 | Order does not exist or belongs to another buyer | Use a valid `order_id` from Step 4 |

---

## Section D — What Happens Next (Razorpay Payment)

Placing an order does **not** complete payment. The order is created with `paymentStatus: "pending"`. Payment is a separate step handled by the Razorpay SDK on the frontend:

| Step | Who | What |
|------|-----|------|
| 1 | Backend | Creates Razorpay order, returns `razorpayOrderId` + `amount` |
| 2 | Frontend | Opens Razorpay checkout modal using `razorpayOrderId`, `amount`, and `RAZORPAY_KEY_ID` |
| 3 | Buyer | Completes payment in the modal |
| 4 | Razorpay | Sends webhook to `POST /api/webhooks/razorpay` |
| 5 | Backend | Verifies HMAC signature, marks order `paymentStatus: "paid"` and `status: "placed"` |

> The webhook endpoint (`POST /api/webhooks/razorpay`) is implemented in Issue #47. Until then, `paymentStatus` remains `"pending"` after this guide's flow.

---

## Error Code Reference

| Code | Status | Plain-English Meaning | What to Do |
|------|--------|-----------------------|-----------|
| `UNAUTHORIZED` | 401 | No Bearer token provided | Set `access_token` variable; check collection Authorization tab |
| `TOKEN_EXPIRED` | 401 | Access token is expired | Re-login via buyer auth OTP flow and paste new token into `access_token` |
| `FORBIDDEN` | 403 | Admin token used on a buyer route | Generate a buyer token via the buyer auth flow |
| `VALIDATION_ERROR` | 400 | Request body is malformed | Verify `shippingAddress` is present with all required fields; `pincode` is exactly 6 digits |
| `CART_EMPTY` | 422 | Cart has no items | Add items to the cart first using `PUT /api/buyer/cart` |
| `OUT_OF_STOCK` | 422 | A cart item's quantity exceeds available stock | Check stock via `GET /api/products/:slug` and reduce quantity in the cart |
| `ORDER_NOT_FOUND` | 404 | Order does not exist or belongs to another buyer | Use a valid `order_id` from `GET /api/buyer/orders` |

---

## Typical Order Flow

The expected sequence for a buyer placing their first order:

1. `POST /api/buyer/auth/email/send-otp` — request OTP
2. `POST /api/buyer/auth/email/verify-otp` — get `accessToken`, save to `{{access_token}}`
3. `GET /api/products` — browse products, note `_id` of desired items
4. `PUT /api/buyer/cart` — save desired items to cart
5. `GET /api/buyer/cart` — verify cart before checkout
6. `POST /api/buyer/orders` — place order, save `orderId` and `razorpayOrderId`
7. *(Frontend)* Open Razorpay checkout modal with `razorpayOrderId`
8. *(Webhook)* Payment captured → order `status` becomes `"placed"`
9. `GET /api/buyer/orders` — view full order history with pagination
10. `GET /api/buyer/orders/{{order_id}}` — view a specific order's detail
