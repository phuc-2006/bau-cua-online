export type AnimalType = 'nai' | 'bau' | 'ga' | 'ca' | 'cua' | 'tom';

export interface Animal {
  id: AnimalType;
  name: string;
  emoji: string;
}

export const ANIMALS: Animal[] = [
  { id: 'nai', name: 'Nai', emoji: '🦌' },
  { id: 'bau', name: 'Bầu', emoji: '🎃' },
  { id: 'ga', name: 'Gà', emoji: '🐓' },
  { id: 'ca', name: 'Cá', emoji: '🐟' },
  { id: 'cua', name: 'Cua', emoji: '🦀' },
  { id: 'tom', name: 'Tôm', emoji: '🦐' },
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
