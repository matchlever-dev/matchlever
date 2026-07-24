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
          role: string;
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
          role?: string;
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
          role?: string;
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
          raw_resume_text: string | null;
          sanitized_summary: string | null;
          location_mode: string;
          min_salary: number | null;
          visa_status: string | null;
          years_experience: number | null;
          seeker_tos_accepted_at: string | null;
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
          raw_resume_text?: string | null;
          sanitized_summary?: string | null;
          location_mode?: string;
          min_salary?: number | null;
          visa_status?: string | null;
          years_experience?: number | null;
          seeker_tos_accepted_at?: string | null;
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
          raw_resume_text?: string | null;
          sanitized_summary?: string | null;
          location_mode?: string;
          min_salary?: number | null;
          visa_status?: string | null;
          years_experience?: number | null;
          seeker_tos_accepted_at?: string | null;
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
      hirer_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          title: string | null;
          global_city: string | null;
          global_country: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          title?: string | null;
          global_city?: string | null;
          global_country?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          title?: string | null;
          global_city?: string | null;
          global_country?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hirer_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_postings: {
        Row: {
          id: string;
          hirer_profile_id: string;
          title: string;
          company_name: string | null;
          description: string | null;
          status: string;
          kanban_columns: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hirer_profile_id: string;
          title: string;
          company_name?: string | null;
          description?: string | null;
          status?: string;
          kanban_columns?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          hirer_profile_id?: string;
          title?: string;
          company_name?: string | null;
          description?: string | null;
          status?: string;
          kanban_columns?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_postings_hirer_profile_id_fkey";
            columns: ["hirer_profile_id"];
            isOneToOne: false;
            referencedRelation: "hirer_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      match_handshakes: {
        Row: {
          id: string;
          job_posting_id: string;
          candidate_profile_id: string;
          kanban_column: string;
          is_manual_match: boolean;
          matched_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_posting_id: string;
          candidate_profile_id: string;
          kanban_column?: string;
          is_manual_match?: boolean;
          matched_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_posting_id?: string;
          candidate_profile_id?: string;
          kanban_column?: string;
          is_manual_match?: boolean;
          matched_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_handshakes_job_posting_id_fkey";
            columns: ["job_posting_id"];
            isOneToOne: false;
            referencedRelation: "job_postings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_handshakes_candidate_profile_id_fkey";
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
