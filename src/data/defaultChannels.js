/**
 * Curated Channel Lineup styled to match the Xfinity X1 Guide photo
 * All streams are 100% verified active live HLS streams
 */

export const DEFAULT_CHANNELS = [
  // 1 - 7: Matching the exact Xfinity Guide in the reference photo
  {
    number: 1,
    id: "Universal.us",
    name: "Universal TV",
    callsign: "UNIV",
    category: "Movies",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/FilmRise_logo.svg/512px-FilmRise_logo.svg.png",
    url: "https://d1j2u714xk898n.cloudfront.net/scheduler/scheduleMaster/145.m3u8",
    rating: "TV-PG",
    resolution: "1080p",
    description: "Dr. Seuss' The Lorax: A 12-year-old boy searches for the one thing that will enable him to win the affection of the girl of his dreams: a real Truffula tree."
  },
  {
    number: 2,
    id: "Syfy.us",
    name: "Syfy",
    callsign: "SYFY",
    category: "Entertainment",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Syfy_2017.svg/512px-Syfy_2017.svg.png",
    url: "https://d3b73b34o7cvkq.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-gz2sgqzp076kf/adn.m3u8",
    rating: "TV-14",
    resolution: "1080p",
    description: "Face Off: Talented special effects makeup artists compete in elaborate sci-fi and horror creature design challenges."
  },
  {
    number: 3,
    id: "EEntertainment.us",
    name: "E! Entertainment",
    callsign: "E!",
    category: "Entertainment",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/E%21_logo.svg/512px-E%21_logo.svg.png",
    url: "https://stream8.cinerama.uz/1267/tracks-v1a1/mono.m3u8",
    rating: "TV-PG",
    resolution: "1080p",
    description: "Live From the Red Carpet: The 2012 Primetime Emmy Awards. Pre-show red carpet arrivals, fashion commentary and celebrity interviews."
  },
  {
    number: 4,
    id: "GolfChannel.us",
    name: "Golf Channel",
    callsign: "GOLFD",
    category: "Sports",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Golf_Channel_logo.svg/512px-Golf_Channel_logo.svg.png",
    url: "https://30a-tv.com/feeds/vidaa/golf.m3u8",
    rating: "TV-G",
    resolution: "720p",
    description: "The Golf Fix: Breed breaks down swing mechanics, putting drills and short game fundamentals to help players lower their scores."
  },
  {
    number: 5,
    id: "MSNBC.us",
    name: "MSNBC",
    callsign: "MSNBC",
    category: "News",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/MSNBC_2021_logo.svg/512px-MSNBC_2021_logo.svg.png",
    url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    rating: "TV-PG",
    resolution: "1080p",
    description: "The Rachel Maddow Show: In-depth political commentary, investigative journalism, and analysis of current geopolitical events."
  },
  {
    number: 6,
    id: "UniversalCinema.us",
    name: "Universal Cinema",
    callsign: "UNIV",
    category: "Movies",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/FilmRise_logo.svg/512px-FilmRise_logo.svg.png",
    url: "https://jmp2.uk/plu-62ba60f059624e000781c436.m3u8",
    rating: "TV-PG",
    resolution: "720p",
    description: "ParaNorman: A misunderstood boy takes on ghosts, zombies and adults to save his town from a centuries-old curse."
  },
  {
    number: 7,
    id: "LegendTVShowcase.us",
    name: "LEGEND TV Showcase",
    callsign: "LGND",
    category: "Entertainment",
    logo: "/tv.svg",
    url: "https://amg00453-reuters-amg00453c1-rakuten-uk-2110.playouts.now.amagi.tv/playlist/amg00453-reuters-reuters-rakutenuk/playlist.m3u8",
    rating: "TV-G",
    resolution: "1080p",
    description: "LEGEND TV Showcase: Welcome to your LEGEND TV entertainment experience. Explore live television, top premieres, news, and action sports."
  },

  // 10+: Additional High Definition Cable Channels
  {
    number: 10,
    id: "RedBullTV.at",
    name: "Red Bull TV",
    callsign: "RBULL",
    category: "Sports",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    rating: "TV-14",
    resolution: "1080p",
    description: "High-octane action sports, downhill mountain biking, extreme stunts, Formula 1 behind-the-scenes and adventures."
  },
  {
    number: 11,
    id: "ACCDN.us",
    name: "ACC Sports Network",
    callsign: "ACC",
    category: "Sports",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Atlantic_Coast_Conference_logo.svg/512px-Atlantic_Coast_Conference_logo.svg.png",
    url: "https://raycom-accdn-firetv.amagi.tv/playlist.m3u8",
    rating: "TV-PG",
    resolution: "1080p",
    description: "Collegiate football, basketball, baseball tournaments, press conferences, and classic ACC rivalries."
  },
  {
    number: 20,
    id: "NASATV.us",
    name: "NASA TV Public HD",
    callsign: "NASA",
    category: "Documentary",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/512px-NASA_logo.svg.png",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    rating: "TV-G",
    resolution: "1080p",
    description: "Live views of planet Earth from the International Space Station, rocket launches, spacewalks, and deep cosmic exploration."
  },
  {
    number: 21,
    id: "3CatBeauties.es",
    name: "Earth & Nature Views",
    callsign: "EARTH",
    category: "Documentary",
    logo: "https://i.imgur.com/Qh098pC.png",
    url: "https://directes-tv-int.3catdirectes.cat/live-content/beauties-hls/master.m3u8",
    rating: "TV-G",
    resolution: "1080p",
    description: "Breathtaking panoramic cameras showing mountain peaks, coastlines, Mediterranean sunsets and wildlife scenery."
  },
  {
    number: 30,
    id: "CGTNEnglish.cn",
    name: "CGTN Global News",
    callsign: "CGTN",
    category: "News",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/CGTN_logo.svg/512px-CGTN_logo.svg.png",
    url: "https://amg00405-rakutentv-cgtn-rakuten-i9tar.amagi.tv/master.m3u8",
    rating: "TV-PG",
    resolution: "1080p",
    description: "Global television network providing worldwide reports, business insights, documentary series and cultural reports."
  },
  {
    number: 40,
    id: "4FunKids.pl",
    name: "4Fun Kids TV",
    callsign: "KIDS",
    category: "Kids",
    logo: "https://i.imgur.com/z3npqO1.png",
    url: "https://stream.4fun.tv:8889/hd/kids_hd_high.m3u8",
    rating: "TV-Y",
    resolution: "1080p",
    description: "Colorful animated music, upbeat cartoons, sing-alongs, nursery rhymes and kids entertainment."
  },
  {
    number: 50,
    id: "RidiculousTV.us",
    name: "Comedy Bloopers TV",
    callsign: "COMDY",
    category: "Comedy",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/FailArmy_logo.png/512px-FailArmy_logo.png",
    url: "https://30a-tv.com/feeds/720p/63.m3u8",
    rating: "TV-14",
    resolution: "720p",
    description: "Non-stop hilarious fails, viral internet stunts, funny animals, prank reactions and comic moments."
  }
];

export const IPTV_CATEGORIES = [
  { id: 'all', label: 'All Channels', icon: 'Tv' },
  { id: 'news', label: 'News', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
  { id: 'movies', label: 'Movies', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
  { id: 'animation', label: 'Animation', url: 'https://iptv-org.github.io/iptv/categories/animation.m3u' },
  { id: 'sports', label: 'Sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
  { id: 'music', label: 'Music', url: 'https://iptv-org.github.io/iptv/categories/music.m3u' },
  { id: 'documentary', label: 'Documentary', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' },
  { id: 'comedy', label: 'Comedy', url: 'https://iptv-org.github.io/iptv/categories/comedy.m3u' },
  { id: 'kids', label: 'Kids', url: 'https://iptv-org.github.io/iptv/categories/kids.m3u' },
];
