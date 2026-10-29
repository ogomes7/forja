import type { MealItem, MealSlot } from '@/db/types';

/**
 * Cardápio-exemplo para ganho de massa (~2.900 kcal, ~180 g de proteína).
 * Variações A/B/C por refeição, alternando ao longo da semana. Os horários vêm do planejador.
 * Use "Ajustar porções à meta" na Dieta para escalar às suas calorias.
 */
const it = (foodId: string, qty: number): MealItem => ({ foodId, qty });

export const MENU_VARIANTS: Record<Exclude<MealSlot, 'extra'>, MealItem[][]> = {
  pre: [
    [it('banana', 1), it('aveia', 30), it('mel', 1), it('iogurte', 170)],
    [it('pao-frances', 1), it('ovo', 1), it('banana', 1)],
    [it('tapioca', 60), it('queijo-minas', 1), it('banana', 1)],
  ],
  pos: [
    [it('pao-frances', 2), it('ovo', 2), it('queijo-minas', 1), it('leite', 200)],
    [it('cuscuz', 200), it('ovo', 3), it('leite', 200), it('banana', 1)],
    [it('tapioca', 80), it('frango', 80), it('queijo-minas', 1), it('leite', 200), it('banana', 1)],
  ],
  almoco: [
    [it('arroz', 150), it('feijao', 140), it('frango', 130), it('legumes', 100), it('salada', 100), it('azeite', 1)],
    [it('arroz', 150), it('feijao', 140), it('patinho', 120), it('legumes', 100), it('salada', 100), it('azeite', 1)],
    [it('macarrao', 200), it('patinho', 110), it('salada', 100), it('azeite', 1)],
  ],
  lanche: [
    [it('leite', 300), it('banana', 1), it('aveia', 30), it('pasta-amendoim', 1)],
    [it('pao-forma', 2), it('frango', 60), it('mussarela', 1), it('laranja', 1), it('mix-castanhas', 20)],
    [it('iogurte-grego', 150), it('aveia', 30), it('banana', 1), it('pasta-amendoim', 1)],
  ],
  jantar: [
    [it('arroz', 120), it('feijao', 100), it('patinho', 110), it('batata-doce', 100), it('legumes', 100)],
    [it('arroz', 120), it('feijao', 100), it('frango', 130), it('mandioca', 100), it('legumes', 100)],
    [it('arroz', 120), it('feijao', 100), it('ovo', 3), it('batata', 150), it('legumes', 100), it('azeite', 1)],
  ],
  ceia: [
    [it('iogurte-grego', 150), it('granola', 30)],
    [it('leite', 250), it('aveia', 30), it('pasta-amendoim', 1)],
    [it('pao-forma', 2), it('ovo', 2), it('queijo-minas', 1)],
  ],
};

/** Variação usada em cada dia da semana (0 = domingo). */
export function variantFor(weekday: number) {
  return weekday % 3;
}

export const SHAKES: { name: string; note: string; items: MealItem[] }[] = [
  { name: 'Vitamina clássica', note: 'A mais fácil de bater. ~525 kcal.', items: [it('leite', 300), it('banana', 1), it('aveia', 40), it('pasta-amendoim', 1)] },
  { name: 'Vitamina com whey', note: 'Mais proteína. ~490 kcal.', items: [it('leite', 300), it('banana', 1), it('whey', 1), it('aveia', 30)] },
  { name: 'Vitamina de abacate', note: 'Cremosa e calórica. ~470 kcal.', items: [it('leite', 300), it('abacate', 100), it('mel', 1), it('aveia', 30)] },
  { name: 'Iogurte turbinado', note: 'Para comer de colher. ~430 kcal.', items: [it('iogurte-grego', 170), it('mamao', 150), it('granola', 40), it('mel', 1)] },
  { name: 'Shake de amendoim', note: 'Denso para pouco apetite. ~640 kcal.', items: [it('leite', 300), it('banana', 1), it('pasta-amendoim', 2), it('aveia', 30), it('mel', 1)] },
];

export const EAT_MORE_TIPS = [
  'Beba as calorias: vitaminas descem mais fácil que pratos grandes.',
  'Some calorias "invisíveis": 1 colher de azeite no prato (+88 kcal) ou pasta de amendoim na fruta (+90 kcal).',
  'Prefira alimentos densos: aveia, granola, castanhas, uva-passa, pão, massas e arroz.',
  'Não pule refeições: 5–6 refeições menores são mais fáceis que 3 grandes.',
  'Beba água entre as refeições, não durante — ela ocupa espaço no estômago.',
  'Deixe lanches prontos (castanhas, banana, iogurte) para não depender da fome.',
  'Coma a proteína primeiro e depois o carboidrato.',
];
