import { Suspense, lazy } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { BIO_PUBLIC_PATH } from "@shared/bio";
import { isPassApp } from "@/lib/app-flavor";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { STATIC_ALIASES } from "@/app/airpal-app";

// Eager load the landing page for instant first paint; every other route splits out.
import { HomePage } from "@/pages/HomePage";

// V2 Canonical Rebuilt Routes
const CirclePage = lazy(() => import("@/pages/CirclePage").then((m) => ({ default: m.CirclePage })));
const PlacesPage = lazy(() => import("@/pages/PlacesPage").then((m) => ({ default: m.PlacesPage })));
const CommunitiesPage = lazy(() => import("@/pages/CommunitiesPage").then((m) => ({ default: m.CommunitiesPage })));
const FriendsPage = lazy(() => import("@/pages/FriendsPage").then((m) => ({ default: m.FriendsPage })));
const ScanPage = lazy(() => import("@/pages/ScanPage").then((m) => ({ default: m.ScanPage })));
const EventPage = lazy(() => import("@/pages/EventPage").then((m) => ({ default: m.EventPage })));
const ExperienceDetailPage = lazy(() =>
  import("@/pages/ExperienceDetailPage").then((m) => ({ default: m.ExperienceDetailPage })),
);
const TicketPage = lazy(() => import("@/pages/TicketPage").then((m) => ({ default: m.TicketPage })));
const CalendarPage = lazy(() => import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const EventsPage = lazy(() => import("@/pages/EventsPage").then((m) => ({ default: m.EventsPage })));
const PassPage = lazy(() => import("@/pages/PassPage").then((m) => ({ default: m.PassPage })));
const GuestlistPage = lazy(() => import("@/pages/GuestlistPage").then((m) => ({ default: m.GuestlistPage })));
const EventStudioPage = lazy(() => import("@/pages/EventStudioPage").then((m) => ({ default: m.EventStudioPage })));

const MePage = lazy(() => import("@/pages/MePage").then((m) => ({ default: m.MePage })));
const MyTicketsPage = lazy(() => import("@/pages/MyTicketsPage").then((m) => ({ default: m.MyTicketsPage })));
const InboxPage = lazy(() => import("@/pages/InboxPage").then((m) => ({ default: m.InboxPage })));
const MemoryWallPage = lazy(() => import("@/pages/MemoryWallPage").then((m) => ({ default: m.MemoryWallPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const StartPage = lazy(() => import("@/pages/StartPage").then((m) => ({ default: m.StartPage })));
const AuthActionPage = lazy(() => import("@/pages/AuthActionPage").then((m) => ({ default: m.AuthActionPage })));
const BusinessPage = lazy(() => import("@/pages/BusinessPage").then((m) => ({ default: m.BusinessPage })));
const ClaimVenuePage = lazy(() => import("@/pages/ClaimVenuePage").then((m) => ({ default: m.ClaimVenuePage })));
const BioPublicPage = lazy(() => import("@/pages/BioPublicPage").then((m) => ({ default: m.BioPublicPage })));
const BioSetupPage = lazy(() => import("@/pages/BioSetupPage").then((m) => ({ default: m.BioSetupPage })));
const BioEditPage = lazy(() => import("@/pages/BioEditPage").then((m) => ({ default: m.BioEditPage })));
const BioRecoverPage = lazy(() => import("@/pages/BioRecoverPage").then((m) => ({ default: m.BioRecoverPage })));
const SearchAnalyticsPage = lazy(() =>
  import("@/pages/SearchAnalyticsPage").then((m) => ({ default: m.SearchAnalyticsPage })),
);
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const PromotionsPage = lazy(() => import("@/pages/PromotionsPage").then((m) => ({ default: m.PromotionsPage })));
const PromotionDetailPage = lazy(() =>
  import("@/pages/PromotionDetailPage").then((m) => ({ default: m.PromotionDetailPage })),
);
const PromotionsStudioPage = lazy(() =>
  import("@/pages/PromotionsStudioPage").then((m) => ({ default: m.PromotionsStudioPage })),
);
const ArrivalPage = lazy(() => import("@/pages/ArrivalPage").then((m) => ({ default: m.ArrivalPage })));
const PulsePage = lazy(() => import("@/pages/PulsePage").then((m) => ({ default: m.PulsePage })));
const BirthdayFreebiesPage = lazy(() =>
  import("@/pages/BirthdayFreebiesPage").then((m) => ({ default: m.BirthdayFreebiesPage })),
);
const BusinessOnboardPage = lazy(() =>
  import("@/pages/BusinessOnboardPage").then((m) => ({ default: m.BusinessOnboardPage })),
);
const GetAppPage = lazy(() => import("@/pages/GetAppPage").then((m) => ({ default: m.GetAppPage })));
const AlternativesPage = lazy(() => import("@/pages/AlternativesPage").then((m) => ({ default: m.AlternativesPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const TrustPage = lazy(() => import("@/pages/TrustPage").then((m) => ({ default: m.TrustPage })));
const AboutPage = lazy(() => import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("@/pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const HelpPage = lazy(() => import("@/pages/HelpPage").then((m) => ({ default: m.HelpPage })));
const UnsubscribePage = lazy(() => import("@/pages/UnsubscribePage").then((m) => ({ default: m.UnsubscribePage })));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("@/pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const CookiesPage = lazy(() => import("@/pages/CookiesPage").then((m) => ({ default: m.CookiesPage })));

function RouteFallback() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 p-8"
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="text-sm text-mute">Loading…</p>
    </div>
  );
}

export function AppRoutes() {
  const [location] = useLocation();
  return (
    <RouteErrorBoundary resetKeys={[location]}>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/">{isPassApp() ? <Redirect to="/pass" /> : <HomePage />}</Route>

          {/* One AirPal App: every first-class page, grouped by pillar. */}
          {/* Pass — Events & Access */}
          <Route path="/pass" component={PassPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/events/new">
            <EventStudioPage forceCreate />
          </Route>
          <Route path="/e/:id/guests" component={GuestlistPage} />
          <Route path="/e/:id/manage">{(p) => <EventStudioPage eventId={p.id} />}</Route>
          <Route path="/event/manage">
            <EventStudioPage />
          </Route>
          <Route path="/e/:id" component={EventPage} />
          <Route path="/experience/:id" component={ExperienceDetailPage} />
          <Route path="/ticket/:id" component={TicketPage} />
          <Route path="/me/tickets" component={MyTicketsPage} />
          <Route path="/scan" component={ScanPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/event">
            <EventStudioPage />
          </Route>

          {/* Discover: places & communities */}
          <Route path="/places" component={PlacesPage} />
          <Route path="/communities" component={CommunitiesPage} />

          {/* Circle & Me */}
          <Route path="/circle" component={CirclePage} />
          <Route path="/friends" component={FriendsPage} />
          <Route path="/me" component={MePage} />
          <Route path="/bio" component={MePage} />
          <Route path="/bio/setup" component={BioSetupPage} />
          <Route path="/bio/edit" component={BioEditPage} />
          <Route path="/bio/recover" component={BioRecoverPage} />
          <Route path="/me/memories" component={MemoryWallPage} />
          <Route path="/me/inbox" component={InboxPage} />

          {/* Business & Arrival */}
          <Route path="/business" component={BusinessPage} />
          <Route path="/business/onboard">
            <BusinessOnboardPage step="onboard" />
          </Route>
          <Route path="/business/setup">
            <BusinessOnboardPage step="setup" />
          </Route>
          <Route path="/business/helpdesk">
            <BusinessOnboardPage step="helpdesk" />
          </Route>
          <Route path="/business/promotions/new">
            <PromotionsStudioPage scope="business" view="new" />
          </Route>
          <Route path="/business/promotions/:id">
            <PromotionsStudioPage scope="business" view="detail" />
          </Route>
          <Route path="/business/promotions">
            <PromotionsStudioPage scope="business" view="list" />
          </Route>
          <Route path="/claim" component={ClaimVenuePage} />
          <Route path="/join/:code">
            <ArrivalPage mode="join" />
          </Route>
          <Route path="/join">
            <ArrivalPage mode="join" />
          </Route>
          <Route path="/arrival/:code">
            <ArrivalPage mode="arrival" />
          </Route>
          <Route path="/arrival">
            <ArrivalPage mode="arrival" />
          </Route>
          <Route path="/host/pulse" component={PulsePage} />
          <Route path="/host" component={PulsePage} />
          <Route path="/pulse/:publicToken" component={PulsePage} />
          <Route path="/pulse" component={PulsePage} />
          <Route path="/deals/:id">
            <PromotionDetailPage kind="promotion" />
          </Route>
          <Route path="/deals" component={PromotionsPage} />
          <Route path="/giveaways/:id">
            <PromotionDetailPage kind="giveaway" />
          </Route>
          <Route path="/giveaways" component={PromotionsPage} />
          <Route path="/birthday-freebies/:region" component={BirthdayFreebiesPage} />
          <Route path="/birthday-freebies" component={BirthdayFreebiesPage} />

          {/* Admin */}
          <Route path="/admin/search-analytics" component={SearchAnalyticsPage} />
          <Route path="/admin/promotions/:id">
            <PromotionsStudioPage scope="admin" view="detail" />
          </Route>
          <Route path="/admin/promotions">
            <PromotionsStudioPage scope="admin" view="list" />
          </Route>
          <Route path="/admin/notifications">
            <PromotionsStudioPage scope="admin" view="notifications" />
          </Route>
          <Route path="/admin" component={AdminPage} />

          {/* System */}
          <Route path="/start" component={StartPage} />
          <Route path="/auth/action" component={AuthActionPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/trust" component={TrustPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/help" component={HelpPage} />
          <Route path="/helpdesk" component={HelpPage} />
          <Route path="/unsubscribe" component={UnsubscribePage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/cookies" component={CookiesPage} />
          <Route path="/alternatives/:slug" component={AlternativesPage} />
          <Route path="/getAirPalApp" component={GetAppPage} />

          {/* Param-preserving legacy aliases (forward the param, then land). */}
          <Route path="/promotions/:id">{(p) => <Redirect to={`/deals/${p.id}`} />}</Route>
          <Route path="/stay/@:handle">{(p) => <Redirect to={`/@${p.handle}`} />}</Route>
          <Route path="/e/:eventId/s/:stallId">{(p) => <Redirect to={`/e/${p.eventId}`} />}</Route>
          <Route path="/experience-details/:id">{(p) => <Redirect to={`/e/${p.id}`} />}</Route>
          <Route path="/experience-details">
            <Redirect to="/events" />
          </Route>
          <Route path="/f/:slug">{(p) => <Redirect to={`/events?q=${encodeURIComponent(p.slug)}`} />}</Route>

          {/* Static legacy aliases — one table in @/app/airpal-app. */}
          {STATIC_ALIASES.map((alias) => (
            <Route key={alias.from} path={alias.from}>
              <Redirect to={alias.to} />
            </Route>
          ))}

          <Route path={BIO_PUBLIC_PATH} component={BioPublicPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </Suspense>
    </RouteErrorBoundary>
  );
}
