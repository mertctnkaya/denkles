import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Party, PartyMember } from '../types/database';

interface PartyState {
  parties: Party[];
  currentParty: Party | null;
  members: PartyMember[];
  events: any[];
  isLoading: boolean;
  error: string | null;

  fetchParties: () => Promise<void>;
  fetchPartyDetails: (partyId: string) => Promise<void>;
  fetchEvents: (partyId: string) => Promise<void>;
  createParty: (name: string) => Promise<string | null>;
  joinParty: (joinCode: string, referrerId?: string) => Promise<{ partyId: string; alreadyJoined: boolean } | null>;
  addShadowMember: (partyId: string, displayName: string) => Promise<{ success: boolean; errorMsg?: string }>;
  updateMemberRole: (partyId: string, memberId: string, newRole: 'owner' | 'admin' | 'member') => Promise<{ success: boolean; errorMsg?: string }>;
  removeMember: (partyId: string, memberId: string) => Promise<{ success: boolean; errorMsg?: string }>;
  updateParty: (partyId: string, updates: Partial<Party>, actorId?: string) => Promise<{ success: boolean; errorMsg?: string }>;
  deleteParty: (partyId: string) => Promise<{ success: boolean; errorMsg?: string }>;
  leaveParty: (partyId: string, memberId: string) => Promise<{ success: boolean; errorMsg?: string }>;
}

const generateJoinCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const usePartyStore = create<PartyState>((set, get) => ({
  parties: [],
  currentParty: null,
  members: [],
  events: [],
  isLoading: false,
  error: null,

  fetchParties: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Giriş yapmanız gerekiyor.");

      const { data: myMemberships, error: memberErr } = await supabase
        .from('party_members')
        .select('party_id')
        .eq('profile_id', user.id);

      if (memberErr) throw memberErr;

      if (!myMemberships || myMemberships.length === 0) {
        set({ parties: [], isLoading: false });
        return;
      }

      const partyIds = myMemberships.map(m => m.party_id);
      const { data, error } = await supabase
        .from('parties')
        .select('*, party_members(count)')
        .in('id', partyIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedParties = data.map((p: any) => ({
        ...p,
        member_count: p.party_members?.[0]?.count || 1
      }));

      set({ parties: mappedParties, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  fetchPartyDetails: async (partyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: partyData, error: partyError } = await supabase
        .from('parties')
        .select('*')
        .eq('id', partyId)
        .single();
      if (partyError) throw partyError;

      const { data: membersData, error: membersError } = await supabase
        .from('party_members')
        .select('*')
        .eq('party_id', partyId)
        .order('joined_at', { ascending: true });
      if (membersError) throw membersError;

      set({ currentParty: partyData, members: membersData || [], isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  fetchEvents: async (partyId: string) => {
    try {
      const { data, error } = await supabase
        .from('party_events')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        set({ events: data });
      }
    } catch (err) {
      console.error("fetchEvents error", err);
    }
  },

  createParty: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Giriş yapmanız gerekiyor.");

      const joinCode = generateJoinCode();
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .insert([{ name, join_code: joinCode, created_by: user.id }])
        .select()
        .single();
      if (partyError) throw partyError;

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

      const { error: memberError } = await supabase
        .from('party_members')
        .insert([{
          party_id: party.id,
          profile_id: user.id,
          display_name: profile?.full_name || 'Kurucu',
          role: 'owner'
        }]);
      if (memberError) throw memberError;

      await supabase.from('party_events').insert([{
        party_id: party.id,
        actor_id: null,
        event_type: 'party_created',
        description: `Grup oluşturuldu.`
      }]);

      await get().fetchParties();
      return party.id;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  joinParty: async (joinCode: string, referrerId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Giriş yapmanız gerekiyor.");

      const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('id')
        .eq('join_code', joinCode.toUpperCase())
        .single();

      if (partyError || !party) throw new Error("Grup bulunamadı. Kodu kontrol edin.");

      const { data: existingMember } = await supabase
        .from('party_members')
        .select('id')
        .eq('party_id', party.id)
        .eq('profile_id', user.id)
        .single();

      if (existingMember) {
        set({ isLoading: false });
        return { partyId: party.id, alreadyJoined: true };
      }

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

      const { error: joinError } = await supabase
        .from('party_members')
        .insert([{
          party_id: party.id,
          profile_id: user.id,
          display_name: profile?.full_name || 'Yeni Üye',
          role: 'member',
          added_by: referrerId || null
        }]);

      if (joinError) throw joinError;

      const { data: newMember } = await supabase
        .from('party_members')
        .select('id')
        .eq('party_id', party.id)
        .eq('profile_id', user.id)
        .single();

      if (newMember) {
        await supabase.from('party_events').insert([{
          party_id: party.id,
          actor_id: newMember.id,
          event_type: 'member_joined',
          description: `Gruba katıldı.`
        }]);
      }

      await get().fetchParties();
      return { partyId: party.id, alreadyJoined: false };
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  addShadowMember: async (partyId: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı");

      const { data: existing } = await supabase
        .from('party_members')
        .select('id')
        .eq('party_id', partyId)
        .eq('display_name', displayName)
        .single();

      if (existing) throw new Error("Bu isimde bir üye zaten var");

      const { error } = await supabase
        .from('party_members')
        .insert([{
          party_id: partyId,
          profile_id: null,
          display_name: displayName,
          role: 'member',
          added_by: user.id
        }]);
      if (error) throw error;

      const { data: currMember } = await supabase.from('party_members').select('id').eq('party_id', partyId).eq('profile_id', user.id).single();

      if (currMember) {
        await supabase.from('party_events').insert([{
          party_id: partyId,
          actor_id: currMember.id,
          event_type: 'member_added',
          description: `"${displayName}" adlı misafir üyeyi ekledi.`,
          metadata: { added_name: displayName }
        }]);
      }

      await get().fetchPartyDetails(partyId);
      await get().fetchEvents(partyId);
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, errorMsg: err.message };
    }
  },

  updateMemberRole: async (partyId: string, memberId: string, newRole: 'owner' | 'admin' | 'member') => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('party_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('party_id', partyId);
      if (error) throw error;
      await get().fetchPartyDetails(partyId);
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, errorMsg: err.message };
    }
  },

  removeMember: async (partyId: string, memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Önce üyenin aktif harcamaları var mı kontrol et
      const { data: memberShares, error: msError } = await supabase
        .from('share_participants')
        .select(`shares!inner ( id, split_mode, total_amount, status )`)
        .eq('party_member_id', memberId)
        .eq('shares.party_id', partyId)
        .neq('shares.status', 'cancelled');

      if (msError) throw msError;

      const nonEqualShares = (memberShares || []).filter((m: any) => m.shares.split_mode !== 'equal');
      if (nonEqualShares.length > 0) {
        throw new Error('Bu üye yüzde/sabit/pay bölüşümlü bir harcamaya dahil. Önce harcamayı silin veya düzenleyin.');
      }

      // 2. Üyeyi veritabanından sil
      const { data: targetMember } = await supabase.from('party_members').select('display_name').eq('id', memberId).single();

      const { error } = await supabase
        .from('party_members')
        .delete()
        .eq('party_id', partyId)
        .eq('id', memberId);
      if (error) throw error;

      // Log event
      const { data: { user } } = await supabase.auth.getUser();
      if (user && targetMember) {
        const { data: currMember } = await supabase.from('party_members').select('id').eq('party_id', partyId).eq('profile_id', user.id).single();
        if (currMember) {
          await supabase.from('party_events').insert([{
            party_id: partyId,
            actor_id: currMember.id,
            event_type: 'member_removed',
            description: `"${targetMember.display_name}" adlı kişiyi çıkardı.`,
            metadata: { removed_name: targetMember.display_name }
          }]);
        }
      }

      await get().fetchPartyDetails(partyId);
      await get().fetchEvents(partyId);
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, errorMsg: err.message };
    }
  },

  updateParty: async (partyId: string, updates: Partial<Party>, actorId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('parties')
        .update(updates)
        .eq('id', partyId);
      if (error) throw error;

      if (updates.is_archived !== undefined && actorId) {
        await supabase.from('party_events').insert([{
          party_id: partyId,
          actor_id: actorId,
          event_type: updates.is_archived ? 'party_archived' : 'party_unarchived',
          description: updates.is_archived ? 'Grup arşivlendi' : 'Grup arşivden çıkarıldı'
        }]);
      }

      await get().fetchPartyDetails(partyId);
      await get().fetchEvents(partyId);
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, errorMsg: err.message };
    }
  },

  deleteParty: async (partyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', partyId);
      if (error) throw error;

      set({ currentParty: null, members: [], events: [] });
      await get().fetchParties();
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, errorMsg: err.message };
    }
  },

  leaveParty: async (partyId: string, memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: leavingMember } = await supabase.from('party_members').select('display_name, profile_id').eq('id', memberId).single();
      if (leavingMember) {
        await supabase.from('party_events').insert([{
          party_id: partyId,
          actor_id: null,
          event_type: 'member_left',
          description: `"${leavingMember.display_name}" gruptan ayrıldı.`,
          metadata: { profile_id: leavingMember.profile_id }
        }]);
      }

      const { error } = await supabase
        .from('party_members')
        .delete()
        .eq('party_id', partyId)
        .eq('id', memberId);

      if (error) throw error;

      await get().fetchParties();
      set({ currentParty: null, members: [], events: [] });
      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, errorMsg: err.message };
    }
  }
}));