export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  karma_score: number;
  created_at: string;
};

export type Party = {
  id: string;
  name: string;
  join_code: string;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  member_count?: number;
};

export type PartyMember = {
  id: string;
  party_id: string;
  profile_id: string | null; // null ise "Shadow Profile"
  display_name: string;
  role: 'owner' | 'admin' | 'member';
  added_by: string | null;
  joined_at: string;
};

export type SplitMode = 'equal' | 'percentage' | 'exact' | 'shares';

export type ShareCategory = 'general' | 'fuel' | 'shopping' | 'restaurant' | 'accommodation' | 'transport' | 'entertainment' | 'health';

export type Share = {
  id: string;
  party_id: string;
  created_by: string;
  title: string;
  total_amount: number;
  category: ShareCategory;
  split_mode: SplitMode;
  status: 'active' | 'settled' | 'cancelled';
  metadata: Record<string, any> | null;
  created_at: string;
};

export type ShareParticipant = {
  id: string;
  share_id: string;
  party_member_id: string;
  paid_amount: number;
  owed_amount: number;
  created_at: string;
};

export type Settlement = {
  id: string;
  party_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  status: 'pending' | 'completed';
  created_at: string;
};

export type Vehicle = {
  id: string;
  owner_id: string;
  name: string;
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'lpg';
  consumption: number;
  created_at: string;
};
