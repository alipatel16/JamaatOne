# JamaatOne

Expo React Native frontend for mobile and web.

## Design

- Light, low-glare theme
- Responsive layouts for web and mobile
- Mozilla Text on web through Google Fonts
- System fallback on native until the font is bundled by the app team
- Shared design tokens for cards, inputs, buttons, spacing, and navigation

Mozilla Text is intentionally referenced remotely rather than included in this
archive.

## API modes

Mock mode:

```env
EXPO_PUBLIC_USE_MOCK_API=true
```

Backend mode:

```env
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_API_BASE_URL=http://YOUR_API_HOST:5058/api
```

## Accounts updates

- `Others` payment category
- Madrasa fee beneficiary selection from the payer's linked family
- Four fixed Axis Bank accounts
- Payment recorder name, internal user ID, and ITS ID
- Redesigned printable and downloadable PDF receipt
- Dedicated `src/api/accountsApi.js` service
- Existing mock support retained

## Run

```bash
npm install
npx expo start --clear
```

## Receipt-only web printing and PDF

Web receipt printing now renders the standalone receipt HTML inside an isolated
iframe. The application header, hamburger menu, screen controls, and bottom
navigation are never part of the print document.

Web PDF download uses a dedicated A4 PDF generator based only on receipt data.
Native Android and iOS continue to use Expo Print and Expo Sharing.
