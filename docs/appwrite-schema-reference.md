# BLING’D Appwrite Database Reference

Database ID: `YOUR_DATABASE_ID`

All Appwrite documents also include these system fields: `$id`, `$sequence`, `$createdAt`, `$updatedAt`, `$permissions`, `$databaseId`, and `$collectionId`.

This is a live schema snapshot from 2026-08-15. Example data is deliberately redacted where it could expose customer or admin information.

## `storefront_banners` - storefront_banners

Rows: 0

No custom fields have been created yet.

## `storefront_drops` - storefront DROPS

Rows: 1

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `name` | string (160) | Yes | - |
| `slug` | string (160) | Yes | - |
| `description` | string (2000) | No | `""` |
| `enabled` | boolean | No | `true` |
| `featured` | boolean | No | `false` |
| `launchAt` | datetime | No | `null` |
| `coverImage` | string (2000) | No | `""` |
| `position` | integer | No | `0` |

Indexes: `slug` unique, plus indexes on `enabled` and `position`.

```json
{
  "$id": "project_0",
  "name": "Project 0",
  "slug": "project-0",
  "description": "The original BLING’D product release.",
  "enabled": true,
  "featured": true,
  "launchAt": null,
  "coverImage": "",
  "position": 0
}
```

## `useractivity` - User Activity

Rows: 789

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `type` | string (20) | Yes | - |
| `productId` | string (50) | No | `null` |
| `cart` | string (8000) | No | `null` |
| `userId` | string (50) | No | `null` |

`cart` stores a JSON string, normally a cart snapshot.

```json
{
  "type": "cart_snapshot",
  "productId": null,
  "cart": "[{...cart item data...}]",
  "userId": "guest"
}
```

## `storefront_settings` - storefront_settings

Rows: 1

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `isLocked` | boolean | No | `null` |
| `unlockAt` | datetime | No | `null` |
| `lockPassword` | string (235) | No | `null` |
| `homeVideoUrl` | string (2048) | No | `/videos/background.webm` |
| `homeVideoFileId` | string (2048) | No | `""` |
| `homePosterUrl` | string (2048) | No | `""` |
| `shopVideoUrl` | string (2048) | No | `/videos/BLING’D.webm` |
| `shopVideoFileId` | string (2048) | No | `""` |
| `shopPosterUrl` | string (2048) | No | `""` |

```json
{
  "$id": "global_settings",
  "isLocked": false,
  "unlockAt": "2026-08-29T09:00:00.000+00:00",
  "lockPassword": "[redacted]",
  "homeVideoUrl": "https://ik.imagekit.io/.../background.webm",
  "homeVideoFileId": "imagekit-file-id",
  "homePosterUrl": "",
  "shopVideoUrl": "https://ik.imagekit.io/.../storefront.webm",
  "shopVideoFileId": "imagekit-file-id",
  "shopPosterUrl": ""
}
```

## `analytics_events` - analytics_events

Rows: 0

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `type` | string (90) | Yes | - |
| `userId` | string (90) | Yes | - |
| `sessionId` | string (60) | Yes | - |
| `metadata` | string (60) | Yes | - |
| `timestamp` | string (90) | Yes | - |

Recommended row:

```json
{
  "type": "product_view",
  "userId": "anonymous",
  "sessionId": "session-id",
  "metadata": "{\"productId\":\"product-id\"}",
  "timestamp": "2026-08-15T12:00:00.000Z"
}
```

## `analytics_sessions` - analytics_sessions

Rows: 5,000

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `userId` | string (60) | Yes | - |
| `startTime` | string (60) | Yes | - |
| `lastActive` | string (60) | Yes | - |
| `isActive` | string (79) | Yes | - |

```json
{
  "userId": "anonymous",
  "startTime": "2026-05-27T08:36:22.350Z",
  "lastActive": "2026-05-27T08:46:33.696Z",
  "isActive": "true"
}
```

## `analytics_visits_` - analytics_visits

Rows: 5,000

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `page` | string (70) | Yes | - |
| `userId` | string (70) | Yes | - |
| `sessionId` | string (80) | Yes | - |
| `timestamp` | datetime | Yes | - |
| `referrer` | string (80) | Yes | - |
| `country` | string (50) | Yes | - |
| `city` | string (50) | Yes | - |
| `device` | string (60) | Yes | - |
| `browser` | string (60) | Yes | - |
| `os` | string (60) | Yes | - |

```json
{
  "page": "/",
  "userId": "anonymous",
  "sessionId": "session-id",
  "timestamp": "2026-05-19T17:52:48.748+00:00",
  "referrer": "direct",
  "country": "Nigeria",
  "city": "Abuja",
  "device": "desktop",
  "browser": "Chrome",
  "os": "Windows"
}
```

