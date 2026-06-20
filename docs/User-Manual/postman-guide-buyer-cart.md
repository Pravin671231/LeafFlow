# Postman Manual — LeafFlow Buyer Cart API

A step-by-step guide to testing the cart endpoints using Postman. Both routes require a valid buyer access token.

---

## Prerequisites

Before opening Postman, make sure:

1. **Backend is running**
   ```
   npm run dev --workspace backend
   ```
   You should see `Server running on port 3000` in the terminal.

2. **You have a verified buyer account** — you need an access token before any cart request will work. Follow the buyer auth flow (send OTP → verify OTP) to obtain one.

---

## One-Time Postman Setup

### 1. Create a Collection

1. Open Postman → click **Collections** in the left sidebar → **+** (New Collection)
2. Name it: `LeafFlow Buyer Cart`

### 2. Add Collection Variables

1. Click on the collection name → go to the **Variables** tab
2. Add these variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `http://localhost:3000` | `http://localhost:3000` |
| `access_token` | *(leave empty)* | *(filled after login)* |

3. Click **Save**

### 3. Configure Authorization

1. Click on the collection name → go to the **Authorization** tab
2. Set **Type** to `Bearer Token`
3. Set **Token** to `{{access_token}}`
4. Click **Save**

All requests in this collection will inherit this header automatically — no need to set it per request.

### 4. Get an Access Token

If you don't have a token yet:

1. `POST {{base_url}}/api/buyer/auth/email/send-otp` with `{ "email": "your@email.com" }`
2. `POST {{base_url}}/api/buyer/auth/email/verify-otp` with `{ "otpSessionId": "...", "otp": "..." }`
3. Copy the `data.accessToken` from the response
4. Paste it into the `access_token` collection variable → **Save**

---

## Request Body Schema

For `PUT /api/buyer/cart`, the body must be a JSON object with an `items` array.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `items` | array | yes | Can be empty (`[]`) to clear the cart |
| `items[].productId` | string | yes | `_id` of the product from `GET /api/products` |
| `items[].quantity` | integer | yes | Must be ≥ 1 |

> **Price is not sent in the request.** It is populated automatically from the product record in the response (`items[].productId.price`).

---

## Section A — Reading the Cart

---

### Step 1 — GET /api/buyer/cart (empty cart)

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/buyer/cart` |
| Name | `1. Get Cart` |

No body. Auth is inherited from the collection. **Click Send. Expected response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "items": []
  }
}
```

> A buyer with no cart always gets `200` with an empty `items` array — never a `404`.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `UNAUTHORIZED` | 401 | No or missing token | Set `access_token` variable and ensure collection Authorization is configured |
| `TOKEN_EXPIRED` | 401 | Access token has expired | Re-login and update `access_token` |

---

## Section B — Updating the Cart

---

### Step 2 — PUT /api/buyer/cart (add items)

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `PUT` |
| URL | `{{base_url}}/api/buyer/cart` |
| Name | `2. Replace Cart` |
| Body | `raw` → `JSON` |

**Request body:**
```json
{
  "items": [
    {
      "productId": "6849f3cfdae5ce6307946fff",
      "quantity": 2
    }
  ]
}
```

Replace `productId` with an actual `_id` from `GET /api/products`.

Auth is inherited from the collection. **Click Send. Expected response — `200 OK`:**

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
          "images": ["https://res.cloudinary.com/dwanncrtz/image/upload/v1/leafflow/products/monstera.jpg"]
        },
        "quantity": 2
      }
    ],
    "createdAt": "2026-06-20T10:00:00.000Z",
    "updatedAt": "2026-06-20T10:00:00.000Z"
  }
}
```

> `PUT` is a **full replace** — the entire cart is replaced with the `items` array you send. To add a second product, include all existing items plus the new one in the same request.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `UNAUTHORIZED` | 401 | No or missing token | Set `access_token` and check collection Authorization |
| `TOKEN_EXPIRED` | 401 | Access token has expired | Re-login and update `access_token` |
| `VALIDATION_ERROR` | 400 | Missing or invalid fields (e.g. `quantity: 0`) | Ensure `productId` is a non-empty string and `quantity` is an integer ≥ 1 |
| `PRODUCT_NOT_FOUND` | 422 | `productId` does not exist in the database | Copy a valid `_id` from `GET /api/products` |
| `STOCK_EXCEEDED` | 422 | `quantity` exceeds available stock for that product | Check `stock` from `GET /api/products/:slug` and reduce quantity |

---

### Step 3 — PUT /api/buyer/cart (multiple items)

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `PUT` |
| URL | `{{base_url}}/api/buyer/cart` |
| Name | `3. Replace Cart (Multiple Items)` |
| Body | `raw` → `JSON` |

**Request body:**
```json
{
  "items": [
    { "productId": "6849f3cfdae5ce6307946fff", "quantity": 1 },
    { "productId": "6849f3cfdae5ce6307946aaa", "quantity": 3 }
  ]
}
```

**Click Send. Expected response — `200 OK`** with both items populated in `data.items`.

---

### Step 4 — PUT /api/buyer/cart (clear cart)

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `PUT` |
| URL | `{{base_url}}/api/buyer/cart` |
| Name | `4. Clear Cart` |
| Body | `raw` → `JSON` |

**Request body:**
```json
{
  "items": []
}
```

**Click Send. Expected response — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "items": []
  }
}
```

> Sending an empty `items` array clears the cart. The cart document is kept in the database but with no items.

---

### Step 5 — GET /api/buyer/cart (verify)

Use the same request from **Step 1** to confirm the cart reflects the last `PUT`.

---

## Error Code Reference

| Code | Status | Plain-English Meaning | What to Do |
|------|--------|-----------------------|-----------|
| `UNAUTHORIZED` | 401 | No Bearer token provided | Set `access_token` variable; check collection Authorization tab |
| `TOKEN_EXPIRED` | 401 | Access token is expired | Re-login via buyer auth OTP flow and paste new token into `access_token` |
| `VALIDATION_ERROR` | 400 | Request body is malformed | Check that each item has a non-empty `productId` string and `quantity` integer ≥ 1 |
| `PRODUCT_NOT_FOUND` | 422 | `productId` does not match any product | Use a valid `_id` from `GET /api/products` |
| `STOCK_EXCEEDED` | 422 | Requested quantity exceeds product's available stock | Reduce `quantity` to ≤ the `stock` value shown in the product listing |

---

## Typical Cart Flow

The expected sequence for a buyer adding items to their cart:

1. `POST /api/buyer/auth/email/send-otp` — request OTP
2. `POST /api/buyer/auth/email/verify-otp` — get `accessToken`, save to `{{access_token}}`
3. `GET /api/products` — browse products, note `_id` of desired items
4. `PUT /api/buyer/cart` — send desired items (full cart state)
5. `GET /api/buyer/cart` — verify cart before proceeding to checkout
