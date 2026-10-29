import type { Food } from '@/db/types';

/**
 * Alimentos comuns no Brasil. Valores aproximados (base TACO/rotulagem) por porção de referência.
 * Edite à vontade — kcal e macros são estimativas.
 */
export const FOODS: Food[] = [
  // Carboidratos
  { id: 'arroz', name: 'Arroz branco cozido', group: 'carboidrato', unit: 'g', portion: 100, kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2 },
  { id: 'arroz-integral', name: 'Arroz integral cozido', group: 'carboidrato', unit: 'g', portion: 100, kcal: 124, protein: 2.6, carbs: 25.8, fat: 1 },
  { id: 'feijao', name: 'Feijão carioca cozido', group: 'carboidrato', unit: 'g', portion: 100, kcal: 76, protein: 4.8, carbs: 13.6, fat: 0.5 },
  { id: 'macarrao', name: 'Macarrão cozido', group: 'carboidrato', unit: 'g', portion: 100, kcal: 157, protein: 5.8, carbs: 30.9, fat: 0.9 },
  { id: 'batata', name: 'Batata inglesa cozida', group: 'carboidrato', unit: 'g', portion: 100, kcal: 52, protein: 1.2, carbs: 11.9, fat: 0 },
  { id: 'batata-doce', name: 'Batata-doce cozida', group: 'carboidrato', unit: 'g', portion: 100, kcal: 77, protein: 0.6, carbs: 18.4, fat: 0.1 },
  { id: 'mandioca', name: 'Mandioca cozida', group: 'carboidrato', unit: 'g', portion: 100, kcal: 125, protein: 0.6, carbs: 30.1, fat: 0.3 },
  { id: 'cuscuz', name: 'Cuscuz de milho', group: 'carboidrato', unit: 'g', portion: 100, kcal: 113, protein: 2.2, carbs: 25.3, fat: 0.7 },
  { id: 'pao-frances', name: 'Pão francês', group: 'carboidrato', unit: 'un', portion: 1, kcal: 150, protein: 4, carbs: 29.3, fat: 1.6 },
  { id: 'pao-forma', name: 'Pão de forma integral', group: 'carboidrato', unit: 'fatia', portion: 1, kcal: 63, protein: 2.4, carbs: 12, fat: 0.9 },
  { id: 'torrada', name: 'Torrada', group: 'carboidrato', unit: 'un', portion: 1, kcal: 40, protein: 1.1, carbs: 7.5, fat: 0.6 },
  { id: 'tapioca', name: 'Tapioca (goma hidratada)', group: 'carboidrato', unit: 'g', portion: 100, kcal: 240, protein: 0, carbs: 60, fat: 0 },
  { id: 'aveia', name: 'Aveia em flocos', group: 'carboidrato', unit: 'g', portion: 100, kcal: 394, protein: 13.9, carbs: 66.6, fat: 8.5 },
  { id: 'granola', name: 'Granola', group: 'carboidrato', unit: 'g', portion: 100, kcal: 420, protein: 9, carbs: 64, fat: 14 },
  { id: 'mel', name: 'Mel', group: 'carboidrato', unit: 'colher', portion: 1, kcal: 46, protein: 0, carbs: 12.6, fat: 0 },
  // Proteínas
  { id: 'ovo', name: 'Ovo inteiro', group: 'proteina', unit: 'un', portion: 1, kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { id: 'frango', name: 'Peito de frango grelhado', group: 'proteina', unit: 'g', portion: 100, kcal: 159, protein: 32, carbs: 0, fat: 2.5 },
  { id: 'patinho', name: 'Patinho moído refogado', group: 'proteina', unit: 'g', portion: 100, kcal: 219, protein: 35.9, carbs: 0, fat: 7.3 },
  { id: 'alcatra', name: 'Alcatra grelhada', group: 'proteina', unit: 'g', portion: 100, kcal: 235, protein: 31.9, carbs: 0, fat: 11.6 },
  { id: 'tilapia', name: 'Tilápia grelhada', group: 'proteina', unit: 'g', portion: 100, kcal: 128, protein: 26, carbs: 0, fat: 2.7 },
  { id: 'atum', name: 'Atum em lata (água)', group: 'proteina', unit: 'g', portion: 100, kcal: 120, protein: 26, carbs: 0, fat: 1 },
  { id: 'lombo', name: 'Lombo suíno assado', group: 'proteina', unit: 'g', portion: 100, kcal: 210, protein: 35.7, carbs: 0, fat: 6.4 },
  { id: 'whey', name: 'Whey protein (opcional)', group: 'suplemento', unit: 'scoop', portion: 1, kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
  // Laticínios
  { id: 'leite', name: 'Leite integral', group: 'laticinio', unit: 'ml', portion: 100, kcal: 61, protein: 3.2, carbs: 4.7, fat: 3.3 },
  { id: 'iogurte', name: 'Iogurte natural integral', group: 'laticinio', unit: 'g', portion: 100, kcal: 51, protein: 4.1, carbs: 1.9, fat: 3 },
  { id: 'iogurte-grego', name: 'Iogurte grego', group: 'laticinio', unit: 'g', portion: 100, kcal: 97, protein: 9, carbs: 4, fat: 5 },
  { id: 'queijo-minas', name: 'Queijo minas frescal', group: 'laticinio', unit: 'fatia', portion: 1, kcal: 79, protein: 5.2, carbs: 1, fat: 6 },
  { id: 'mussarela', name: 'Queijo mussarela', group: 'laticinio', unit: 'fatia', portion: 1, kcal: 66, protein: 4.5, carbs: 0.6, fat: 5 },
  // Gorduras
  { id: 'azeite', name: 'Azeite de oliva', group: 'gordura', unit: 'colher', portion: 1, kcal: 88, protein: 0, carbs: 0, fat: 10 },
  { id: 'pasta-amendoim', name: 'Pasta de amendoim', group: 'gordura', unit: 'colher', portion: 1, kcal: 90, protein: 4, carbs: 3, fat: 7.5 },
  { id: 'castanha-para', name: 'Castanha-do-pará', group: 'gordura', unit: 'un', portion: 1, kcal: 26, protein: 0.6, carbs: 0.5, fat: 2.6 },
  { id: 'mix-castanhas', name: 'Mix de castanhas', group: 'gordura', unit: 'g', portion: 100, kcal: 600, protein: 18, carbs: 22, fat: 52 },
  { id: 'abacate', name: 'Abacate', group: 'gordura', unit: 'g', portion: 100, kcal: 96, protein: 1.2, carbs: 6, fat: 8.4 },
  // Frutas
  { id: 'banana', name: 'Banana prata', group: 'fruta', unit: 'un', portion: 1, kcal: 69, protein: 0.9, carbs: 18.2, fat: 0.1 },
  { id: 'maca', name: 'Maçã', group: 'fruta', unit: 'un', portion: 1, kcal: 73, protein: 0.4, carbs: 19.9, fat: 0 },
  { id: 'mamao', name: 'Mamão', group: 'fruta', unit: 'g', portion: 100, kcal: 40, protein: 0.5, carbs: 10.4, fat: 0.1 },
  { id: 'laranja', name: 'Laranja', group: 'fruta', unit: 'un', portion: 1, kcal: 85, protein: 1.8, carbs: 21, fat: 0.2 },
  { id: 'uva-passa', name: 'Uva-passa', group: 'fruta', unit: 'g', portion: 100, kcal: 299, protein: 3, carbs: 79, fat: 0.5 },
  // Vegetais
  { id: 'salada', name: 'Salada (folhas e tomate)', group: 'vegetal', unit: 'g', portion: 100, kcal: 15, protein: 1, carbs: 3, fat: 0.2 },
  { id: 'legumes', name: 'Legumes cozidos', group: 'vegetal', unit: 'g', portion: 100, kcal: 30, protein: 1.5, carbs: 6, fat: 0.3 },
];

export const UNIT_LABEL: Record<string, string> = { g: 'g', ml: 'ml', un: 'un', fatia: 'fatia(s)', colher: 'colher(es)', concha: 'concha(s)', scoop: 'scoop' };

export const GROUP_LABEL: Record<string, string> = {
  proteina: 'Proteínas', carboidrato: 'Carboidratos', gordura: 'Gorduras', fruta: 'Frutas', laticinio: 'Laticínios', vegetal: 'Vegetais', bebida: 'Bebidas', suplemento: 'Suplementos',
};
