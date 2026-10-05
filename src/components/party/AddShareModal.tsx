import { useState, useMemo, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { Icon } from '../shared/Icon';
import type { IconName } from '../shared/Icon';
import type { PartyMember, Share, ShareCategory } from '../../types/database';

interface AddShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: PartyMember[];
  currentUserId: string;
  initialShare?: Share | null;
  initialParticipants?: any[];
  onAdd: (
    title: string,
    amount: number,
    paidByMemberId: string,
    category: Share['category'],
    participants: string[],
    splitMode: 'equal' | 'percentage' | 'exact' | 'shares',
    customValues?: Record<string, number>,
    metadata?: Record<string, any>
  ) => Promise<boolean>;
}

const CATEGORIES: { id: ShareCategory; label: string; icon: IconName; color: string }[] = [
  { id: 'general', label: 'Genel', icon: 'receipt', color: 'bg-slate-100 text-slate-600' },
  { id: 'fuel', label: 'Yakıt', icon: 'car', color: 'bg-orange-100 text-orange-600' },
  { id: 'restaurant', label: 'Yemek', icon: 'star', color: 'bg-red-100 text-red-600' },
  { id: 'shopping', label: 'Market', icon: 'card', color: 'bg-blue-100 text-blue-600' },
  { id: 'accommodation', label: 'Konaklama', icon: 'building', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'transport', label: 'Ulaşım', icon: 'forward', color: 'bg-teal-100 text-teal-600' },
  { id: 'entertainment', label: 'Eğlence', icon: 'music', color: 'bg-fuchsia-100 text-fuchsia-600' },
  { id: 'health', label: 'Sağlık', icon: 'health', color: 'bg-rose-100 text-rose-600' },
];

