
export interface Monster {
  id: string;
  name: string;
  maxHp: number;
  image: string;
  level: number;
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic';
}

export enum InputMode {
  INTERNAL = 'INTERNAL',
  MONITOR = 'MONITOR'
}

export type CustomImages = Record<string, string>;
export type CustomNames = Record<string, string>;
