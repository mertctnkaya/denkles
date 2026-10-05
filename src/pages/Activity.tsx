import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { Icon } from '../components/shared/Icon';

interface GlobalEvent {
  id: string;
  party_id: string;
  actor_id: string;
  event_type: string;
  description: string;
  metadata: any;
  created_at: string;
  party_name?: string;
  actor_name?: string;
  actor_profile_id?: string;
}

const getDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Bugün';
  if (date.toDateString() === yesterday.toDateString()) return 'Dün';

  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const Activity = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [rawEvents, setRawEvents] = useState<GlobalEvent[]>([]);
  const [parties, setParties] = useState<{ id: string, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedPartyId, setSelectedPartyId] = useState<string | 'all'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'shares' | 'settlements' | 'system'>('all');

  useEffect(() => {
    const fetchGlobalActivity = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const { data: myMemberships } = await supabase.from('party_members').select('party_id').eq('profile_id', user.id);

        if (!myMemberships || myMemberships.length === 0) {
          setRawEvents([]);
          setIsLoading(false);
          return;
        }

        const partyIds = myMemberships.map(m => m.party_id);

        const [eventsRes, partiesRes] = await Promise.all([
          supabase.from('party_events').select('*').in('party_id', partyIds).order('created_at', { ascending: false }).limit(200),
          supabase.from('parties').select('id, name').in('id', partyIds)
        ]);

        if (eventsRes.error) throw eventsRes.error;

        const fetchedParties = partiesRes.data || [];
        setParties(fetchedParties);

        if (!eventsRes.data || eventsRes.data.length === 0) {
          setRawEvents([]);
          return;
        }

        const actorIds = [...new Set(eventsRes.data.filter(e => e.actor_id).map(e => e.actor_id))];
        const { data: actors } = await supabase.from('party_members').select('id, display_name, profile_id').in('id', actorIds);

        const formattedEvents = eventsRes.data.map(e => {
          const party = fetchedParties.find(p => p.id === e.party_id);
          const actor = actors?.find(a => a.id === e.actor_id);
          return {
            ...e,
            party_name: party?.name || 'Grup',
            actor_name: actor?.display_name || '',
            actor_profile_id: actor?.profile_id || ''
          };
        });

        setRawEvents(formattedEvents);
      } catch (err) {
        console.error("fetchGlobalActivity error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalActivity();
  }, [user]);

  const filteredEvents = useMemo(() => {
    return rawEvents.filter(e => {
      if (selectedPartyId !== 'all' && e.party_id !== selectedPartyId) return false;
      if (selectedType === 'shares' && (!e.event_type.includes('share') || e.event_type.includes('deleted'))) return false;
      if (selectedType === 'settlements' && !e.event_type.includes('settle')) return false;
      if (selectedType === 'system' && (e.event_type.includes('share_created') || e.event_type.includes('settle'))) return false;
      return true;
    });
  }, [rawEvents, selectedPartyId, selectedType]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, GlobalEvent[]> = {};
    filteredEvents.forEach(e => {
      const label = getDateLabel(e.created_at);
      if (!groups[label]) groups[label] = [];
      groups[label].push(e);
    });
    return groups;
  }, [filteredEvents]);

  const renderEventCard = (event: GlobalEvent) => {
    const isMe = event.actor_profile_id === user?.id;
    const actorName = isMe ? 'Sen' : event.actor_name || 'Biri';
    const timeOnly = new Date(event.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // 1. SHARE CREATED
    if (event.event_type === 'share_created') {
      const match = event.description.match(/"(.*?)"/);
      const title = match ? match[1] : 'Harcama';
      const amount = event.metadata?.amount || 0;
      const smd = event.metadata?.share_metadata || {};
      const hasMetadata = Object.keys(smd).length > 0;

      return (
        <div key={event.id} onClick={() => navigate(`/party/${event.party_id}`)} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary/30 transition-all rounded-3xl p-4 cursor-pointer group">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon name="receipt" size={14} />
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{event.party_name}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{timeOnly}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-snug">
            <strong className="text-slate-900 dark:text-white mr-1">{actorName}</strong>
            yeni bir harcama ekledi: <span className="font-semibold text-slate-800 dark:text-slate-200">"{title}"</span>
          </p>

          {hasMetadata && (
            <div className="mt-3 flex gap-2 flex-wrap text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {smd.venue_name && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">📍 {smd.venue_name}</span>}
              {smd.store_name && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">🛒 {smd.store_name}</span>}
              {smd.from && smd.to && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">🚗 {smd.from} - {smd.to}</span>}
              {smd.nights && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">🌙 {smd.nights} Gece</span>}
            </div>
          )}

          <div className="mt-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-3 flex justify-between items-center group-hover:bg-primary/5 transition-colors">
            <span className="text-slate-500 text-xs font-semibold">Toplam Tutar</span>
            <span className="font-bold text-lg text-slate-900 dark:text-white">{amount.toFixed(2)} TL</span>
          </div>
        </div>
      );
    }

    // 2. DEBT SETTLED
    if (event.event_type === 'debt_settled') {
      const amount = event.metadata?.amount || 0;
      return (
        <div key={event.id} onClick={() => navigate(`/party/${event.party_id}`)} className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all rounded-3xl p-4 cursor-pointer group">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Icon name="success" size={14} />
              </span>
              <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">{event.party_name}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{timeOnly}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-snug mb-3">
            <strong className="text-slate-900 dark:text-white mr-1">{actorName}</strong>
            bir ödeşme gerçekleştirdi.
          </p>
          <div className="flex items-center justify-between px-2 py-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
                <Icon name="forward" size={12} className="text-emerald-700 dark:text-emerald-300" />
              </div>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{amount.toFixed(2)} TL</span>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 uppercase">Ödeşme</span>
          </div>
        </div>
      );
    }

    // 3. SYSTEM / OTHER EVENTS (Fallback)
    let icon = 'info';
    let iconColor = 'text-slate-500 bg-slate-100 dark:bg-slate-800';
    if (event.event_type.includes('added') || event.event_type.includes('joined')) { icon = 'plus'; iconColor = 'text-blue-500 bg-blue-50 dark:bg-blue-900/30'; }
    if (event.event_type.includes('removed') || event.event_type.includes('left') || event.event_type.includes('deleted')) { icon = 'close'; iconColor = 'text-rose-500 bg-rose-50 dark:bg-rose-900/30'; }
    if (event.event_type.includes('role')) { icon = 'shield'; iconColor = 'text-orange-500 bg-orange-50 dark:bg-orange-900/30'; }

    return (
      <div key={event.id} onClick={() => navigate(`/party/${event.party_id}`)} className="bg-transparent border border-slate-200/60 dark:border-slate-800 rounded-3xl p-3 flex gap-3 cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition-colors">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconColor}`}>
          <Icon name={icon as any} size={16} />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{event.party_name}</span>
            <span className="text-[10px] text-slate-400">{timeOnly}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug pr-2 truncate">
            <strong className="text-slate-900 dark:text-white mr-1">{actorName}</strong>
            {event.description.replace(/"([^"]*)"/g, '$1').replace(event.actor_name || '', '')}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 pb-24 md:pb-6 relative min-h-screen md:min-h-[85vh] md:rounded-3xl md:border md:border-slate-200/50 dark:md:border-slate-800 md:shadow-lg overflow-hidden">
      {/* HEADER */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800 pt-10 md:pt-6 pb-4 px-4 md:px-6 sticky top-0 z-40">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Hareketler</h1>
        <p className="text-sm text-slate-500 mb-5">Tüm gruplarındaki son aktiviteler</p>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Party Filter - Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => setSelectedPartyId('all')}
              className={`cursor-pointer shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${selectedPartyId === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              Tümü
            </button>
            {parties.map(party => (
              <button
                key={party.id}
                onClick={() => setSelectedPartyId(party.id)}
                className={`cursor-pointer shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedPartyId === party.id ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary/50'}`}
              >
                {party.name}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'shares', label: 'Harcamalar' },
              { id: 'settlements', label: 'Ödeşmeler' },
              { id: 'system', label: 'Sistem' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id as any)}
                className={`cursor-pointer flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedType === type.id ? 'bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 md:px-6 overflow-y-auto pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner">
              📭
            </div>
            <h3 className="text-slate-800 dark:text-slate-100 font-bold text-lg mb-2">Hareket Bulunamadı</h3>
            <p className="text-slate-500 text-sm max-w-62.5">Seçili filtrelere uygun herhangi bir aktivite yok.</p>
          </div>
        ) : (
          <div className="pb-10">
            {Object.entries(groupedEvents).map(([date, events]) => (
              <div key={date} className="mb-8 last:mb-0">
                <h3 className="text-[11px] font-black tracking-widest text-slate-400 uppercase mb-4 pl-2 sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm py-2 z-10">
                  {date}
                </h3>
                <div className="space-y-3">
                  {events.map(event => renderEventCard(event))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
