export const schema = `
  enum Direction {
    UP
    RIGHT
    DOWN
    LEFT
  }

  enum Symbol {
    BTCRUB
    RUBBTC
  }

  type CarHouse {
    id: Int
    level: Int
    title: String
    description: String
    user_level: Int
    price_rub: Int
    image_path: String
    status: String
    message: String
  }

  type Clan {
    id: Int
    title: String
    rating: Int
    leader_id: Int
    leader: String
    members_qty: Int
    membership_requests: [Int]
    is_member_or_in_requests: Boolean
  }

  type DM {
    user_id: Int
    username: String
    sent_at: Float
    user_id_from: Int
    username_from: String
    message: String
  }

  type FirstLoadData {
    lastMessage: Message
    profile: Profile
  }

  type Game {
    sessionId: ID
    field: [[Int]]
    scores: Int
    status: String
    win: Boolean
    money_rub: Int
  }

  type Gift {
    id: Int
    title: String
    amount: Float
  }

  type Gifts {
    applied: Boolean
    gifts: [Gift]
  }

  type GirlItem {
    id: Int
    level: Int
    title: String
    description: String
    image_path: String
    user_level: Int
    price_rub: Int
    daily_money: Int
    rating: Int
    status: String
    message: String
  }

  type GirlItems {
    type: String
    items: [GirlItem]
  }

  type Hardware {
    id: Int
    type: String
    level: Int
    title: String
    description: String
    image_path: String
    user_level: Int
    next_title: String
    next_user_level: Int
    next_price_rub: Int
    status: String
    message: String
  }

  type Health {
    id: Int
    title: String
    description: String
    type: String
    image_path: String
    user_level: Int
    price_rub: Int
    health: Int
    alcohol: Int
    mood: Int
    status: String
    message: String
  }

  type Job {
    id: Int
    title: String
    type: String
    user_level: Int
    price_rub: Int
    price_btc: Float
    required_software: [Int]
    work_hack: Int
    xp: Int
    moves: Int
    health: Int
    alcohol: Int
    mood: Int
    status: String
    message: String
  }

  type LongtermJob {
    id: Int
    title: String
    description: String
    image_path: String
    user_level: Int
    price_rub: Int
    price_btc: Float
    work_hack: Int
    xp: Int
    time: Int
    moves: Int
    health: Int
    alcohol: Int
    mood: Int
    status: String
    message: String
  }

  type Message {
    id: Int
    sent_at: Float
    user_id: Int
    username: String
    clan_id: Int
    clan: String
    message: String
  }

  type News {
    id: Int
    date: Float
    title: String
    body: String
    read: Boolean
  }

  type Price {
    price: String
  }

  type Profile {
    alco_balance: Int
    alco_liters_use: Int
    car: Int
    clan_id: Int
    clan: String
    experience_points: Int
    friends: [Int]
    friendship_requests: [Int]
    gift_availability: Float
    girl_appearance: Int
    girl_clothes: Int
    girl_jewelry: Int
    girl_leisure: Int
    girl_level: Int
    girl_sport: Int
    hardware_level: Int
    health_points: Int
    house: Int
    installed_software: [Int]
    is_friend_or_requested_friendship: Boolean
    job_end: Float
    lang: String
    level: Int
    money_btc: Float
    money_rub: Int
    mood: Int
    moves: Int
    next_xp: Int
    pc_cooling: Int
    pc_cpu: Int
    pc_drive: Int
    pc_gpu: Int
    pc_motherboard: Int
    pc_network: Int
    pc_power: Int
    pc_ram: Int
    rating: Int
    read_news: [Int]
    user_id: Int
    username: String
    work_hack_balance: Int
  }

  type Result {
    result: String
  }

  type Software {
    id: Int
    title: String
    short_description: String
    description: String
    image_path: String
    user_level: Int
    price_rub: Int
    hardware_level: Int
    purchased: Boolean
    status: String
    message: String
  }

  type Stats {
    level: [Profile]
    alco: [Profile]
  }

  type Token {
    token: String
  }

  type User {
    id: Int
    username: String
  }

  input ProfileToCheat {
    alco_balance: Int
    alco_liters_use: Int
    car: Int
    clan_id: Int
    clan: String
    daily_bonus_time: String
    experience_points: Int
    friends: [Int]
    friendship_requests: [Int]
    gift_availability: Float
    girl_appearance: Int
    girl_clothes: Int
    girl_jewelry: Int
    girl_leisure: Int
    girl_level: Int
    girl_sport: Int
    hardware_level: Int
    health_points: Int
    house: Int
    installed_software: [Int]
    is_friend_or_requested_friendship: Boolean
    job_end: Float
    level: Int
    money_btc: Float
    money_rub: Int
    mood: Int
    moves: Int
    next_xp: Int
    pc_cooling: Int
    pc_cpu: Int
    pc_drive: Int
    pc_gpu: Int
    pc_motherboard: Int
    pc_network: Int
    pc_power: Int
    pc_ram: Int
    rating: Int
    read_news: [Int]
    work_hack_balance: Int
  }

  type Query {
    authStatus: Result
    game2048Status: Result
    getCars: [CarHouse]
    getChatLastMessage: Message
    getClanMembers: [Profile]
    getClanMembershipRequests: [Profile]
    getClanMessages: [Message]
    getClans: [Clan]
    getDM(userIdWith: Int): [DM]
    getFirstLoadData: FirstLoadData
    getFriends: [Profile]
    getFriendshipRequests: [Profile]
    getGame(sessionId: ID!): Game
    getGifts: Gifts
    getGirlItems: [GirlItems]
    getHardware: [Hardware]
    getHealth(productType: String!): [Health]
    getHousing: [CarHouse]
    getJobs: [Job]
    getLongtermJobs: [LongtermJob]
    getMessages: [Message]
    getMyClan: Clan
    getNews: [News]
    getProfile: Profile
    getQuote(symbol: Symbol!): Price
    getSoftware: [Software]
    getStats: Stats
    getUser: User
    getUsers: [Profile]
    hackerStatus: Result
    listenPG: Boolean
    newGame: Game
    searchClans(query: String!): [Clan]
    searchUsers(query: String!): [Profile]
    signIn(username: String!, password: String!): Token
  }

  type Mutation {
    addClanMessage(message: String!): Message
    addMessage(message: String!): Message
    applyGift(id: Int!): Boolean
    approveClanMembershipRequest(id: Int!, approve: Boolean!): Result
    approveFriendshipRequest(id: Int!, approve: Boolean!): Boolean
    buyCar(id: Int!): Boolean
    buyGirlItem(id: Int!): Boolean
    buyHouse(id: Int!): Boolean
    cheatProfile(fields: ProfileToCheat!): Boolean
    createClan(title: String!): Clan
    doJob(id: Int!): Boolean
    doLongtermJob(id: Int!): Boolean
    exchange(symbol: Symbol!, amount: Float!): Boolean
    exitFromClan: Boolean
    markNewsAsRead(id: Int!): Boolean
    move(sessionId: ID!, direction: Direction!): Game
    playGame: Boolean
    quitGame(sessionId: ID!): Game
    removeFromFriends(friendId: Int!): Boolean
    requestClanMembership(id: Int!): Boolean
    requestFriendship(id: Int!): Boolean
    sendDM(id: Int!, message: String!): [DM]
    signUp(username: String!, password: String!): Token
    updateHardware(typeHardware: String!): Boolean
    updateHealth(id: Int!): Boolean
    updateSoftware(id: Int!): Boolean
  }

  type Subscription {
    cars: [CarHouse]
    clanMessageAdded: [Message]
    dmAdded: [DM]
    girls: [GirlItems]
    hardware: [Hardware]
    health: [Health]
    housing: [CarHouse]
    job: [Job]
    longtermJob: [LongtermJob]
    messageAdded: [Message]
    news: [News]
    profile: Profile
    software: [Software]
  }
`