import prisma from "../../config/prisma.js";
const resources = ["universities", "programs", "applications", "testimonials", "faqs", "users", "settings"];
const actions = ["create", "read", "update", "delete"];
export async function seedPermissions() {
    console.log("Seeding permissions...");
    for (const resource of resources) {
        for (const action of actions) {
            await prisma.permission.upsert({
                where: {
                    resource_action: {
                        resource,
                        action,
                    },
                },
                update: {},
                create: {
                    resource,
                    action,
                    description: `${action} ${resource}`,
                },
            });
        }
    }
    console.log("Permissions seeded successfully");
}
//# sourceMappingURL=seed-permissions.js.map