export interface Channel {
  id: string;
  name: string;
  username: string;
  description: string;
  members: number;
  category: Category;
  language: Language;
  lastActive: string;
  avatarUrl: string;
  verified?: boolean;
  status: ChannelStatus;
}

export enum ChannelStatus {
  ACTIVE = 'Active',
  BANNED = 'Banned',
  DELETED = 'Deleted',
  UNKNOWN = 'Unknown'
}

export enum Category {
  ALL = 'All',
  CRYPTO = 'Crypto',
  NEWS = 'News',
  TECH = 'Tech',
  MOVIES = 'Movies',
  FITNESS = 'Fitness',
  EDUCATION = 'Education',
  HUMOR = 'Humor',
  FINANCE = 'Finance',
  ART = 'Art'
}

export enum Language {
  ALL = 'All',
  ENGLISH = 'English',
  SPANISH = 'Spanish',
  RUSSIAN = 'Russian',
  HINDI = 'Hindi',
  GERMAN = 'German'
}

export interface FilterState {
  category: Category;
  language: Language;
  minSubscribers: number;
  onlyActive: boolean;
}