## `storefront_orders` - storefront ORDERS

Rows: 67

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `items` | string (20000) | Yes | - |
| `total` | integer | Yes | - |
| `userName` | string (200) | Yes | - |
| `email` | string (400) | Yes | - |
| `phone` | string (40) | Yes | - |
| `address` | string (400) | Yes | - |
| `orderNumber` | string (400) | Yes | - |

`items` stores a JSON string containing `lineItems`, optional `paymentBreakdown`, and the order `status`.

```json
{
  "items": "{\"lineItems\":[{\"$id\":\"product-id\",\"name\":\"Product name\",\"price\":30000,\"quantity\":1,\"size\":\"M\",\"imageUrl\":\"https://...\",\"dropId\":\"project_0\"}],\"paymentBreakdown\":null,\"status\":\"paid\"}",
  "total": 37650,
  "userName": "[customer name]",
  "email": "[customer email]",
  "phone": "[customer phone]",
  "address": "[delivery address]",
  "orderNumber": "ORD-123456789"
}
```

## `storefront_delivery` - storefront DELIVERY

Rows: 49

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `state` | string (100) | Yes | - |
| `name` | string (160) | Yes | - |
| `price` | integer | Yes | - |
| `type` | enum: `state`, `sub_location` | Yes | - |
| `active` | boolean | No | `true` |
| `sortOrder` | integer | No | `0` |

Indexes: `state` and `type`.

```json
{
  "$id": "state_abia",
  "state": "Abia",
  "name": "Abia",
  "price": 8000,
  "type": "state",
  "active": true,
  "sortOrder": 0
}
```

## `storefront_categories` - storefront CATEGORIES

Rows: 6

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `name` | string (255) | Yes | - |
| `order` | integer | No | `null` |
| `description` | string (512) | No | `null` |
| `priority` | enum: `low`, `med`, `high` | No | `null` |
| `isActive` | boolean | No | `null` |
| `sizeGuide` | string (5000) | No | `null` |

```json
{
  "$id": "category-id",
  "name": "tee",
  "order": 2,
  "description": "polo",
  "priority": "high",
  "isActive": true,
  "sizeGuide": "https://ik.imagekit.io/.../size-guide.jpeg"
}
```

## `storefront_products` - storefront PRODUCTS

Rows: 11

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `name` | string (235) | Yes | - |
| `Price` | integer | Yes | - |
| `long_description` | string (50000) | Yes | - |
| `short_description` | string (50000) | Yes | - |
| `category` | string (235) | No | `null` |
| `stock` | integer | No | `null` |
| `comingSoon` | boolean | No | `false` |
| `colors` | string (255) | No | `null` |
| `images` | string array | No | `null` |
| `freeDelivery` | boolean | No | `false` |
| `sizes` | string array (266 per item) | No | `null` |
| `dropId` | string (64) | No | `project_0` |

Index: `dropId`.

```json
{
  "$id": "product-id",
  "name": "Product name",
  "Price": 15000,
  "long_description": "Long description here.",
  "short_description": "Short description here.",
  "category": "tee",
  "stock": 0,
  "comingSoon": false,
  "colors": "white",
  "images": ["https://ik.imagekit.io/.../product.png"],
  "freeDelivery": false,
  "sizes": ["M", "L", "XL"],
  "dropId": "project_0"
}
```

## Reuse Notes

- Appwrite string attributes above use the legacy `string` type because that is what this existing database has. New Appwrite tables should prefer `varchar`, `text`, or `mediumtext` according to the current Appwrite UI.
- Keep order `items` and activity `cart` as JSON only if you need their current compatibility. For a new app, separate line-item tables/collections are easier to query and report on.
- `analytics_sessions` and `analytics_events` currently store boolean and timestamp values as strings. Use boolean/datetime fields in a fresh design if you are not copying the current code exactly.

## `storefront_billing_services` - storefront BILLING SERVICES

Created by `npm run setup:billing`. This collection has no public permissions and is accessed only by authenticated server routes.

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `service` | enum: `appwrite`, `vercel` | Yes | - |
| `plan` | enum: `free`, `pro` | No | `free` |
| `startDate` | datetime | No | `null` |
| `monthlyPrice` | float | No | `null` |
| `note` | string (2000) | No | `""` |
| `managedBy` | enum: `local`, `timzi-hub` | No | `local` |
| `lastReminder7Day` | string (64) | No | `""` |
| `lastReminder3Day` | string (64) | No | `""` |
| `lastReminder1Day` | string (64) | No | `""` |
| `lastExpiryReminder` | string (64) | No | `""` |

The document IDs are `appwrite` and `vercel`. Status, expiry date, and days remaining are derived at read time and are not stored redundantly. Reminder fields store the expiry timestamp for the renewal period already notified, preventing repeat emails for the same period.
