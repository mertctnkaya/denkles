import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { usePartyStore } from './partyStore';
import type { Share, ShareParticipant, Settlement } from '../types/database';
import { calculateOwedAmounts } from '../core/splittingEngine';
import type { SplitInput } from '../core/splittingEngine';
import { simplifyDebts } from '../core/debtSimplificationEngine';
import type { RawDebt, SimplifiedDebt } from '../core/debtSimplificationEngine';

interface ShareState {
  shares: Share[];
  participants: ShareParticipant[];
  settlements: Settlement[];
  computedDebts: SimplifiedDebt[]; // Motorun ürettiği net borçlar grafiği
  isLoading: boolean;
  error: string | null;

  fetchShares: (partyId: string) => Promise<void>;
  addShare: (
    partyId: string,
    createdByMemberId: string,
    title: string,
    totalAmount: number,
    splitInput: SplitInput, // Hangi mod ve değerler
    paidByMemberId: string, // Kasadan parayı kim çıkarttı?
    category?: Share['category'],
    metadata?: Record<string, any>
  ) => Promise<boolean>;
  settleDebt: (partyId: string, payerMemberId: string, payeeMemberId: string, amount: number) => Promise<boolean>;
  deleteShare: (shareId: string, partyId: string) => Promise<boolean>;
}

