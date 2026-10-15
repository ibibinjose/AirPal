import { Suspense, lazy } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { BIO_PUBLIC_PATH } from "@shared/bio";
import { isPassApp } from "@/lib/app-flavor";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

// Eager load the landing page for instant first paint; every other route splits out.
import { HomePage } from "@/pages/HomePage";

// V2 Canonical Rebuilt Routes
const CirclePage = lazy(() => import("@/pages/CirclePage").then((m) => ({ default: m.CirclePage })));
const ScanPage = lazy(() => import("@/pages/ScanPage").then((m) => ({ default: m.ScanPage })));
const EventPage = lazy(() => import("@/pages/EventPage").then((m) => ({ default: m.EventPage })));
const TicketPage = lazy(() => import("@/pages/TicketPage").then((m) => ({ default: m.TicketPage })));
const CalendarPage = lazy(() => import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const EventsPage = lazy(() => import("@/pages/EventsPage").then((m) => ({ default: m.EventsPage })));
const PassPage = lazy(() => import("@/pages/PassPage").then((m) => ({ default: m.PassPage })));
const GuestlistPage = lazy(() => import("@/pages/GuestlistPage").then((m) => ({ default: m.GuestlistPage })));
const ManageEventPage = lazy(() => import("@/pages/ManageEventPage").then((m) => ({ default: m.ManageEventPage })));
const OrganiserEventPage = lazy(() =>
  import("@/pages/OrganiserEventPage").then((m) => ({ default: m.OrganiserEventPage })),
);

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
const SearchAnalyticsPage = lazy(() =>
  import("@/pages/SearchAnalyticsPage").then((m) => ({ default: m.SearchAnalyticsPage })),
);
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const PromotionsPage = lazy(() => import("@/pages/PromotionsPage").then((m) => ({ default: m.PromotionsPage })));
const PromotionDetailPage = lazy(() =>
  import("@/pages/PromotionDetailPage").then((m) => ({ default: m.PromotionDetailPage })),
);
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
          {/* Discovery removed — legacy /now, /explore, /guide, /p/* URLs land on Home. */}
          <Route path="/now">
            <Redirect to="/" />
          </Route>
          <Route path="/explore/attractions">
            <Redirect to="/" />
          </Route>
          <Route path="/explore">
            <Redirect to="/" />
          </Route>
          <Route path="/places">
            <Redirect to="/" />
          </Route>
          <Route path="/communities">
            <Redirect to="/events" />
          </Route>
          <Route path="/friends">
            <Redirect to="/circle" />
          </Route>
          <Route path="/my-day">
            <Redirect to="/" />
          </Route>
          <Route path="/passbook">
            <Redirect to="/me/tickets" />
          </Route>
          <Route path="/discover">
            <Redirect to="/" />
          </Route>
          <Route path="/discovery">
            <Redirect to="/" />
          </Route>
          <Route path="/search">
            <Redirect to="/" />
          </Route>
          <Route path="/admin/search-analytics" component={SearchAnalyticsPage} />
          <Route path="/search/analytics">
            <Redirect to="/admin/search-analytics" />
          </Route>
          <Route path="/guide">
            <Redirect to="/" />
          </Route>
          <Route path="/venues">
            <Redirect to="/" />
          </Route>
          <Route path="/tour/:id">
            <Redirect to="/" />
          </Route>
          <Route path="/scan" component={ScanPage} />
          <Route path="/qr-scanner">
            <Redirect to="/scan" />
          </Route>
          <Route path="/w/:code">
            <Redirect to="/circle" />
          </Route>
          <Route path="/circle" component={CirclePage} />
          <Route path="/concierge">
            <Redirect to="/" />
          </Route>
          <Route path="/stay">
            <Redirect to="/business" />
          </Route>
          <Route path="/g/:id">
            <Redirect to="/business" />
          </Route>
          <Route path="/g">
            <Redirect to="/business" />
          </Route>
          <Route path="/c/:id">
            <Redirect to="/events" />
          </Route>
          <Route path="/c">
            <Redirect to="/events" />
          </Route>
          <Route path="/stay/@:handle">{(p) => <Redirect to={`/@${p.handle}`} />}</Route>
          <Route path="/stay/:id">
            <Redirect to="/business" />
          </Route>
          <Route path="/q/:city/:handle">
            <Redirect to="/" />
          </Route>
          <Route path="/q/:a">
            <Redirect to="/" />
          </Route>
          <Route path="/q">
            <Redirect to="/" />
          </Route>
          <Route path="/p/:id">
            <Redirect to="/" />
          </Route>
          <Route path="/e/:eventId/s/:stallId">{(p) => <Redirect to={`/e/${p.eventId}`} />}</Route>
          <Route path="/e/:id/guests" component={GuestlistPage} />
          <Route path="/e/:id/manage" component={ManageEventPage} />
          <Route path="/event/manage" component={ManageEventPage} />
          <Route path="/experience-details/:id">{(p) => <Redirect to={`/e/${p.id}`} />}</Route>
          <Route path="/experience-details">
            <Redirect to="/events" />
          </Route>
          <Route path="/saved-experiences">
            <Redirect to="/me/tickets" />
          </Route>
          <Route path="/e/:id" component={EventPage} />
          <Route path="/ticket/:id" component={TicketPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/f/new">
            <Redirect to="/event" />
          </Route>
          <Route path="/f/:slug">{(p) => <Redirect to={`/events?q=${encodeURIComponent(p.slug)}`} />}</Route>
          <Route path="/f">
            <Redirect to="/events" />
          </Route>
          <Route path="/event-categories">
            <Redirect to="/events" />
          </Route>
          <Route path="/events" component={EventsPage} />
          <Route path="/pass" component={PassPage} />
          <Route path="/pass/events">
            <Redirect to="/events" />
          </Route>
          <Route path="/pass/deals">
            <Redirect to="/deals" />
          </Route>
          <Route path="/pass/tickets">
            <Redirect to="/me/tickets" />
          </Route>
          <Route path="/pass/scan">
            <Redirect to="/scan" />
          </Route>
          {/* Planning removed — legacy /plan/* and /invite/* URLs land on Home. */}
          <Route path="/plans">
            <Redirect to="/" />
          </Route>
          <Route path="/plan/new">
            <Redirect to="/" />
          </Route>
          <Route path="/plan/:id/edit">
            <Redirect to="/" />
          </Route>
          <Route path="/plan/:id/guests">
            <Redirect to="/" />
          </Route>
          <Route path="/plan/:id">
            <Redirect to="/" />
          </Route>
          <Route path="/plan">
            <Redirect to="/" />
          </Route>
          <Route path="/invite/:code">
            <Redirect to="/" />
          </Route>
          <Route path="/events/new">
            <Redirect to="/event" />
          </Route>
          <Route path="/create">
            <Redirect to="/event" />
          </Route>
          <Route path="/event/new">
            <Redirect to="/event" />
          </Route>
          <Route path="/event-analytics">
            <Redirect to="/event" />
          </Route>
          <Route path="/event" component={OrganiserEventPage} />
          <Route path="/me/memories" component={MemoryWallPage} />
          <Route path="/notifications">
            <Redirect to="/me/inbox" />
          </Route>
          <Route path="/me/inbox" component={InboxPage} />
          <Route path="/inbox">
            <Redirect to="/me/inbox" />
          </Route>
          <Route path="/chat">
            <Redirect to="/me/inbox" />
          </Route>
          <Route path="/messages">
            <Redirect to="/me/inbox" />
          </Route>
          <Route path="/wallet">
            <Redirect to="/me/tickets" />
          </Route>
          <Route path="/check-in-history">
            <Redirect to="/me/tickets" />
          </Route>
          <Route path="/me/tickets" component={MyTicketsPage} />
          <Route path="/me" component={MePage} />
          <Route path="/bio" component={MePage} />
          <Route path="/account-sync">
            <Redirect to="/settings" />
          </Route>
          <Route path="/settings" component={SettingsPage} />
          <Route path="/host/pulse">
            <Redirect to="/event" />
          </Route>
          <Route path="/host">
            <Redirect to="/event" />
          </Route>
          <Route path="/pulse">
            <Redirect to="/event" />
          </Route>
          <Route path="/pulse/:publicToken">
            <Redirect to="/" />
          </Route>
          <Route path="/start" component={StartPage} />
          <Route path="/reset">
            <Redirect to="/start?tab=reset" />
          </Route>
          <Route path="/auth/action" component={AuthActionPage} />
          {/* Cohorts cut per GLOBAL_WIN_PLAN.md: partner entry -> /business, newcomer entry -> /events. */}
          <Route path="/join/:code">
            <Redirect to="/business" />
          </Route>
          <Route path="/join">
            <Redirect to="/business" />
          </Route>
          <Route path="/arrival/:code">
            <Redirect to="/events" />
          </Route>
          <Route path="/arrival">
            <Redirect to="/events" />
          </Route>
          <Route path="/founders">
            <Redirect to="/about" />
          </Route>
          <Route path="/business/onboard">
            <Redirect to="/business" />
          </Route>
          <Route path="/business/setup">
            <Redirect to="/business" />
          </Route>
          <Route path="/business/helpdesk">
            <Redirect to="/help" />
          </Route>
          <Route path="/host/helpdesk">
            <Redirect to="/help" />
          </Route>
          <Route path="/helpdesk">
            <Redirect to="/help" />
          </Route>
          <Route path="/business" component={BusinessPage} />
          <Route path="/claim" component={ClaimVenuePage} />
          <Route path="/bio/setup" component={BioSetupPage} />
          <Route path="/bio/edit" component={BioEditPage} />
          <Route path="/bio/recover">
            <Redirect to="/bio" />
          </Route>
          <Route path="/auth">
            <Redirect to="/start?tab=signin" />
          </Route>
          <Route path="/signin">
            <Redirect to="/start?tab=signin" />
          </Route>
          <Route path="/partners">
            <Redirect to="/business" />
          </Route>
          <Route path="/partner">
            <Redirect to="/business" />
          </Route>
          <Route path="/listings">
            <Redirect to="/business" />
          </Route>
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/promotions">
            <Redirect to="/admin" />
          </Route>
          <Route path="/admin/promotions/:id">
            <Redirect to="/admin" />
          </Route>
          <Route path="/business/promotions/new">
            <Redirect to="/business" />
          </Route>
          <Route path="/business/promotions/:id">
            <Redirect to="/deals" />
          </Route>
          <Route path="/business/promotions">
            <Redirect to="/deals" />
          </Route>
          <Route path="/admin/notifications">
            <Redirect to="/admin" />
          </Route>
          <Route path="/deals/:id">
            <PromotionDetailPage kind="promotion" />
          </Route>
          <Route path="/deals" component={PromotionsPage} />
          <Route path="/offers">
            <Redirect to="/deals" />
          </Route>
          <Route path="/promotions">
            <Redirect to="/deals" />
          </Route>
          <Route path="/promotions/:id">{(p) => <Redirect to={`/deals/${p.id}`} />}</Route>
          <Route path="/giveaways">
            <Redirect to="/deals" />
          </Route>
          <Route path="/giveaways/:id">{(p) => <Redirect to={`/deals/${p.id}`} />}</Route>
          <Route path="/birthday-freebies">
            <Redirect to="/deals" />
          </Route>
          <Route path="/birthday-freebies/:region">
            <Redirect to="/deals" />
          </Route>
          <Route path="/getAirPalApp">
            <Redirect to="/me" />
          </Route>
          <Route path="/getAirPal">
            <Redirect to="/me" />
          </Route>
          <Route path="/about" component={AboutPage} />
          <Route path="/trust" component={TrustPage} />
          <Route path="/alternatives/:slug">
            <Redirect to="/about" />
          </Route>
          <Route path="/contact" component={ContactPage} />
          <Route path="/help" component={HelpPage} />
          <Route path="/support">
            <Redirect to="/help" />
          </Route>
          <Route path="/assist">
            <Redirect to="/help" />
          </Route>
          <Route path="/unsubscribe" component={UnsubscribePage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/cookies" component={CookiesPage} />
          <Route path="/legal">
            <Redirect to="/privacy" />
          </Route>
          <Route path="/os">
            <Redirect to="/" />
          </Route>
          <Route path={BIO_PUBLIC_PATH} component={BioPublicPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </Suspense>
    </RouteErrorBoundary>
  );
}