export const AddShareModal = ({ isOpen, onClose, members, currentUserId, onAdd, initialShare, initialParticipants }: AddShareModalProps) => {
  const me = useMemo(() => members.find(m => m.profile_id === currentUserId), [members, currentUserId]);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ShareCategory>('general');
  const [splitMode, setSplitMode] = useState<'equal' | 'percentage' | 'exact' | 'shares'>('equal');
  const [customValues, setCustomValues] = useState<Record<string, number>>({});
  const [paidBy, setPaidBy] = useState<string>(me?.id || '');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(members.map(m => m.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  // When initialShare is provided, populate the form
  useMemo(() => {
    if (isOpen) {
      if (initialShare && initialParticipants) {
        setTitle(initialShare.title);
        setAmount(initialShare.total_amount.toString());
        setCategory(initialShare.category);
        setSplitMode(initialShare.split_mode as any);
        setMetadata(initialShare.metadata || {});

        const payer = initialParticipants.find(p => p.paid_amount > 0);
        setPaidBy(payer?.party_member_id || me?.id || '');

        const participantsList = initialParticipants.map(p => p.party_member_id);
        setSelectedParticipants(participantsList);

        if (initialShare.split_mode !== 'equal') {
          const cVals: Record<string, number> = {};
          initialParticipants.forEach(p => {
            if (initialShare.split_mode === 'exact') {
              cVals[p.party_member_id] = p.owed_amount;
            } else if (initialShare.split_mode === 'percentage') {
              cVals[p.party_member_id] = (p.owed_amount / initialShare.total_amount) * 100;
            } else if (initialShare.split_mode === 'shares') {
              cVals[p.party_member_id] = p.owed_amount;
            }
          });
          setCustomValues(cVals);
        } else {
          setCustomValues({});
        }
      } else {
        setTitle('');
        setAmount('');
        setCategory('general');
        setSplitMode('equal');
        setCustomValues({});
        setMetadata({});
        setPaidBy(me?.id || '');
        setSelectedParticipants(members.map(m => m.id));
      }
    }
  }, [isOpen, initialShare, initialParticipants, me?.id]);

  // Fuel auto-calculation effect
  useEffect(() => {
    if (category === 'fuel') {
      const liters = parseFloat(metadata.liters);
      const price = parseFloat(metadata.price_per_liter);
      if (!isNaN(liters) && !isNaN(price) && liters > 0 && price > 0) {
        setAmount((liters * price).toFixed(2));
      }
    }
  }, [category, metadata.liters, metadata.price_per_liter]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !amount || parseFloat(amount) <= 0 || !paidBy) return;
    if (selectedParticipants.length === 0) return;

    setIsSubmitting(true);
    // Clean metadata (remove empty strings or undefined)
    const cleanedMetadata: Record<string, any> = {};
    Object.entries(metadata).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) cleanedMetadata[k] = v;
    });

    const success = await onAdd(
      title.trim(),
      parseFloat(amount),
      paidBy,
      category,
      selectedParticipants,
      splitMode,
      customValues,
      Object.keys(cleanedMetadata).length > 0 ? cleanedMetadata : undefined
    );
    setIsSubmitting(false);

    if (success) {
      handleClose();
    }
  };

  const toggleParticipant = (memberId: string) => {
    if (selectedParticipants.includes(memberId)) {
      setSelectedParticipants(prev => prev.filter(id => id !== memberId));
    } else {
      setSelectedParticipants(prev => [...prev, memberId]);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const customSum = useMemo(() => {
    return selectedParticipants.reduce((sum, pid) => sum + (customValues[pid] || 0), 0);
  }, [customValues, selectedParticipants]);

  const isCustomValuesValid = useMemo(() => {
    if (splitMode === 'equal') return true;
    if (splitMode === 'percentage') return Math.abs(customSum - 100) < 0.01;
    if (splitMode === 'exact') return Math.abs(customSum - parsedAmount) < 0.01;
    if (splitMode === 'shares') return customSum > 0;
    return true;
  }, [splitMode, customSum, parsedAmount]);

  const isFormValid = title.trim() && parsedAmount > 0 && selectedParticipants.length > 0 && isCustomValuesValid;
  const isEditing = !!initialShare;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Harcamayı Düzenle" : "Yeni Harcama Ekle"}
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={handleClose}>İptal</Button>
          <Button
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
            onClick={handleSubmit}
            disabled={!isFormValid}
          >
            {isEditing ? "Güncelle" : "Ekle"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Başlık ve Tutar */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Ne İçin?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Market alışverişi"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
            />
          </div>
          <div className="w-1/3">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Tutar (₺)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-lg text-right"
            />
          </div>
        </div>

        {/* Kategori Seçimi */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">Kategori</label>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x -mx-4 px-4 md:mx-0 md:px-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`snap-start shrink-0 flex flex-col items-center justify-center p-3 w-20 rounded-2xl border-2 transition-all cursor-pointer ${category === cat.id
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                  : 'border-transparent bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${cat.color}`}>
                  <Icon name={cat.icon} size={16} />
                </div>
                <span className={`text-[10px] font-bold ${category === cat.id ? 'text-primary' : 'text-slate-500'}`}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dinamik Kategori Alanları (Opsiyonel) */}
        {category !== 'general' && (
          <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="info" size={14} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Opsiyonel Detaylar</span>
            </div>

            {category === 'fuel' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Litre</label>
                  <input type="number" placeholder="Örn: 25.5" value={metadata.liters || ''} onChange={e => setMetadata({ ...metadata, liters: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Birim Fiyat (₺)</label>
                  <input type="number" placeholder="Örn: 42.10" value={metadata.price_per_liter || ''} onChange={e => setMetadata({ ...metadata, price_per_liter: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                </div>
              </div>
            )}

            {category === 'restaurant' && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Mekan Adı</label>
                  <input type="text" placeholder="Örn: Balıkçı Hasan" value={metadata.venue_name || ''} onChange={e => setMetadata({ ...metadata, venue_name: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Bahşiş Tutarı (₺)</label>
                    <input type="number" placeholder="0.00" value={metadata.tip_amount || ''} onChange={e => setMetadata({ ...metadata, tip_amount: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                  <div className="flex-1 flex items-center gap-2 mt-5">
                    <input type="checkbox" id="tipInc" checked={metadata.tip_included_in_split || false} onChange={e => setMetadata({ ...metadata, tip_included_in_split: e.target.checked })} className="rounded text-primary" />
                    <label htmlFor="tipInc" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">Bölüşüme dahil mi?</label>
                  </div>
                </div>
              </>
            )}

            {category === 'accommodation' && (
              <div className="flex gap-3">
                <div className="flex-2">
                  <label className="block text-xs text-slate-500 mb-1">Tesis / Otel Adı</label>
                  <input type="text" placeholder="Örn: Hilton" value={metadata.venue_name || ''} onChange={e => setMetadata({ ...metadata, venue_name: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Gece Sayısı</label>
                  <input type="number" placeholder="Örn: 3" value={metadata.nights || ''} onChange={e => setMetadata({ ...metadata, nights: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                </div>
              </div>
            )}

            {category === 'transport' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Nereden</label>
                  <input type="text" placeholder="Örn: Havalimanı" value={metadata.from || ''} onChange={e => setMetadata({ ...metadata, from: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Nereye</label>
                  <input type="text" placeholder="Örn: Otel" value={metadata.to || ''} onChange={e => setMetadata({ ...metadata, to: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                </div>
              </div>
            )}

            {category === 'shopping' && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Market / Mağaza Adı</label>
                <input type="text" placeholder="Örn: Migros" value={metadata.store_name || ''} onChange={e => setMetadata({ ...metadata, store_name: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
            )}

            {category === 'entertainment' && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Etkinlik / Mekan Adı</label>
                <input type="text" placeholder="Örn: Açık Hava Konseri" value={metadata.event_name || ''} onChange={e => setMetadata({ ...metadata, event_name: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
            )}

            {category === 'health' && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hastane / Eczane Adı</label>
                <input type="text" placeholder="Örn: Nöbetçi Eczane" value={metadata.store_name || ''} onChange={e => setMetadata({ ...metadata, store_name: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
            )}
          </div>
        )}

        {/* Bölüşüm Türü (Split Mode) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">Bölüşüm Türü (Nasıl Bölüşülecek?)</label>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['equal', 'percentage', 'shares', 'exact'] as const).map(mode => {
              const labels = {
                equal: 'Eşit',
                percentage: 'Yüzde',
                shares: 'Pay',
                exact: 'Tam Tutar'
              };
              const isSelected = splitMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setSplitMode(mode)}
                  className={`cursor-pointer flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${isSelected ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Kim Ödedi? */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">Parayı Kim Verdi? <span className="font-normal text-slate-400">(Kasadan ödeyen)</span></label>
          <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar snap-x">
            {members.map(m => {
              const isSelected = paidBy === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setPaidBy(m.id)}
                  className={`cursor-pointer snap-start shrink-0 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-sm font-semibold transition-all duration-300 ${isSelected
                    ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 shadow-md shadow-slate-900/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isSelected ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>
                  {m.profile_id === currentUserId ? 'Sen' : m.display_name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Kimler Arasında Bölüşülecek? */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-end mb-3">
            <label className="block text-xs font-semibold text-slate-500">
              Bu Harcamaya Kimler Ortak? <span className="font-normal">
                ({splitMode === 'equal' ? 'Eşit bölüşülecek' : splitMode === 'percentage' ? 'Yüzde ile' : splitMode === 'shares' ? 'Pay ile' : 'Tam tutar ile'})
              </span>
            </label>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{selectedParticipants.length} kişi seçili</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map(m => {
              const isSelected = selectedParticipants.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleParticipant(m.id)}
                  className={`cursor-pointer flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-sm font-medium transition-all ${isSelected
                    ? 'bg-primary-light/50 dark:bg-primary-dark/20 border-primary/30 text-primary-dark dark:text-primary-light'
                    : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300'
                    }`}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                    {isSelected && <Icon name="success" size={10} strokeWidth={4} />}
                  </div>
                  {m.profile_id === currentUserId ? 'Sen' : m.display_name}
                </button>
              );
            })}
          </div>

          {/* Dinamik Bölüşüm Girdileri */}
          {splitMode !== 'equal' && selectedParticipants.length > 0 && (
            <div className="mt-4 space-y-2 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    {splitMode === 'percentage' ? 'Yüzdeleri Girin' : splitMode === 'exact' ? 'Tutarları Girin' : 'Kişi Başı Pay Adedi'}
                  </p>
                  {splitMode === 'shares' && (
                    <span className="text-[9px] text-slate-400 mt-0.5 normal-case tracking-normal">
                      Sınırsız pay girebilirsiniz, motor orantılı olarak böler (Örn: 2 ve 1 girilirse 2/3 ve 1/3 olarak hesaplanır).
                    </span>
                  )}
                </div>
                {splitMode === 'percentage' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCustomValuesValid ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    Toplam: %{customSum} / %100
                  </span>
                )}
                {splitMode === 'exact' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCustomValuesValid ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    Toplam: ₺{customSum} / ₺{parsedAmount}
                  </span>
                )}
                {splitMode === 'shares' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCustomValuesValid ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger'}`}>
                    Toplam Pay: {customSum}
                  </span>
                )}
              </div>
              {selectedParticipants.map(pid => {
                const member = members.find(m => m.id === pid);
                if (!member) return null;
                return (
                  <div key={pid} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">
                      {member.profile_id === currentUserId ? 'Sen' : member.display_name}
                    </span>
                    <div className="flex items-center gap-2 w-32">
                      <input
                        type="number"
                        min="0"
                        value={customValues[pid] || ''}
                        onChange={(e) => setCustomValues(prev => ({ ...prev, [pid]: parseFloat(e.target.value) || 0 }))}
                        className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-right font-medium focus:outline-none focus:border-primary text-slate-900 dark:text-white"
                        placeholder="0"
                      />
                      <span className="text-xs text-slate-500 font-bold w-6">
                        {splitMode === 'percentage' ? '%' : splitMode === 'exact' ? '₺' : 'pay'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};

