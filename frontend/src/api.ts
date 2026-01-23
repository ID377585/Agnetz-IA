const API_URL = import.meta.env.VITE_API_URL || "";

export async function getUsers() {
  const res = await fetch(`${API_URL}/api/users`);
  if (!res.ok) throw new Error("failed_to_fetch_users");
  return res.json();
}

export async function createUser(payload: { email: string; name?: string }) {
  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("failed_to_create_user");
  return res.json();
}

export async function updateUser(id: string, payload: { email?: string; name?: string }) {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("failed_to_update_user");
  return res.json();
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("failed_to_delete_user");
  return true;
}
