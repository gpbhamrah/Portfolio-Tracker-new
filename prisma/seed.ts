import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial system master data & demo user...');

  // 1. Create Default Admin & Demo User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Demo@1234', salt);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@investingjournal.com' },
    update: {},
    create: {
      email: 'demo@investingjournal.com',
      passwordHash,
      name: 'Demo Investor',
      role: 'ADMIN',
      emailVerified: true,
      settings: {
        create: {
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          theme: 'system',
          emailNotifications: true,
        },
      },
    },
  });

  console.log(`Demo user created/updated: ${demoUser.email} (ID: ${demoUser.id})`);

  // 2. Seed Default Portfolios
  const mainPortfolio = await prisma.portfolio.upsert({
    where: { id: 'portfolio-demo-main' },
    update: {},
    create: {
      id: 'portfolio-demo-main',
      userId: demoUser.id,
      name: 'Core Growth Portfolio',
      description: 'Long-term Indian equity wealth compounders with 3-5 year horizon',
      isDefault: true,
    },
  });

  const swingPortfolio = await prisma.portfolio.upsert({
    where: { id: 'portfolio-demo-swing' },
    update: {},
    create: {
      id: 'portfolio-demo-swing',
      userId: demoUser.id,
      name: 'Momentum / Swing',
      description: 'Stage 2 breakout swings and short-term trend setups',
      isDefault: false,
    },
  });

  // 3. Seed Central Instrument Master
  const defaultInstruments = [
    {
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries Ltd.',
      companyName: 'Reliance Industries Ltd.',
      sector: 'Energy',
      industry: 'Oil & Gas Refining & Marketing',
      lastPrice: 2985.4,
      previousClose: 2950.0,
      ema20: 2940.5,
      ema50: 2890.0,
      ema200: 2750.0,
      high52: 3024.9,
      low52: 2220.3,
    },
    {
      symbol: 'TCS.NS',
      name: 'Tata Consultancy Services',
      companyName: 'Tata Consultancy Services Ltd.',
      sector: 'IT',
      industry: 'IT Consulting & Software',
      lastPrice: 4120.5,
      previousClose: 4095.0,
      ema20: 4080.0,
      ema50: 3990.0,
      ema200: 3820.0,
      high52: 4254.75,
      low52: 3313.0,
    },
    {
      symbol: 'HDFCBANK.NS',
      name: 'HDFC Bank Ltd.',
      companyName: 'HDFC Bank Ltd.',
      sector: 'Banking',
      industry: 'Private Banks',
      lastPrice: 1645.2,
      previousClose: 1630.0,
      ema20: 1620.0,
      ema50: 1580.0,
      ema200: 1540.0,
      high52: 1794.0,
      low52: 1363.55,
    },
    {
      symbol: 'INFY.NS',
      name: 'Infosys Ltd.',
      companyName: 'Infosys Ltd.',
      sector: 'IT',
      industry: 'IT Consulting & Software',
      lastPrice: 1845.0,
      previousClose: 1820.0,
      ema20: 1810.0,
      ema50: 1760.0,
      ema200: 1590.0,
      high52: 1950.0,
      low52: 1358.35,
    },
    {
      symbol: 'TATAMOTORS.NS',
      name: 'Tata Motors Ltd.',
      companyName: 'Tata Motors Ltd.',
      sector: 'Auto',
      industry: 'Automobiles & EV',
      lastPrice: 995.6,
      previousClose: 980.0,
      ema20: 975.0,
      ema50: 940.0,
      ema200: 820.0,
      high52: 1179.0,
      low52: 593.5,
    },
    {
      symbol: 'ITC.NS',
      name: 'ITC Ltd.',
      companyName: 'ITC Ltd.',
      sector: 'FMCG',
      industry: 'Diversified FMCG & Hotels',
      lastPrice: 485.3,
      previousClose: 480.0,
      ema20: 480.0,
      ema50: 465.0,
      ema200: 440.0,
      high52: 520.0,
      low52: 399.3,
    },
    {
      symbol: 'LICI.NS',
      name: 'Life Insurance Corp of India',
      companyName: 'Life Insurance Corporation of India',
      sector: 'Financial Services',
      industry: 'Life Insurance',
      lastPrice: 1040.0,
      previousClose: 1025.0,
      ema20: 1020.0,
      ema50: 985.0,
      ema200: 890.0,
      high52: 1222.0,
      low52: 597.0,
    },
    {
      symbol: 'BHARTIARTL.NS',
      name: 'Bharti Airtel Ltd.',
      companyName: 'Bharti Airtel Ltd.',
      sector: 'Telecom',
      industry: 'Telecom Services',
      lastPrice: 1590.0,
      previousClose: 1560.0,
      ema20: 1550.0,
      ema50: 1480.0,
      ema200: 1280.0,
      high52: 1650.0,
      low52: 855.0,
    },
  ];

  const instrumentMap = new Map<string, string>();

  for (const inst of defaultInstruments) {
    const record = await prisma.instrument.upsert({
      where: { symbol: inst.symbol },
      update: inst,
      create: {
        ...inst,
        exchange: 'NSE',
        instrumentType: 'STOCK',
      },
    });
    instrumentMap.set(inst.symbol, record.id);
  }

  // 4. Seed Transactions for Demo User
  const relId = instrumentMap.get('RELIANCE.NS');
  const tcsId = instrumentMap.get('TCS.NS');
  const hdfcId = instrumentMap.get('HDFCBANK.NS');
  const infyId = instrumentMap.get('INFY.NS');

  if (relId) {
    await prisma.transaction.createMany({
      data: [
        {
          userId: demoUser.id,
          portfolioId: mainPortfolio.id,
          instrumentId: relId,
          transactionType: 'BUY',
          quantity: 25,
          price: 2450.0,
          transactionDate: new Date('2023-09-15'),
          notes: 'Accumulated near 200 EMA support',
        },
        {
          userId: demoUser.id,
          portfolioId: mainPortfolio.id,
          instrumentId: relId,
          transactionType: 'BUY',
          quantity: 15,
          price: 2600.0,
          transactionDate: new Date('2024-01-20'),
          notes: 'Added on Q3 earnings breakout',
        },
      ],
      skipDuplicates: true,
    });
  }

  if (tcsId) {
    await prisma.transaction.create({
      data: {
        userId: demoUser.id,
        portfolioId: mainPortfolio.id,
        instrumentId: tcsId,
        transactionType: 'BUY',
        quantity: 20,
        price: 3550.0,
        transactionDate: new Date('2023-11-10'),
        notes: 'Generative AI & BFSI order book pipeline thesis',
      },
    });
  }

  if (hdfcId) {
    await prisma.transaction.create({
      data: {
        userId: demoUser.id,
        portfolioId: mainPortfolio.id,
        instrumentId: hdfcId,
        transactionType: 'BUY',
        quantity: 50,
        price: 1520.0,
        transactionDate: new Date('2024-02-14'),
        notes: 'Post-merger NIM expansion setup',
      },
    });
  }

  // 5. Seed Watchlist
  const defaultWatchlist = await prisma.watchlist.upsert({
    where: { id: 'watchlist-demo-default' },
    update: {},
    create: {
      id: 'watchlist-demo-default',
      userId: demoUser.id,
      name: 'High Conviction Ideas',
      description: 'Breakout watches & dip-buying targets',
    },
  });

  if (infyId) {
    await prisma.watchlistItem.create({
      data: {
        watchlistId: defaultWatchlist.id,
        instrumentId: infyId,
        targetEntryPrice: 1750.0,
        targetSellPrice: 2100.0,
        stopLoss: 1680.0,
        notes: 'Waiting for pullback to 50 EMA on daily chart',
      },
    });
  }

  // 6. Seed Sample Alerts
  if (relId) {
    await prisma.alert.create({
      data: {
        userId: demoUser.id,
        portfolioId: mainPortfolio.id,
        instrumentId: relId,
        conditionType: 'PRICE_ABOVE',
        conditionValue: 3000.0,
        notes: 'Alert when Reliance breaches psychological 3000 barrier',
      },
    });
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
