import { useEffect, useMemo, useState } from "react";
import { createUser, deleteUser, getUsers, updateUser } from "./api";

type User = {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
};

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; name?: string }>(
    {}
  );

  async function load() {
    setError("");
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      setError("Falha ao carregar usuarios");
    }
  }

  function validate() {
    const errs: { email?: string; name?: string } = {};
    if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      errs.email = "Email invalido";
    }
    if (name && name.length < 2) {
      errs.name = "Nome muito curto";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function openCreate() {
    setEditingId(null);
    setEmail("");
    setName("");
    setFieldErrors({});
    setModalOpen(true);
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setEmail(user.email);
    setName(user.name || "");
    setFieldErrors({});
    setModalOpen(true);
  }

  async function onSave() {
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      if (editingId) {
        await updateUser(editingId, { email, name: name || undefined });
      } else {
        await createUser({ email, name: name || undefined });
      }
      setModalOpen(false);
      setEditingId(null);
      setEmail("");
      setName("");
      await load();
    } catch {
      setError(editingId ? "Falha ao atualizar usuario" : "Falha ao criar usuario");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setLoading(true);
    setError("");
    try {
      await deleteUser(id);
      await load();
    } catch {
      setError("Falha ao remover usuario");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const modalTitle = useMemo(
    () => (editingId ? "Editar usuario" : "Novo usuario"),
    [editingId]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold">Agnetz Full-Stack</h1>
        <p className="mt-3 text-slate-300">
          Frontend conectado ao backend via /api/users
        </p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Usuarios</h2>
            <button
              className="rounded bg-emerald-500 px-4 py-2 font-semibold text-black"
              onClick={openCreate}
            >
              Novo
            </button>
          </div>
          {error ? <p className="mt-3 text-red-400">{error}</p> : null}
        </div>

        <div className="mt-6">
          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded border border-slate-800 bg-slate-900/60 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{u.email}</div>
                  {u.name ? <div className="text-slate-400">{u.name}</div> : null}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded border border-slate-600 px-3 py-1 text-slate-200"
                    onClick={() => startEdit(u)}
                    disabled={loading}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded border border-red-500 px-3 py-1 text-red-300"
                    onClick={() => onDelete(u.id)}
                    disabled={loading}
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{modalTitle}</h3>
              <button
                className="text-slate-400"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <div>
                <input
                  className="w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {fieldErrors.email ? (
                  <p className="mt-1 text-sm text-red-400">{fieldErrors.email}</p>
                ) : null}
              </div>
              <div>
                <input
                  className="w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                  placeholder="Nome (opcional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {fieldErrors.name ? (
                  <p className="mt-1 text-sm text-red-400">{fieldErrors.name}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="rounded bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-60"
                onClick={onSave}
                disabled={loading}
              >
                {loading ? "Salvando..." : "Salvar"}
              </button>
              <button
                className="rounded border border-slate-600 px-4 py-2 text-slate-200"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
