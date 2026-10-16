export async function getMyAccess() {
  return { status: "ativo", roles: ["admin"], fullName: "Admin", email: "admin@admin.com" };
}
