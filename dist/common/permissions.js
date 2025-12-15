// Define permissions for each role
export const rolePermissions = {
    admin: [
        // Full access to everything
        "universities:create",
        "universities:read",
        "universities:update",
        "universities:delete",
        "programs:create",
        "programs:read",
        "programs:update",
        "programs:delete",
        "applications:create",
        "applications:read",
        "applications:update",
        "applications:delete",
        "testimonials:create",
        "testimonials:read",
        "testimonials:update",
        "testimonials:delete",
        "faqs:create",
        "faqs:read",
        "faqs:update",
        "faqs:delete",
        "users:create",
        "users:read",
        "users:update",
        "users:delete",
        "settings:create",
        "settings:read",
        "settings:update",
        "settings:delete",
    ],
    editor: [
        // Can manage content but not users or settings
        "universities:create",
        "universities:read",
        "universities:update",
        "programs:create",
        "programs:read",
        "programs:update",
        "applications:read",
        "applications:update", // Can update application status
        "testimonials:create",
        "testimonials:read",
        "testimonials:update",
        "testimonials:delete",
        "faqs:create",
        "faqs:read",
        "faqs:update",
        "faqs:delete",
    ],
    user: [
        // Limited access - can only create applications and testimonials, read public content
        "universities:read",
        "programs:read",
        "applications:create",
        "applications:read", // Can read their own applications
        "testimonials:create",
        "testimonials:read",
        "faqs:read",
    ],
    university: [
        // University partners can manage their own university's content
        "universities:read",
        "universities:update", // Can update their own university
        "programs:create",
        "programs:read",
        "programs:update",
        "programs:delete", // Can manage their own programs
        "applications:read",
        "applications:update", // Can manage applications for their university
        "testimonials:read",
        "faqs:read",
    ],
};
/**
 * Check if a role has a specific permission
 */
export function hasPermission(role, permission) {
    return rolePermissions[role]?.includes(permission) ?? false;
}
/**
 * Check if a role has permission for a resource and action
 */
export function canAccess(role, resource, action) {
    const permission = `${resource}:${action}`;
    return hasPermission(role, permission);
}
/**
 * Get all permissions for a role
 */
export function getRolePermissions(role) {
    return rolePermissions[role] ?? [];
}
//# sourceMappingURL=permissions.js.map