export const useShareStore = create<ShareState>((set, get) => ({
  shares: [],
  participants: [],
  settlements: [],
  computedDebts: [],
  isLoading: false,
  error: null,

  fetchShares: async (partyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [sharesRes, participantsRes, settlementsRes] = await Promise.all([
        supabase.from('shares').select('*').eq('party_id', partyId).neq('status', 'cancelled').order('created_at', { ascending: false }),
        supabase.from('shares').select('id').eq('party_id', partyId).neq('status', 'cancelled'),
        supabase.from('settlements').select('*').eq('party_id', partyId).order('created_at', { ascending: false })
      ]);

      if (sharesRes.error) throw sharesRes.error;
      if (settlementsRes.error) throw settlementsRes.error;

      const shareIds = (participantsRes.data || []).map(s => s.id);

      let allParticipants: ShareParticipant[] = [];
      if (shareIds.length > 0) {
        const { data: parts, error: partsErr } = await supabase
          .from('share_participants')
          .select('*')
          .in('share_id', shareIds);
        if (partsErr) throw partsErr;
        allParticipants = parts as ShareParticipant[];
      }

      const shares = sharesRes.data as Share[];
      const settlements = settlementsRes.data as Settlement[];

      // MOTORLARI ÇALIŞTIR VE NET BORÇLARI HESAPLA
      const rawDebts: RawDebt[] = [];

      // 1. Harcamalardan doğan borçlar (Kasadan çıkan para vs Kimin ne kadar borcu olduğu)
      allParticipants.forEach(p => {
        // Eğer kişinin borcu (owed) ödediğinden (paid) büyükse, sisteme net borçludur.
        // Ancak debtSimplificationEngine'e RawDebt olarak vermek için şunu yapıyoruz:
        // Herkesin yediği tutarı (owed_amount), kasadan parayı çıkaran (paid_amount > 0 olan) kişiye olan borcu olarak yazarız.
        // Örneğin: Mert 300 ödedi (paid=300). Ahmet (owed=100), Mert (owed=100), Ayşe (owed=100).
        // Bu durumda: Ahmet -> Mert'e 100 borçlu, Ayşe -> Mert'e 100 borçlu. Mert -> Mert'e 100 (kendi kendine silinir).

        // Bu paylaşımda parayı ödeyen(ler)i bulalım:
        const payersInThisShare = allParticipants.filter(x => x.share_id === p.share_id && x.paid_amount > 0);

        // Genelde tek ödeyen vardır, çoklu ödeyen varsa oransal dağılır ama MVP'de tek ödeyen kabul ediyoruz.
        // Basitlik adına, parayı ödeyen ilk kişiyi payee (alacaklı) sayıyoruz.
        const primaryPayer = payersInThisShare[0];

        if (primaryPayer && p.owed_amount > 0) {
          rawDebts.push({
            payer: primaryPayer.party_member_id, // Alacaklı olan (kasadan parayı çıkaran)
            payee: p.party_member_id, // Başkası adına harcanan (borçlu olan)
            amount: p.owed_amount
          });
        }
      });

      // 2. Önceden yapılmış ödemeleri (settlements) borçtan düşmek için RawDebt'e ters ekle
      settlements.forEach(s => {
        if (s.status === 'completed') {
          rawDebts.push({
            payer: s.payer_id, // Borcunu ödeyen kişi kasadan para çıkarmış gibi olur (+)
            payee: s.payee_id, // Parayı tahsil eden kişinin alacağı düşer (-)
            amount: s.amount
          });
        }
      });

      // 3. Motoru çalıştır (1 TL altı kusuratları boşver)
      const computedDebts = simplifyDebts(rawDebts, { forgiveThresholdAmount: 1 });

      set({
        shares,
        participants: allParticipants,
        settlements,
        computedDebts
      });

    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  addShare: async (partyId, createdByMemberId, title, totalAmount, splitInput, paidByMemberId, category = 'general', metadata = undefined) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Motor üzerinden kimin ne kadar borcu (owed) olduğunu hatasız hesapla
      const owedAmounts = calculateOwedAmounts(splitInput);

      // 2. Shares tablosuna kaydet
      const { data: share, error: shareError } = await supabase
        .from('shares')
        .insert([{
          party_id: partyId,
          created_by: createdByMemberId,
          title,
          total_amount: totalAmount,
          category,
          split_mode: splitInput.splitMode,
          status: 'active',
          metadata
        }])
        .select()
        .single();

      if (shareError) throw shareError;

      // 3. Participants tablosuna ekle
      const participantsData = splitInput.participants.map(memberId => ({
        share_id: share.id,
        party_member_id: memberId,
        paid_amount: memberId === paidByMemberId ? totalAmount : 0, // Sadece kasadan çıkartan paid_amount alır
        owed_amount: owedAmounts[memberId] || 0
      }));

      const { error: partError } = await supabase
        .from('share_participants')
        .insert(participantsData);

      if (partError) throw partError;

      // 4. Log event
      await supabase.from('party_events').insert([{
        party_id: partyId,
        actor_id: createdByMemberId,
        event_type: 'share_created',
        description: `"${title}" harcamas�n� ekledi (${totalAmount.toFixed(2)} TL).`,
        metadata: { share_id: share.id, amount: totalAmount, share_metadata: metadata }
      }]);

      // Verileri yenile
      await get().fetchShares(partyId);
      usePartyStore.getState().fetchEvents(partyId);
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  settleDebt: async (partyId, payerMemberId, payeeMemberId, amount) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('settlements')
        .insert([{
          party_id: partyId,
          payer_id: payerMemberId,
          payee_id: payeeMemberId,
          amount,
          status: 'completed'
        }]);

      if (error) throw error;

      // Log event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase.from('party_members').select('id, display_name').eq('party_id', partyId).eq('profile_id', user.id).single();
        if (member) {
          const isPayer = member.id === payerMemberId;
          const otherMemberId = isPayer ? payeeMemberId : payerMemberId;
          const { data: otherMember } = await supabase.from('party_members').select('display_name').eq('id', otherMemberId).single();
          const otherName = otherMember?.display_name || 'Biri';

          await supabase.from('party_events').insert([{
            party_id: partyId,
            actor_id: member.id,
            event_type: 'debt_settled',
            description: isPayer ? `"${otherName}" adlı kişiye ${amount} TL ödediğini bildirdi.` : `"${otherName}" adlı kişiden ${amount} TL tahsil ettiğini bildirdi.`,
            metadata: { amount, payer: payerMemberId, payee: payeeMemberId }
          }]);
        }
      }

      await get().fetchShares(partyId);
      usePartyStore.getState().fetchEvents(partyId);
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteShare: async (shareId, partyId) => {
    set({ isLoading: true, error: null });
    try {
      // Supabase'de gerçek bir delete yapmak RLS kurallarına takılıyor olabilir (hata vermeden 0 satır silebilir).
      // En güvenli yöntem "soft delete" yani durumunu iptal edildi (cancelled) yapmaktır.
      const { data, error: shareError } = await supabase
        .from('shares')
        .update({ status: 'cancelled' })
        .eq('id', shareId)
        .select();

      if (shareError) throw shareError;
      if (!data || data.length === 0) {
        throw new Error('Harcama silinemedi. Yetkiniz yok veya RLS izin vermiyor.');
      }

      // Log event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase.from('party_members').select('id').eq('party_id', partyId).eq('profile_id', user.id).single();
        if (member) {
          await supabase.from('party_events').insert([{
            party_id: partyId,
            actor_id: member.id,
            event_type: 'share_deleted',
            description: `"${data[0].title}" harcamas�n� sildi.`,
            metadata: { share_id: shareId }
          }]);
        }
      }

      await get().fetchShares(partyId);
      usePartyStore.getState().fetchEvents(partyId);
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  }
}));
