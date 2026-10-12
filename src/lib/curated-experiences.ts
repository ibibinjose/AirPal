export interface ExperienceItem {
  id: string;
  title: string;
  category: "Events" | "Dining & Cafes" | "Outdoors & Walks" | "Arts & Culture" | "Wellness" | "Local Perks";
  kind: "idea" | "event" | "deal" | "attraction";
  description: string;
  venue: string;
  area: string;
  image: string;
  starts_at?: string;
  open_hour?: number;
  close_hour?: number;
  duration?: string;
  price_label?: string;
  price_amount?: number;
  badge?: string;
  bookingUrl?: string;
  insiderTip?: string;
  deal?: {
    badge: string;
    detail: string;
    claimHint?: string;
  };
}

export const CURATED_EXPERIENCES: ExperienceItem[] = [
  {
    id: "glenmore-sunset",
    title: "Golden Hour Rooftop at The Glenmore",
    category: "Dining & Cafes",
    kind: "idea",
    description:
      "Panoramic harbour views overlooking the Opera House. Soak in the afternoon glow with craft brews and classic pub fare.",
    venue: "The Glenmore Hotel",
    area: "The Rocks, Sydney",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    open_hour: 11,
    close_hour: 23,
    duration: "1.5 hours",
    price_label: "Drop in",
    badge: "15% Guest Perk",
    insiderTip:
      "Head straight up the stairs to the rooftop terrace before 5:30 PM for the golden light across the sails.",
    deal: {
      badge: "15% Off Food & Drinks",
      detail: "Show your AirPal Pass at the bar for 15% off food and local taps before 6 PM.",
      claimHint: "Show AirPal Pass",
    },
  },
  {
    id: "rocks-night-market",
    title: "The Rocks Weekend Night Market",
    category: "Events",
    kind: "event",
    description:
      "Open-air stalls beneath sandstone arches. Gourmet street food, artisan jewelers, local distillers, and live buskers.",
    venue: "Playfair Street & Jack Mundey Place",
    area: "The Rocks, Sydney",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    open_hour: 17,
    close_hour: 22,
    duration: "2 hours",
    price_label: "Free Entry",
    price_amount: 0,
    badge: "Community Event",
    insiderTip: "Grab smoky yakitori skewers or artisan gelato and find a quiet perch by George Street.",
  },
  {
    id: "mca-contemporary-exhibition",
    title: "MCA Contemporary Light & Form",
    category: "Arts & Culture",
    kind: "attraction",
    description:
      "Cutting-edge contemporary Australian and international exhibits with sweeping floor-to-ceiling harbour views from level 4.",
    venue: "Museum of Contemporary Art Australia",
    area: "Circular Quay, Sydney",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80",
    open_hour: 10,
    close_hour: 17,
    duration: "2 hours",
    price_label: "Free Admission",
    price_amount: 0,
    badge: "Free Entry",
    insiderTip:
      "Entry to general galleries is free. Visit the MCA Cafe sculpture terrace on level 4 for coffee and unobstructed Quay views.",
  },
  {
    id: "observatory-hill-sunset",
    title: "Observatory Hill Sunset & Picnic",
    category: "Outdoors & Walks",
    kind: "idea",
    description:
      "Sydney's finest natural vantage point overlooking the Harbour Bridge, Luna Park, and the western harbour ferries at dusk.",
    venue: "Observatory Hill Park",
    area: "Millers Point, Sydney",
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80",
    open_hour: 6,
    close_hour: 22,
    duration: "1 hour",
    price_label: "Free",
    badge: "Iconic Vista",
    insiderTip: "Bring a light picnic blanket. Walk up via Watson Road stairs from The Rocks in under 6 minutes.",
  },
  {
    id: "fortune-of-war-ale",
    title: "Historic Pint at Fortune of War",
    category: "Dining & Cafes",
    kind: "idea",
    description:
      "Sydney’s oldest continuously licensed pub (est. 1828). Historic timber bar, nautical memorabilia, and sunny courtyard.",
    venue: "Fortune of War",
    area: "The Rocks, Sydney",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    open_hour: 10,
    close_hour: 23,
    duration: "45 mins",
    price_label: "Drop in",
    badge: "Free Craft Taste",
    deal: {
      badge: "Free Craft Taster Paddle",
      detail: "Complimentary taster paddle of Sydney pale ales with any classic counter meal.",
      claimHint: "Show AirPal Pass",
    },
  },
  {
    id: "argyle-cut-walk",
    title: "Argyle Cut & Sandstone Heritage Trail",
    category: "Outdoors & Walks",
    kind: "idea",
    description:
      "Wander through the monumental hand-hewn sandstone chasm connecting Sydney Cove to Darling Harbour, carved by convicts in 1843.",
    venue: "Argyle Cut",
    area: "The Rocks, Sydney",
    image: "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=1200&q=80",
    open_hour: 0,
    close_hour: 24,
    duration: "30 mins",
    price_label: "Free Walk",
    badge: "Heritage Walk",
    insiderTip: "Look up at the chisel marks on the vertical sandstone walls under the bridge overpass.",
  },
  {
    id: "harbour-yoga-dawn",
    title: "Dawn Mindfulness & Harbour Stretch",
    category: "Wellness",
    kind: "idea",
    description:
      "Start the day with a calming stretch and harbour breeze by Dawes Point Park directly beneath the towering Sydney Harbour Bridge.",
    venue: "Dawes Point Park",
    area: "The Rocks, Sydney",
    image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80",
    open_hour: 6,
    close_hour: 9,
    duration: "45 mins",
    price_label: "Self-guided · Free",
    badge: "Morning Wellness",
    insiderTip: "Best experienced right at sunrise (around 6:15 AM) when the water is glass-calm.",
  },
  {
    id: "fine-food-store-brunch",
    title: "Artisan Brunch & Courtyard Espresso",
    category: "Dining & Cafes",
    kind: "idea",
    description:
      "Tucked inside Kendall Lane, The Fine Food Store roasts exceptional single-origin espresso paired with sourdough treats.",
    venue: "The Fine Food Store",
    area: "The Rocks, Sydney",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    open_hour: 7,
    close_hour: 16,
    duration: "1 hour",
    price_label: "$$",
    badge: "Local Favourite",
    insiderTip: "Order the truffled scrambled eggs on sourdough with an oat flat white in the courtyard.",
  },
  {
    id: "barangaroo-foreshore-stroll",
    title: "Barangaroo Reserve Coastal Walk",
    category: "Outdoors & Walks",
    kind: "idea",
    description:
      "A 6-hectare re-created native headland made from 10,000 sandstone blocks. Lush walking trails with quiet harbour lookouts.",
    venue: "Barangaroo Reserve",
    area: "Barangaroo, Sydney",
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80",
    open_hour: 6,
    close_hour: 21,
    duration: "1.5 hours",
    price_label: "Free",
    badge: "Scenic Trail",
    insiderTip: "Rent an e-bike or stroll from Walsh Bay piers right into the native grass headlands.",
  },
  {
    id: "lord-nelson-brewery-tour",
    title: "Craft Brew Tasting at Lord Nelson",
    category: "Dining & Cafes",
    kind: "deal",
    description:
      "Australia’s oldest microbrewery. Taste iconic natural English-style ales brewed on-site since 1986 in historic Millers Point.",
    venue: "Lord Nelson Brewery Hotel",
    area: "Millers Point, Sydney",
    image: "https://images.unsplash.com/photo-1584225065152-4a1454aa3d4e?auto=format&fit=crop&w=1200&q=80",
    open_hour: 11,
    close_hour: 23,
    duration: "1 hour",
    price_label: "Tasting Paddle $18",
    badge: "Craft Brewery",
    deal: {
      badge: "2-for-1 Brewery Tasting",
      detail: "Order a four-beer tasting paddle and receive a complimentary second flight for your companion.",
      claimHint: "Show AirPal Pass",
    },
  },
  {
    id: "opera-house-symphony-lawn",
    title: "Symphony on the Foreshore",
    category: "Events",
    kind: "event",
    description:
      "Open-air classical and acoustic concert on the harbour steps with the glowing city lights reflected across the water.",
    venue: "Sydney Opera House Forecourt",
    area: "Circular Quay, Sydney",
    image: "https://images.unsplash.com/photo-1523059623039-a9ed027e7fad?auto=format&fit=crop&w=1200&q=80",
    starts_at: new Date(Date.now() + 172800000).toISOString(),
    open_hour: 18,
    close_hour: 21,
    duration: "2.5 hours",
    price_label: "Free RSVP",
    price_amount: 0,
    badge: "Featured Event",
    insiderTip: "Arrive 30 minutes early to secure seats on the broad granite steps.",
  },
  {
    id: "pancakes-midnight-stack",
    title: "All-Day Buttermilk Stacks",
    category: "Local Perks",
    kind: "deal",
    description:
      "Legendary stack of golden buttermilk pancakes with warm maple syrup, fresh berries, or decadent chocolate fudge.",
    venue: "Pancakes On The Rocks",
    area: "The Rocks, Sydney",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1200&q=80",
    open_hour: 7,
    close_hour: 22,
    duration: "1 hour",
    price_label: "$$",
    badge: "Sweet Perk",
    deal: {
      badge: "Free Hot Fudge Topping",
      detail: "Complimentary premium chocolate fudge or berry coulis upgrade with any pancake stack.",
      claimHint: "Show AirPal Pass",
    },
  },
];
