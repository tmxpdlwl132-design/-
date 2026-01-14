
import React from 'react';
import { Monster, Item } from './types';

export const MONSTER_POOL: Monster[] = [
  { id: 'm1', name: '슬라임 문장가', maxHp: 500, level: 1, image: 'https://picsum.photos/seed/slime/150/150' },
  { id: 'm2', name: '오타 유령', maxHp: 1500, level: 5, image: 'https://picsum.photos/seed/ghost/150/150' },
  { id: 'm3', name: '원고지 골렘', maxHp: 3000, level: 10, image: 'https://picsum.photos/seed/golem/150/150' },
  { id: 'm4', name: '마감의 악마', maxHp: 5000, level: 20, image: 'https://picsum.photos/seed/devil/150/150' },
  { id: 'm5', name: '창작의 고통', maxHp: 10000, level: 50, image: 'https://picsum.photos/seed/pain/150/150' },
];

export const ITEM_POOL: Item[] = [
  { id: 'i1', name: '낡은 깃펜', icon: '✒️', description: '데미지가 조금 상승할 것 같다.', rarity: 'Common' },
  { id: 'i2', name: '마법 잉크병', icon: '🧪', description: '글이 술술 써지는 마법의 잉크.', rarity: 'Rare' },
  { id: 'i3', name: '황금 지우개', icon: '🧽', description: '오타를 지워주는 성스러운 도구.', rarity: 'Epic' },
  { id: 'i4', name: '커피 얼룩', icon: '☕', description: '각성 효과가 있을지도?', rarity: 'Common' },
  { id: 'i5', name: '마감 엄수 부적', icon: '📜', description: '절대적인 힘을 가진 부적.', rarity: 'Epic' },
];

export const INITIAL_HP_OPTIONS = [500, 3000, 5000];
export const IDLE_THRESHOLD = 10000; // 10초
export const HEAL_INTERVAL = 10000; // 10초
export const HEAL_AMOUNT = 10;
export const SHIELD_DURATION = 5000; // 5초
export const SHIELD_COOLDOWN = 60000; // 60초
