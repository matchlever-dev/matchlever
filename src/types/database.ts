/**
 * Shared Database types aligned with Phase 1 migrations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          is_superuser: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_superuser?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_superuser?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      candidate_profiles: {
        Row: {
          id: string;
          user_id: string;
          headline: string | null;
          bio: string | null;
          global_city: string | null;
          global_country: string | null;
          timezone_offset: number | null;
          work_hours_start: string | null;
          work_hours_end: string | null;
          suggested_taglines: Json;
          verified_superpowers: Json;
          status: string;
          selected_tagline: string | null;
          verified_skills: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          headline?: string | null;
          bio?: string | null;
          global_city?: string | null;
          global_country?: string | null;
          timezone_offset?: number | null;
          work_hours_start?: string | null;
          work_hours_end?: string | null;
          suggested_taglines?: Json;
          verified_superpowers?: Json;
          status?: string;
          selected_tagline?: string | null;
          verified_skills?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          headline?: string | null;
          bio?: string | null;
          global_city?: string | null;
          global_country?: string | null;
          timezone_offset?: number | null;
          work_hours_start?: string | null;
          work_hours_end?: string | null;
          suggested_taglines?: Json;
          verified_superpowers?: Json;
          status?: string;
          selected_tagline?: string | null;
          verified_skills?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_references: {
        Row: {
          id: string;
          candidate_profile_id: string;
          reference_name: string | null;
          reference_email: string;
          reference_linkedin_url: string | null;
          relationship: string | null;
          authenticity_score: number | null;
          authenticity_flags: Json;
          verification_token: string;
          status: string;
          superpowers: Json;
          reliability_score: number | null;
          technical_quality_score: number | null;
          rehire_intent_score: number | null;
          endorsement: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_profile_id: string;
          reference_name?: string | null;
          reference_email: string;
          reference_linkedin_url?: string | null;
          relationship?: string | null;
          authenticity_score?: number | null;
          authenticity_flags?: Json;
          verification_token?: string;
          status?: string;
          superpowers?: Json;
          reliability_score?: number | null;
          technical_quality_score?: number | null;
          rehire_intent_score?: number | null;
          endorsement?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_profile_id?: string;
          reference_name?: string | null;
          reference_email?: string;
          reference_linkedin_url?: string | null;
          relationship?: string | null;
          authenticity_score?: number | null;
          authenticity_flags?: Json;
          verification_token?: string;
          status?: string;
          superpowers?: Json;
          reliability_score?: number | null;
          technical_quality_score?: number | null;
          rehire_intent_score?: number | null;
          endorsement?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_references_candidate_profile_id_fkey";
            columns: ["candidate_profile_id"];
            isOneToOne: false;
            referencedRelation: "candidate_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_superuser: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_reference_invite: {
        Args: { p_token: string };
        Returns: {
          token: string;
          status: string;
          relationship: string | null;
          reference_name: string | null;
          candidate_title: string;
          candidate_tagline: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
