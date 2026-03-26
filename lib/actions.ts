import {
  DollarSignIcon,
  RocketIcon,
  TagIcon,
  SearchIcon,
} from "lucide-react";

export interface ActionDefinition {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  prompt: string;
  iconBg: string;
  iconColor: string;
}

export const ACTIONS: ActionDefinition[] = [
  {
    id: "price-change",
    icon: DollarSignIcon,
    title: "Price Change",
    description: "Update pricing for any product",
    prompt: "Set a 20% discount on STR-001 Classic Runner",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-700 dark:text-emerald-400",
  },
  {
    id: "launch-promo",
    icon: RocketIcon,
    title: "Launch Promo",
    description: "Activate a promo campaign",
    prompt: "Launch the spring promo for all Stride products",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-700 dark:text-blue-400",
  },
  {
    id: "toggle-promo",
    icon: TagIcon,
    title: "Toggle Promo",
    description: "Activate or deactivate promo status",
    prompt: "Set promo status to active for STR-002 Court Essential",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-700 dark:text-amber-400",
  },
  {
    id: "query-data",
    icon: SearchIcon,
    title: "Query Data",
    description: "Check current catalog state",
    prompt: "What are the current prices for all products?",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-700 dark:text-violet-400",
  },
];
