export type AnimalType = 'nai' | 'bau' | 'ga' | 'ca' | 'cua' | 'tom';

export interface Animal {
  id: AnimalType;
  name: string;
  emoji: string;
  image?: string;
}

export const ANIMALS: Animal[] = [
  { id: 'nai', name: 'Nai', emoji: '🦌', image: '/images/animals/nai.png' },
  { id: 'bau', name: 'Bầu', emoji: '🎃', image: '/images/animals/bau.png' },
  { id: 'ga', name: 'Gà', emoji: '🐓', image: '/images/animals/ga.png' },
  { id: 'ca', name: 'Cá', emoji: '🐟', image: '/images/animals/ca.png' },
  { id: 'cua', name: 'Cua', emoji: '🦀', image: '/images/animals/cua.png' },
  { id: 'tom', name: 'Tôm', emoji: '🦐', image: '/images/animals/tom.png' },
];

export const BET_AMOUNTS = [10000, 50000, 100000, 500000];

export interface Bet {
  animal: AnimalType;
  amount: number;
}

export interface GameResult {
  dice: [AnimalType, AnimalType, AnimalType];
  winnings: number;
  bets: Bet[];
}

export const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};
