export const config = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbw8LE9DEtwK7kzmxYZjSo4XB3Ijy2X9ASnHwbip4Qs_-RCJ7CRJvzQExZWPLI6NjNqo/exec',

  fienta: {
    eventUrl: 'https://fienta.com/et/undertail',
    embedEnabled: false,
  },

  game: {
    name: 'Undertail',
    date: '24.10.2026',
 
    location: 'Kadila raketibaas',

    mapUrl: 'https://maps.app.goo.gl/6uLXVncmYRrDBbps5',

    times: {
      arrival: '8.00',
      registration: '8.00–10.30',
      briefing: '11.00',
      game: '12.00–18.00',
    },

    ticketWaves: [
      {
        key: 'earlyBird',
        price: '25 €',
        dates: '14.09–04.10',
      },
      {
        key: 'lateBird',
        price: '35 €',
        dates: '05.10–23.10',
      },
      {
        key: 'onSite',
        price: '50 €',
        dates: '',
      },
    ],

    contactEmail: 'undertail.airsoft.game@gmail.com',
  },
};
