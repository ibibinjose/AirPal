import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { BatteryProvider } from "@/contexts/BatteryContext";
import { ListingsProvider } from "@/contexts/ListingsContext";
import { EventsProvider } from "@/contexts/EventsContext";
import { SocialProvider } from "@/contexts/SocialContext";
import { BioProvider } from "@/contexts/BioContext";
import { ClubProvider } from "@/contexts/ClubContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { CompanionProvider } from "@/contexts/CompanionContext";
import { LocalNowProvider } from "@/contexts/LocalNowContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { composeProviders, type ProviderComponent } from "./composeProviders";

// Outermost-first. Order matches the previous nested JSX in App.tsx.
const PROVIDERS: ProviderComponent[] = [
  LocaleProvider,
  AuthProvider,
  BatteryProvider,
  SyncProvider,
  LocalNowProvider,
  AnalyticsProvider,
  ListingsProvider,
  EventsProvider,
  BioProvider,
  SocialProvider,
  ClubProvider,
  CompanionProvider,
];

export const AppProviders = composeProviders(PROVIDERS);
