'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // adjust if your import path differs — check any existing admin page for the exact path

type Profile = {
  id: string;
  role: 'client' | 'expert' | 'admin'; // <-- swap these if your enum labels differ
  full_name: string | null;
  email: string | null;
  phone: string | null;
  expertise: string[] | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'expert'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('id, role, full_name, email, phone, expertise, created_at')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Failed to load profiles:', error.message);
      } else {
        setProfiles(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, [roleFilter]);

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Users</h1>

      <div className="flex items-center gap-3 mb-4">
        {(['all', 'client', 'expert'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              roleFilter === r
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            {r === 'all' ? 'All' : r === 'client' ? 'Clients' : 'Experts'}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto border border-gray-300 rounded-md px-3 py-1.5 text-sm w-72"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Expertise</th>
                <th className="px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{p.full_name ?? '—'}</td>
                  <td className="px-4 py-2 capitalize">{p.role}</td>
                  <td className="px-4 py-2">{p.email ?? '—'}</td>
                  <td className="px-4 py-2">{p.phone ?? '—'}</td>
                  <td className="px-4 py-2">{p.expertise?.join(', ') ?? '—'}</td>
                  <td className="px-4 py-2">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}