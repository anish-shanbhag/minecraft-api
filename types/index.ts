export interface Item {
  name: string;
  namespacedId: string;
  description: string;
  image: string;
  renewable: boolean;
  stackSize: number;
}

export interface Block {
  name: string;
  namespacedId: string;
  description: string;
  image: string;
  item: string | null;
  tool: "Axe" | "Pickaxe" | "Sword" | "Shovel" | "Hoe" | "Shears" | null;
  flammable: boolean;
  transparent: boolean;
  luminance: number;
  blastResistance: number;
  colors: {
    color: [number, number, number];
    amount: number;
  }[];
}

export interface CraftingRecipe {
  item: string;
  quantity: number;
  recipe: (string | string[])[];
  shapeless: boolean;
}
