# Postman Manual — LeafFlow Buyer Catalog API

A step-by-step guide to testing all public catalog endpoints (products + categories) using Postman. No authentication is required — all routes are publicly accessible.

---

## Prerequisites

Before opening Postman, make sure:

1. **Backend is running**
   ```
   npm run dev --workspace backend
   ```
   You should see `Server running on port 3000` in the terminal.

> No SMTP or Google OAuth setup is needed. All catalog routes are public and require no login.

---

## One-Time Postman Setup

### 1. Create a Collection

1. Open Postman → click **Collections** in the left sidebar → **+** (New Collection)
2. Name it: `LeafFlow Buyer Catalog`

### 2. Add Collection Variables

1. Click on the collection name → go to the **Variables** tab
2. Add this variable:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `http://localhost:3000` | `http://localhost:3000` |

3. Click **Save**

---

## Available Query Parameters

All filters on `GET /api/products` are optional and can be combined freely.

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `category` | string (slug) | `?category=succulents` | Filter by category slug |
| `minPrice` | number | `?minPrice=299` | Minimum price, inclusive |
| `maxPrice` | number | `?maxPrice=999` | Maximum price, inclusive |
| `light` | enum | `?light=low` | `low`, `medium`, `high`, or `indirect` |
| `inStock` | boolean | `?inStock=true` | Only products with stock > 0 |
| `q` | string | `?q=monstera` | Text search on name, common name, scientific name |
| `page` | number | `?page=2` | Page number (default: 1) |
| `limit` | number | `?limit=10` | Items per page (default: 20) |

---

## Section A — Products

---

### Step 1 — List All Products

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/products` |
| Name | `1. List Products` |

No body, no auth. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6849f3cfdae5ce6307946fff",
      "name": "Monstera Deliciosa",
      "slug": "monstera-deliciosa",
      "commonName": "Swiss Cheese Plant",
      "price": 599,
      "compareAtPrice": 799,
      "stock": 12,
      "images": ["https://res.cloudinary.com/dwanncrtz/image/upload/v1/leafflow/products/monstera.jpg"],
      "lightRequirement": "indirect",
      "petFriendly": false,
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

> Returns only **active** products (`isActive: true`). Inactive products are never returned to buyers regardless of filters.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `NOT_FOUND` | 404 | `?category=<slug>` was supplied but no active category matches that slug | Check the slug in `GET /api/categories` and use an exact match |

---

### Step 2 — Filter Products

Use any combination of filters in the query string.

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/products?category=succulents&light=low&inStock=true` |
| Name | `2. Filter Products` |

No body, no auth. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6849f3cfdae5ce6307946aaa",
      "name": "Haworthia Fasciata",
      "slug": "haworthia-fasciata",
      "price": 299,
      "stock": 8,
      "lightRequirement": "low",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3
  }
}
```

**Example filter combinations:**

```
GET {{base_url}}/api/products?light=low&inStock=true
GET {{base_url}}/api/products?category=tropical-plants&minPrice=500
GET {{base_url}}/api/products?minPrice=200&maxPrice=800&petFriendly=true
```

> All filters use **AND** logic — each filter narrows the result further.

---

### Step 3 — Filter by Price Range

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/products?minPrice=300&maxPrice=600` |
| Name | `3. Filter by Price` |

No body, no auth. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6849f3cfdae5ce6307946bbb",
      "name": "Peace Lily",
      "slug": "peace-lily",
      "price": 449,
      "stock": 5,
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12
  }
}
```

> `minPrice` and `maxPrice` are both **inclusive**. You can use either or both together.

---

### Step 4 — Search Products with Pagination

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/products?q=monstera&page=1&limit=10` |
| Name | `4. Search Products` |

No body, no auth. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6849f3cfdae5ce6307946fff",
      "name": "Monstera Deliciosa",
      "slug": "monstera-deliciosa",
      "commonName": "Swiss Cheese Plant",
      "price": 599,
      "stock": 12,
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

> Text search matches against **name**, **commonName**, and **scientificName**. Use `page` and `limit` to navigate large result sets. The `total` field always reflects the full unpagenated count.

**Example — page 2 of a search:**
```
GET {{base_url}}/api/products?q=fern&page=2&limit=5
```

---

### Step 5 — Get a Single Product

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/products/monstera-deliciosa` |
| Name | `5. Get Product` |

Replace `monstera-deliciosa` with any product slug from the list response.

No body, no auth. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "6849f3cfdae5ce6307946fff",
      "name": "Monstera Deliciosa",
      "slug": "monstera-deliciosa",
      "commonName": "Swiss Cheese Plant",
      "scientificName": "Monstera deliciosa",
      "description": "A tropical beauty known for its distinctive split leaves.",
      "categoryId": "6849f3cfdae5ce6307946abc",
      "price": 599,
      "compareAtPrice": 799,
      "stock": 12,
      "images": ["https://res.cloudinary.com/dwanncrtz/image/upload/v1/leafflow/products/monstera.jpg"],
      "lightRequirement": "indirect",
      "waterSchedule": "weekly",
      "humidity": "high",
      "petFriendly": false,
      "potSize": "6 inch",
      "heightRange": "30–60 cm",
      "careInstructions": "Water once a week. Keep away from direct sunlight.",
      "isActive": true,
      "createdAt": "2026-06-17T04:00:00.000Z",
      "updatedAt": "2026-06-17T04:00:00.000Z"
    }
  }
}
```

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `NOT_FOUND` | 404 | Slug does not exist, or the product is inactive (`isActive: false`) | Confirm the slug from `GET /api/products` — inactive products are deliberately hidden |

> Inactive and non-existent products both return `404`. No distinction is made to prevent product enumeration.

---

## Section B — Categories

---

### Step 6 — List All Categories

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/categories` |
| Name | `6. List Categories` |

No body, no auth. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "6849f3cfdae5ce6307946abc",
        "name": "Ferns",
        "slug": "ferns",
        "description": "Shade-loving leafy plants",
        "imageUrl": "https://res.cloudinary.com/dwanncrtz/image/upload/v1/leafflow/products/ferns.jpg",
        "isActive": true,
        "createdAt": "2026-06-17T04:00:00.000Z",
        "updatedAt": "2026-06-17T04:00:00.000Z"
      },
      {
        "_id": "6849f3cfdae5ce6307946def",
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

> Returns only **active** categories, sorted **A → Z** by name. Use the `slug` value from this response as the `?category=` filter in product requests.

---

## Error Code Reference

| Code | Status | Plain-English Meaning | What to Do |
|------|--------|-----------------------|-----------|
| `NOT_FOUND` | 404 | Product slug does not exist or is inactive, or category slug not found | Verify the slug from the list endpoint; inactive products return 404 intentionally |

---

## Typical Browsing Flow

The expected sequence for a buyer browsing the catalog:

1. `GET /api/categories` — load the category list to populate the filter sidebar
2. `GET /api/products` — load the default product grid (page 1, no filters)
3. `GET /api/products?category=succulents&page=1&limit=20` — buyer selects a category
4. `GET /api/products?category=succulents&light=low&inStock=true` — buyer applies additional filters
5. `GET /api/products/haworthia-fasciata` — buyer clicks a product to view its detail page
