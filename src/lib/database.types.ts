export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13.0.4';
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          household_id: string;
          user_id: string;
          role: 'owner' | 'member';
          created_at: string;
        };
        Insert: {
          household_id: string;
          user_id: string;
          role?: 'owner' | 'member';
          created_at?: string;
        };
        Update: {
          household_id?: string;
          user_id?: string;
          role?: 'owner' | 'member';
          created_at?: string;
        };
        Relationships: [];
      };
      lists: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          archived_at: string | null;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          archived_at?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          archived_at?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      list_members: {
        Row: {
          list_id: string;
          user_id: string;
          role: 'owner' | 'member';
          joined_at: string;
        };
        Insert: {
          list_id: string;
          user_id: string;
          role?: 'owner' | 'member';
          joined_at?: string;
        };
        Update: {
          list_id?: string;
          user_id?: string;
          role?: 'owner' | 'member';
          joined_at?: string;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          list_id: string;
          name: string;
          display_name: string;
          normalized_name: string;
          quantity: string | null;
          note: string | null;
          is_checked: boolean;
          checked_at: string | null;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          position: number;
        };
        Insert: {
          id: string;
          list_id: string;
          name: string;
          display_name: string;
          normalized_name: string;
          quantity?: string | null;
          note?: string | null;
          is_checked?: boolean;
          checked_at?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          position?: number;
        };
        Update: {
          id?: string;
          list_id?: string;
          name?: string;
          display_name?: string;
          normalized_name?: string;
          quantity?: string | null;
          note?: string | null;
          is_checked?: boolean;
          checked_at?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          position?: number;
        };
        Relationships: [];
      };
      item_catalog: {
        Row: {
          id: string;
          household_id: string;
          normalized_name: string;
          display_name: string;
          use_count: number;
          last_used_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          normalized_name: string;
          display_name: string;
          use_count?: number;
          last_used_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          normalized_name?: string;
          display_name?: string;
          use_count?: number;
          last_used_at?: string;
        };
        Relationships: [];
      };
      list_invites: {
        Row: {
          id: string;
          list_id: string;
          token: string;
          created_by: string | null;
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          list_id: string;
          token?: string;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          list_id?: string;
          token?: string;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_list_invite: {
        Args: { p_token: string };
        Returns: { list_id: string; list_name: string }[];
      };
      ensure_bootstrap: {
        Args: { [_ in never]: never };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
