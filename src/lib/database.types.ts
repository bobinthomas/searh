export type ContentStatus = "draft" | "published";

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          slug: string;
          title: string;
          summary: string | null;
          client: string | null;
          year: number | null;
          cover_path: string | null;
          tags: string[];
          body_md: string | null;
          status: ContentStatus;
          sort_order: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          summary?: string | null;
          client?: string | null;
          year?: number | null;
          cover_path?: string | null;
          tags?: string[];
          body_md?: string | null;
          status?: ContentStatus;
          sort_order?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          summary?: string | null;
          client?: string | null;
          year?: number | null;
          cover_path?: string | null;
          tags?: string[];
          body_md?: string | null;
          status?: ContentStatus;
          sort_order?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_images: {
        Row: {
          id: string;
          project_id: string;
          storage_path: string;
          alt: string | null;
          caption: string | null;
          width: number | null;
          height: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          project_id: string;
          storage_path: string;
          alt?: string | null;
          caption?: string | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          project_id?: string;
          storage_path?: string;
          alt?: string | null;
          caption?: string | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
        };
      };
      posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          cover_path: string | null;
          body_md: string | null;
          tags: string[];
          status: ContentStatus;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          cover_path?: string | null;
          body_md?: string | null;
          tags?: string[];
          status?: ContentStatus;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          excerpt?: string | null;
          cover_path?: string | null;
          body_md?: string | null;
          tags?: string[];
          status?: ContentStatus;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Enums: {
      content_status: ContentStatus;
    };
  };
}
