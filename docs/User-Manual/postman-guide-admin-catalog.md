# Postman Manual — LeafFlow Admin Catalog API

A step-by-step guide to testing all 8 admin catalog endpoints (categories + products) using Postman.

---

## Prerequisites

Before opening Postman, make sure:

1. **Backend is running**
   ```
   npm run dev --workspace backend
   ```
   You should see `Server running on port 3000` in the terminal.

2. **You have a valid admin JWT** — complete the admin login flow (OTP) to get an `accessToken` before testing any catalog endpoint. All routes return `401` without it.

---

## One-Time Postman Setup

### 1. Create a Collection

1. Open Postman → click **Collections** in the left sidebar → **+** (New Collection)
2. Name it: `LeafFlow Admin Catalog`

### 2. Add Collection Variables

1. Click on the collection name → go to the **Variables** tab
2. Add these variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `http://localhost:3000` | `http://localhost:3000` |
| `admin_token` | *(paste your admin accessToken)* | *(paste your admin accessToken)* |
| `category_id` | *(leave empty)* | *(leave empty)* |
| `product_id` | *(leave empty)* | *(leave empty)* |

3. Click **Save**

> Paste your admin `accessToken` into `admin_token`. It expires in 15 minutes — refresh it via `POST /api/admin/auth/refresh` if needed.

### 3. Set Default Authorization (Optional)

1. Click the collection name → **Authorization** tab
2. Type: `Bearer Token`
3. Token: `{{admin_token}}`

This applies the token to every request in the collection automatically — no need to set it per-request.

---

## Section A — Categories

---

### Step 1 — List All Categories

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/admin/categories` |
| Name | `1. List Categories` |

No body needed.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "6849f3cfdae5ce6307946abc",
        "name": "Succulents",
        "slug": "succulents",
        "description": "Hardy desert plants",
        "imageUrl": null,
        "isActive": true,
        "createdAt": "2026-06-17T04:00:00.000Z",
        "updatedAt": "2026-06-17T04:00:00.000Z"
      }
    ]
  }
}
```

> Returns **all** categories sorted by name A→Z, including inactive ones (`isActive: false`).

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `UNAUTHORIZED` | 401 | No or expired admin token | Paste a fresh `accessToken` into `admin_token` variable |

---

### Step 2 — Create a Category

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/categories` |
| Name | `2. Create Category` |

**Body tab → raw → JSON:**
```json
{
  "name": "Tropical Plants",
  "description": "Lush plants from tropical climates"
}
```

> `name` is required. `description` and `imageUrl` are optional. The `slug` is **auto-generated** from the name — you never send it manually.

**Click Send. Expected response — `201 Created`:**
```json
{
  "success": true,
  "message": "Category created",
  "data": {
    "category": {
      "_id": "6849f3cfdae5ce6307946def",
      "name": "Tropical Plants",
      "slug": "tropical-plants",
      "description": "Lush plants from tropical climates",
      "isActive": true,
      "createdAt": "2026-06-17T04:00:00.000Z",
      "updatedAt": "2026-06-17T04:00:00.000Z"
    }
  }
}
```

**After success:**
1. Copy the `_id` value from the response
2. Paste it into the collection variable `category_id` → **Save**

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `VALIDATION_ERROR` | 400 | `name` field is missing or empty | Add `"name"` to the request body |
| `DUPLICATE_SLUG` | 409 | A category with the same name (slug) already exists | Use a different name |

---

### Step 3 — Update a Category

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| URL | `{{base_url}}/api/admin/categories/{{category_id}}` |
| Name | `3. Update Category` |

**Body tab → raw → JSON:**
```json
{
  "name": "Tropical Beauties",
  "description": "Updated description"
}
```

> Send only the fields you want to change. All fields are optional. If `name` changes, the `slug` is **auto-updated**.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Category updated",
  "data": {
    "category": {
      "_id": "6849f3cfdae5ce6307946def",
      "name": "Tropical Beauties",
      "slug": "tropical-beauties",
      "description": "Updated description",
      "isActive": true
    }
  }
}
```

**To deactivate (soft hide) a category without deleting it:**
```json
{
  "isActive": false
}
```

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `NOT_FOUND` | 404 | `category_id` variable is wrong or deleted | Re-check the ID or create a new category (Step 2) |
| `DUPLICATE_SLUG` | 409 | Another category already has the new name | Use a unique name |

---

### Step 4 — Delete a Category

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| URL | `{{base_url}}/api/admin/categories/{{category_id}}` |
| Name | `4. Delete Category` |

No body needed.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Category deleted"
}
```

> **Important — soft vs hard delete:**
> - If the category has **products linked to it** → the category is **soft-deleted** (`isActive: false`). The document is NOT removed. Message will be `"Category deactivated"`.
> - If the category has **no products** → the category is **hard-deleted** (removed from the database). Message will be `"Category deleted"`.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `NOT_FOUND` | 404 | Category does not exist | Check `category_id` variable |

---

## Section B — Products

---

### Step 5 — List Products (with filters)

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/admin/products` |
| Name | `5. List Products` |

