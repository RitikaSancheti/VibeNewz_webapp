-- VibeNewz — Supabase schema 

-- Users of the app 
-- it's just a username people type in, no password).
create table if not exists users (
  id bigint generated always as identity primary key,
  username text unique not null,
  first_name text,
  last_name text,
  email text,
  location text,
  preferred_sentiment text default 'POSITIVE'
    check (preferred_sentiment in ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
  -- topics is just an array of strings, e.g. {Technology,Health}
  -- Postgres supports arrays natively so we don't need a separate join table for this.
  topics text[] default '{}',
  created_at timestamptz default now()
);

-- News articles pulled from NewsData.io + scored by the AI sentiment model.
create table if not exists news (
  id bigint generated always as identity primary key,
  article_id text unique, -- id from NewsData.io, used to avoid saving duplicates
  title text,
  description text,
  content text,
  source text,
  url text,
  sentiment text check (sentiment in ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
  category text,
  published_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Which user bookmarked which article (many-to-many).
create table if not exists user_bookmarks (
  user_id bigint not null references users(id) on delete cascade,
  news_id bigint not null references news(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, news_id)
);

-- Keywords a user has muted, so matching articles get filtered out of their feed.
create table if not exists muted_keywords (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id) on delete cascade,
  keyword text not null
);

-- Helpful indexes for the queries the backend runs most often.
create index if not exists idx_news_sentiment on news(sentiment);
create index if not exists idx_news_category on news(category);
create index if not exists idx_news_published_at on news(published_at desc);
create index if not exists idx_bookmarks_user on user_bookmarks(user_id);
create index if not exists idx_muted_user on muted_keywords(user_id);


