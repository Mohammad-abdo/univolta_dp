# Roles and Permissions System

This document describes the roles and permissions system implemented in the backend.

## Roles

The system has three roles:

1. **Admin** - Full access to all resources
2. **Editor** - Can manage content (universities, programs, testimonials, FAQs) but cannot manage users or settings
3. **User** - Limited access, can only create applications and testimonials, read public content

## Permissions

Permissions are defined as `resource:action` pairs:

- **Resources**: `universities`, `programs`, `applications`, `testimonials`, `faqs`, `users`, `settings`
- **Actions**: `create`, `read`, `update`, `delete`

## Permission Matrix

### Admin
- ✅ Full CRUD on all resources
- ✅ Can manage users
- ✅ Can manage settings

### Editor
- ✅ Create, Read, Update on `universities` (no delete)
- ✅ Create, Read, Update on `programs` (no delete)
- ✅ Read, Update on `applications` (can update status)
- ✅ Full CRUD on `testimonials`
- ✅ Full CRUD on `faqs`
- ❌ Cannot manage `users`
- ❌ Cannot manage `settings`

### User
- ✅ Read `universities`
- ✅ Read `programs`
- ✅ Create, Read `applications` (only their own)
- ✅ Create, Read `testimonials`
- ✅ Read `faqs`
- ❌ Cannot update or delete most resources
- ❌ Cannot manage `users` or `settings`

## Usage in Routes

### Basic Permission Check
```typescript
import { requirePermission } from "../../common/middleware/permissions.js";

router.post("/", requirePermission("universities", "create"), async (req, res, next) => {
  // Route handler
});
```

### Multiple Permissions
```typescript
import { requireAnyPermission, requireAllPermissions } from "../../common/middleware/permissions.js";

// User needs ANY of these permissions
router.get("/", requireAnyPermission(
  { resource: "applications", action: "read" },
  { resource: "applications", action: "update" }
), async (req, res, next) => {
  // Route handler
});

// User needs ALL of these permissions
router.post("/", requireAllPermissions(
  { resource: "universities", action: "create" },
  { resource: "programs", action: "create" }
), async (req, res, next) => {
  // Route handler
});
```

## Special Cases

### Applications
- **Public**: Anyone can create an application (POST `/applications`)
- **Authenticated**: Users can only read their own applications unless they are admin/editor
- **Admin/Editor**: Can read and update all applications

### Testimonials
- **Public**: Anyone can read published testimonials (GET `/testimonials`)
- **Authenticated**: Users can create testimonials
- **Admin/Editor**: Can update and delete testimonials

### Universities & Programs
- **Authenticated**: All authenticated users can read
- **Editor/Admin**: Can create and update
- **Admin Only**: Can delete

## Adding New Permissions

To add a new permission:

1. Add the resource to the `Resource` type in `backend/src/common/permissions.ts`
2. Add permissions to `rolePermissions` for each role
3. Use `requirePermission` middleware in your routes

Example:
```typescript
// In permissions.ts
export type Resource = 
  | "universities"
  | "programs"
  | "newResource"; // Add new resource

// Add permissions
export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // ... existing permissions
    "newResource:create",
    "newResource:read",
    "newResource:update",
    "newResource:delete",
  ],
  // ... other roles
};

// In your router
router.post("/", requirePermission("newResource", "create"), async (req, res, next) => {
  // Handler
});
```