No body needed. Response is paginated — default 20 per page.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6849f3cfdae5ce6307946fff",
      "name": "Monstera Deliciosa",
      "slug": "monstera-deliciosa",
      "price": 599,
      "stock": 12,
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

**Available query parameters:**

| Parameter | Example | Description |
|-----------|---------|-------------|
| `page` | `?page=2` | Page number (default: 1) |
| `limit` | `?limit=10` | Items per page (default: 20) |
| `categoryId` | `?categoryId={{category_id}}` | Filter by category |
| `isActive` | `?isActive=false` | Filter by active status (`true` or `false`) |
| `q` | `?q=monstera` | Full-text search on name, common name, scientific name |

**Example — search + paginate:**
```
GET {{base_url}}/api/admin/products?q=fern&page=1&limit=10
```

**Example — inactive products in a category:**
```
GET {{base_url}}/api/admin/products?categoryId={{category_id}}&isActive=false
```

---

### Step 6 — Create a Product

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/products` |
| Name | `6. Create Product` |

**Body tab → raw → JSON:**
```json
{
  "name": "Monstera Deliciosa",
  "commonName": "Swiss Cheese Plant",
  "scientificName": "Monstera deliciosa",
  "categoryId": "{{category_id}}",
  "price": 599,
  "compareAtPrice": 799,
  "stock": 12,
  "images": [],
  "lightRequirement": "indirect",
  "waterSchedule": "weekly",
  "humidity": "high",
  "petFriendly": false,
  "potSize": "6 inch",
  "heightRange": "30–60 cm",
  "careInstructions": "Water once a week. Keep away from direct sunlight."
}
```

**Required fields:** `name`, `commonName`, `categoryId`, `price`, `lightRequirement`, `waterSchedule`, `humidity`, `petFriendly`

**Enum values:**

| Field | Allowed values |
|-------|---------------|
| `lightRequirement` | `"low"` `"medium"` `"high"` `"indirect"` |
| `waterSchedule` | `"daily"` `"every-2-days"` `"weekly"` `"bi-weekly"` |
| `humidity` | `"low"` `"medium"` `"high"` |

> `slug` is **auto-generated** from `name` — do not send it unless you need a custom slug.

**Click Send. Expected response — `201 Created`:**
```json
{
  "success": true,
  "message": "Product created",
  "data": {
    "product": {
      "_id": "6849f3cfdae5ce6307946fff",
      "name": "Monstera Deliciosa",
      "slug": "monstera-deliciosa",
      "price": 599,
      "stock": 12,
      "isActive": true
    }
  }
}
```

**After success:**
1. Copy the `_id` from the response
2. Paste it into collection variable `product_id` → **Save**

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `VALIDATION_ERROR` | 400 | A required field is missing or an enum value is wrong | Check `details` in the response — it names the failing field |
| `DUPLICATE_SLUG` | 409 | A product with the same name already exists | Use a different name or pass a custom `slug` |

---

### Step 7 — Update a Product

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `PATCH` |
| URL | `{{base_url}}/api/admin/products/{{product_id}}` |
| Name | `7. Update Product` |

**Body tab → raw → JSON** — send only the fields you want to change:
```json
{
  "stock": 50,
  "price": 549
}
```

> All fields are optional in a PATCH. Only the fields you send are updated — others stay unchanged. If `name` changes, the `slug` is **auto-updated**.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Product updated",
  "data": {
    "product": {
      "_id": "6849f3cfdae5ce6307946fff",
      "name": "Monstera Deliciosa",
      "slug": "monstera-deliciosa",
      "stock": 50,
      "price": 549
    }
  }
}
```

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `NOT_FOUND` | 404 | Product does not exist | Check `product_id` variable |
| `DUPLICATE_SLUG` | 409 | Another product already has the new name | Use a unique name |

---

### Step 8 — Delete a Product (Soft Delete)

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| URL | `{{base_url}}/api/admin/products/{{product_id}}` |
| Name | `8. Delete Product` |

No body needed.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Product deactivated"
}
```

> Products are **always soft-deleted** — `isActive` is set to `false`. The document is never removed from the database. This preserves order history that references this product. To permanently hide it from buyers, `isActive: false` is enough.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `NOT_FOUND` | 404 | Product does not exist | Check `product_id` variable |

---

## Error Code Reference

| Code | Status | Plain-English Meaning | What to Do |
|------|--------|-----------------------|-----------|
| `VALIDATION_ERROR` | 400 | A required field is missing or has the wrong format/enum value | Check the `details` object — it names exactly which field failed |
| `UNAUTHORIZED` | 401 | No Bearer token or token expired | Paste a fresh `accessToken` into `admin_token` |
| `NOT_FOUND` | 404 | The category or product ID does not exist | Re-check the ID in your collection variables |
| `DUPLICATE_SLUG` | 409 | Another document already has the same name (slug) | Use a different name |

---

## Understanding Validation Errors

When a required field is missing or an enum value is wrong, the response includes a `details` object:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "lightRequirement": "Invalid enum value. Expected 'low' | 'medium' | 'high' | 'indirect'"
  }
}
```

Each key in `details` is the field name, and the value is the reason it failed. Fix those fields in your request body and try again.
